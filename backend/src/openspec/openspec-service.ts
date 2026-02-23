import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';
import yaml from 'js-yaml';

export interface OpenSpecOverview {
  changesCount: number;
  specsCount: number;
  archivedCount: number;
  config: Record<string, unknown> | null;
}

export interface ChangeSummary {
  name: string;
  status: string;
  proposal: string;
  taskProgress: { total: number; completed: number };
}

export interface DeltaSpecSummary {
  name: string;
  added: number;
  modified: number;
  removed: number;
}

export interface ChangeDetail {
  name: string;
  openspec: Record<string, unknown> | null;
  proposal: string | null;
  design: string | null;
  tasks: string | null;
  specs: DeltaSpecSummary[];
}

export interface SpecSummary {
  name: string;
  content: string;
  summary: string;
  size: number;
}

export interface ArchivedSummary {
  name: string;
  archivedDate: string;
}

/** Read a file and return its content, or null if missing. */
function readFileOrNull(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/** Parse YAML content safely. Returns null on failure. */
function parseYaml(content: string | null): Record<string, unknown> | null {
  if (!content) return null;
  try {
    return yaml.load(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Count task checkbox progress from markdown content. */
function countTaskProgress(tasksContent: string | null): { total: number; completed: number } {
  if (!tasksContent) return { total: 0, completed: 0 };
  const lines = tasksContent.split('\n');
  let total = 0;
  let completed = 0;
  for (const line of lines) {
    if (/- \[[ x]\]/.test(line)) {
      total++;
      if (/- \[x\]/.test(line)) {
        completed++;
      }
    }
  }
  return { total, completed };
}

/** Count requirements in a delta spec markdown by section (ADDED/MODIFIED/REMOVED). */
function countDeltaSpecRequirements(content: string | null): { added: number; modified: number; removed: number } {
  if (!content) return { added: 0, modified: 0, removed: 0 };
  let currentSection: 'added' | 'modified' | 'removed' | null = null;
  const counts = { added: 0, modified: 0, removed: 0 };
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (/^##\s+ADDED\b/i.test(trimmed)) { currentSection = 'added'; continue; }
    if (/^##\s+MODIFIED\b/i.test(trimmed)) { currentSection = 'modified'; continue; }
    if (/^##\s+REMOVED\b/i.test(trimmed)) { currentSection = 'removed'; continue; }
    if (/^##\s+/.test(trimmed) && !/^###/.test(trimmed)) { currentSection = null; continue; }
    if (currentSection && /^###\s+Requirement:/i.test(trimmed)) {
      counts[currentSection]++;
    }
  }
  return counts;
}

/** List subdirectories in a directory. Returns empty array if directory missing. */
function listSubdirectories(dirPath: string): string[] {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

export class OpenSpecService {
  constructor(private basePath: string) {}

  /** Return overview stats: counts of changes, specs, archived, and parsed config. */
  getOverview(): OpenSpecOverview {
    const changesDir = path.join(this.basePath, 'changes');
    const specsDir = path.join(this.basePath, 'specs');
    const archiveDir = path.join(this.basePath, 'changes', 'archive');

    const changesDirs = listSubdirectories(changesDir).filter((n) => n !== 'archive');
    const specsDirs = listSubdirectories(specsDir);
    const archivedDirs = listSubdirectories(archiveDir);

    const configContent = readFileOrNull(path.join(this.basePath, 'config.yaml'));
    const config = parseYaml(configContent);

    return {
      changesCount: changesDirs.length,
      specsCount: specsDirs.length,
      archivedCount: archivedDirs.length,
      config,
    };
  }

  /** List all active changes with summary info. */
  listChanges(): ChangeSummary[] {
    const changesDir = path.join(this.basePath, 'changes');
    const dirs = listSubdirectories(changesDir).filter((n) => n !== 'archive');

    return dirs.map((name) => {
      const changeDir = path.join(changesDir, name);
      const openspecContent = readFileOrNull(path.join(changeDir, '.openspec.yaml'));
      const openspec = parseYaml(openspecContent);
      const proposal = readFileOrNull(path.join(changeDir, 'proposal.md'));
      const tasks = readFileOrNull(path.join(changeDir, 'tasks.md'));

      return {
        name,
        status: (openspec?.schema as string) ?? 'unknown',
        proposal: proposal ? proposal.slice(0, 200) : '',
        taskProgress: countTaskProgress(tasks),
      };
    });
  }

  /** Get full detail of a single change by name. Optionally read from archive. */
  getChange(name: string, fromArchive = false): ChangeDetail | null {
    const changeDir = fromArchive
      ? path.join(this.basePath, 'changes', 'archive', name)
      : path.join(this.basePath, 'changes', name);

    if (!fs.existsSync(changeDir)) return null;

    const openspecContent = readFileOrNull(path.join(changeDir, '.openspec.yaml'));
    const openspec = parseYaml(openspecContent);
    const proposal = readFileOrNull(path.join(changeDir, 'proposal.md'));
    const design = readFileOrNull(path.join(changeDir, 'design.md'));
    const tasks = readFileOrNull(path.join(changeDir, 'tasks.md'));

    // List delta specs with requirement counts
    const specsSubdir = path.join(changeDir, 'specs');
    const specNames = listSubdirectories(specsSubdir);
    const specs: DeltaSpecSummary[] = specNames.map((specName) => {
      const specContent = readFileOrNull(path.join(specsSubdir, specName, 'spec.md'));
      const counts = countDeltaSpecRequirements(specContent);
      return { name: specName, ...counts };
    });

    return { name, openspec, proposal, design, tasks, specs };
  }

  /** Toggle a task checkbox in tasks.md. taskLine is the text after `- [ ] `. */
  updateTask(changeName: string, taskLine: string, checked: boolean): boolean {
    const tasksPath = path.join(this.basePath, 'changes', changeName, 'tasks.md');
    const content = readFileOrNull(tasksPath);
    if (!content) return false;

    // Escape ALL regex special characters (not just dots)
    const escaped = taskLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const uncheckedPattern = new RegExp(`^(\\s*- )\\[ \\]( ${escaped})\\s*$`, 'm');
    const checkedPattern = new RegExp(`^(\\s*- )\\[x\\]( ${escaped})\\s*$`, 'm');

    let updated: string;
    if (checked) {
      // Toggle from [ ] to [x]
      if (!uncheckedPattern.test(content)) return false;
      updated = content.replace(uncheckedPattern, '$1[x]$2');
    } else {
      // Toggle from [x] to [ ]
      if (!checkedPattern.test(content)) return false;
      updated = content.replace(checkedPattern, '$1[ ]$2');
    }

    fs.writeFileSync(tasksPath, updated, 'utf-8');
    return true;
  }

  /** Move a change to the archive directory with date prefix. */
  archiveChange(name: string): boolean {
    const sourceDir = path.join(this.basePath, 'changes', name);
    if (!fs.existsSync(sourceDir)) return false;

    const archiveDir = path.join(this.basePath, 'changes', 'archive');
    fs.mkdirSync(archiveDir, { recursive: true });

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const destDir = path.join(archiveDir, `${today}-${name}`);

    fs.renameSync(sourceDir, destDir);
    return true;
  }

  /** Delete a change directory (rimraf). */
  deleteChange(name: string): boolean {
    const changeDir = path.join(this.basePath, 'changes', name);
    if (!fs.existsSync(changeDir)) return false;

    fs.rmSync(changeDir, { recursive: true, force: true });
    return true;
  }

  /** List all specs with name, summary, size, and first 200 chars of content. */
  listSpecs(): SpecSummary[] {
    const specsDir = path.join(this.basePath, 'specs');
    const dirs = listSubdirectories(specsDir);

    return dirs.map((name) => {
      const specPath = path.join(specsDir, name, 'spec.md');
      const specContent = readFileOrNull(specPath);

      // Extract summary: first non-empty, non-heading, non-frontmatter line
      let summary = '';
      if (specContent) {
        for (const line of specContent.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('#')) continue;
          if (trimmed.startsWith('---')) continue;
          summary = trimmed.slice(0, 150);
          break;
        }
      }

      // Get file size
      let size = 0;
      try {
        size = fs.statSync(specPath).size;
      } catch { /* file missing */ }

      return {
        name,
        content: specContent ? specContent.slice(0, 200) : '',
        summary,
        size,
      };
    });
  }

  /** Get full content of a delta spec file within a change. */
  getDeltaSpecFile(changeName: string, specName: string): string | null {
    const specPath = path.join(this.basePath, 'changes', changeName, 'specs', specName, 'spec.md');
    return readFileOrNull(specPath);
  }

  /** Get full content of a spec file. */
  getSpecFile(specName: string): string | null {
    const specPath = path.join(this.basePath, 'specs', specName, 'spec.md');
    return readFileOrNull(specPath);
  }

  /** List all archived changes with name and archived date. */
  listArchived(): ArchivedSummary[] {
    const archiveDir = path.join(this.basePath, 'changes', 'archive');
    const dirs = listSubdirectories(archiveDir);

    return dirs.map((name) => {
      // Extract date from name format: YYYY-MM-DD-<original-name>
      const dateMatch = name.match(/^(\d{4}-\d{2}-\d{2})-/);
      const archivedDate = dateMatch ? dateMatch[1] : '';
      return { name, archivedDate };
    });
  }

  /** Check if the openspec CLI is available on the system. */
  static isCliAvailable(): boolean {
    try {
      execSync('command -v openspec', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /** Delete the openspec folder in the given directory. */
  static deleteOpenspecFolder(cwd: string): { success: boolean; error?: string } {
    const openspecDir = path.join(cwd, 'openspec');
    if (!fs.existsSync(openspecDir)) {
      return { success: false, error: 'openspec folder does not exist' };
    }
    try {
      fs.rmSync(openspecDir, { recursive: true, force: true });
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete' };
    }
  }

  /** Initialize openspec in the given directory. */
  static initOpenspec(cwd: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const child = spawn('openspec', ['init'], { cwd, stdio: 'pipe' });
      let stderr = '';
      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: stderr.trim() || `Exit code ${code}` });
        }
      });
      child.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    });
  }
}
