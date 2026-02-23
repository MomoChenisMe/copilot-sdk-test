import fs from 'node:fs';
import path from 'node:path';
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

export interface ChangeDetail {
  name: string;
  openspec: Record<string, unknown> | null;
  proposal: string | null;
  design: string | null;
  tasks: string | null;
  specs: string[];
}

export interface SpecSummary {
  name: string;
  content: string;
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

    // List delta spec names if specs/ subdirectory exists
    const specsSubdir = path.join(changeDir, 'specs');
    const specs = listSubdirectories(specsSubdir);

    return { name, openspec, proposal, design, tasks, specs };
  }

  /** Toggle a task checkbox in tasks.md. taskLine is like "5.1". */
  updateTask(changeName: string, taskLine: string, checked: boolean): boolean {
    const tasksPath = path.join(this.basePath, 'changes', changeName, 'tasks.md');
    const content = readFileOrNull(tasksPath);
    if (!content) return false;

    // Escape dots in task line for regex
    const escaped = taskLine.replace(/\./g, '\\.');
    const uncheckedPattern = new RegExp(`^(\\s*- )\\[ \\]( ${escaped}\\b)`, 'm');
    const checkedPattern = new RegExp(`^(\\s*- )\\[x\\]( ${escaped}\\b)`, 'm');

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

  /** List all specs with name and first 200 chars of content. */
  listSpecs(): SpecSummary[] {
    const specsDir = path.join(this.basePath, 'specs');
    const dirs = listSubdirectories(specsDir);

    return dirs.map((name) => {
      const specContent = readFileOrNull(path.join(specsDir, name, 'spec.md'));
      return {
        name,
        content: specContent ? specContent.slice(0, 200) : '',
      };
    });
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
}
