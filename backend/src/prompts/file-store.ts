import fs from 'node:fs';
import path from 'node:path';

const UNSAFE_PATTERN = /[.]{2}|[/\\]|\0/;
const SAFE_CHARS = /[^a-zA-Z0-9_-]/g;

export function sanitizeName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Invalid name: empty');
  if (UNSAFE_PATTERN.test(trimmed)) throw new Error('Invalid name: unsafe characters');
  return trimmed.replace(SAFE_CHARS, '-');
}

export class PromptFileStore {
  constructor(private basePath: string) {}

  ensureDirectories(): void {
    fs.mkdirSync(this.basePath, { recursive: true });
    fs.mkdirSync(path.join(this.basePath, 'presets'), { recursive: true });
    fs.mkdirSync(path.join(this.basePath, 'memory'), { recursive: true });
    fs.mkdirSync(path.join(this.basePath, 'memory', 'projects'), { recursive: true });
    fs.mkdirSync(path.join(this.basePath, 'memory', 'solutions'), { recursive: true });

    // Create empty files if they don't exist
    for (const file of ['PROFILE.md', 'AGENT.md', 'memory/preferences.md']) {
      const filePath = path.join(this.basePath, file);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '');
      }
    }
  }

  readFile(relativePath: string): string {
    const filePath = path.join(this.basePath, relativePath);
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return '';
    }
  }

  writeFile(relativePath: string, content: string): void {
    const filePath = path.join(this.basePath, relativePath);
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  deleteFile(relativePath: string): void {
    const filePath = path.join(this.basePath, relativePath);
    try {
      fs.unlinkSync(filePath);
    } catch {
      // Ignore - file may not exist
    }
  }

  listFiles(subDir: string): string[] {
    const dirPath = path.join(this.basePath, subDir);
    try {
      return fs
        .readdirSync(dirPath)
        .filter((f) => f.endsWith('.md'))
        .map((f) => f.replace(/\.md$/, ''));
    } catch {
      return [];
    }
  }
}
