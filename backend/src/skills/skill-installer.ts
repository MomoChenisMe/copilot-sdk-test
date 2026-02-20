import AdmZip from 'adm-zip';
import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from './file-store.js';
import { sanitizeName } from '../prompts/file-store.js';

const MAX_ZIP_SIZE = 10 * 1024 * 1024; // 10MB

export interface InstallResult {
  name: string;
  description: string;
}

/**
 * Extract and install a skill from a ZIP buffer.
 * The ZIP must contain a SKILL.md with valid frontmatter.
 * Rejects path traversal attempts and oversized ZIPs.
 */
export async function extractAndInstallSkill(
  zipBuffer: Buffer,
  skillsDir: string,
): Promise<InstallResult> {
  // Size check
  if (zipBuffer.length > MAX_ZIP_SIZE) {
    throw new Error('ZIP file exceeds 10MB size limit');
  }

  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();

  // Security: reject entries with path traversal or absolute paths
  for (const entry of entries) {
    const entryName = entry.entryName;
    // Check the raw name for traversal patterns
    if (entryName.includes('..') || path.isAbsolute(entryName)) {
      throw new Error('ZIP contains unsafe path: ' + entryName);
    }
    // Also resolve against a base to catch normalized traversal
    const resolved = path.resolve('/safe-base', entryName);
    if (!resolved.startsWith('/safe-base/')) {
      throw new Error('ZIP contains unsafe path: ' + entryName);
    }
  }

  // Find SKILL.md — may be at root or inside a single top-level directory
  let skillMdEntry = entries.find(
    (e) => !e.isDirectory && (e.entryName === 'SKILL.md' || e.entryName.match(/^[^/]+\/SKILL\.md$/)),
  );

  if (!skillMdEntry) {
    throw new Error('ZIP does not contain a SKILL.md file');
  }

  // Parse frontmatter from SKILL.md
  const skillMdContent = skillMdEntry.getData().toString('utf-8');
  const { description, body } = parseFrontmatter(skillMdContent);

  // Extract skill name from frontmatter or directory name
  const fmNameMatch = skillMdContent.match(/^name:\s*(.+)$/m);
  let skillName = fmNameMatch ? fmNameMatch[1].trim().replace(/^["']|["']$/g, '') : '';

  if (!skillName) {
    // Fall back to directory name in ZIP
    const parts = skillMdEntry.entryName.split('/');
    skillName = parts.length > 1 ? parts[0] : 'unnamed-skill';
  }

  // Sanitize the name
  const safeName = sanitizeName(skillName);

  // Install to skillsDir/{safeName}/
  const installDir = path.join(skillsDir, safeName);
  fs.mkdirSync(installDir, { recursive: true });

  // Determine the prefix to strip (if SKILL.md is inside a subdirectory)
  const prefix = skillMdEntry.entryName.includes('/')
    ? skillMdEntry.entryName.split('/')[0] + '/'
    : '';

  // Extract all files
  for (const entry of entries) {
    if (entry.isDirectory) continue;

    let relativePath = entry.entryName;
    if (prefix && relativePath.startsWith(prefix)) {
      relativePath = relativePath.slice(prefix.length);
    }

    if (!relativePath) continue;

    const targetPath = path.join(installDir, relativePath);
    const targetDir = path.dirname(targetPath);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(targetPath, entry.getData());
  }

  return { name: safeName, description: description || body.slice(0, 100) };
}

/**
 * Install a skill from a SKILL.md content string (for URL-based installs).
 */
export async function installSkillFromContent(
  content: string,
  skillsDir: string,
): Promise<InstallResult> {
  const { description, body } = parseFrontmatter(content);

  const fmNameMatch = content.match(/^name:\s*(.+)$/m);
  let skillName = fmNameMatch ? fmNameMatch[1].trim().replace(/^["']|["']$/g, '') : '';

  if (!skillName) {
    skillName = 'url-skill';
  }

  const safeName = sanitizeName(skillName);
  const installDir = path.join(skillsDir, safeName);
  fs.mkdirSync(installDir, { recursive: true });
  fs.writeFileSync(path.join(installDir, 'SKILL.md'), content, 'utf-8');

  return { name: safeName, description: description || body.slice(0, 100) };
}

/**
 * Convert a GitHub web URL to a raw content URL.
 * e.g. github.com/user/repo/tree/main/path → raw.githubusercontent.com/user/repo/main/path/SKILL.md
 */
export function convertGitHubUrl(url: string): string {
  // Handle blob URLs (pointing to a specific file)
  const blobMatch = url.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/,
  );
  if (blobMatch) {
    const [, user, repo, branch, filePath] = blobMatch;
    return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filePath}`;
  }

  // Handle tree URLs (pointing to a directory)
  const treeMatch = url.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+?)(?:\/)?$/,
  );
  if (treeMatch) {
    const [, user, repo, branch, dirPath] = treeMatch;
    return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${dirPath}/SKILL.md`;
  }

  return url;
}
