import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_AUTOPILOT_PROMPT, DEFAULT_PLAN_PROMPT } from './defaults.js';

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

    // Create SYSTEM_PROMPT.md with default content if it doesn't exist
    const systemPromptPath = path.join(this.basePath, 'SYSTEM_PROMPT.md');
    if (!fs.existsSync(systemPromptPath)) {
      fs.writeFileSync(systemPromptPath, DEFAULT_SYSTEM_PROMPT);
    }

    // Migrate ACT_PROMPT.md → AUTOPILOT_PROMPT.md if only ACT exists
    const actPromptPath = path.join(this.basePath, 'ACT_PROMPT.md');
    const autopilotPromptPath = path.join(this.basePath, 'AUTOPILOT_PROMPT.md');
    if (fs.existsSync(actPromptPath) && !fs.existsSync(autopilotPromptPath)) {
      fs.renameSync(actPromptPath, autopilotPromptPath);
    }

    // Create AUTOPILOT_PROMPT.md with default content if it doesn't exist
    if (!fs.existsSync(autopilotPromptPath)) {
      fs.writeFileSync(autopilotPromptPath, DEFAULT_AUTOPILOT_PROMPT);
    }

    // Content migration: replace "Act Mode" → "Autopilot Mode" in existing prompt files
    for (const fileName of ['SYSTEM_PROMPT.md', 'AUTOPILOT_PROMPT.md']) {
      const filePath = path.join(this.basePath, fileName);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (/act mode/i.test(content)) {
          const migrated = content
            .replace(/Act Mode/g, 'Autopilot Mode')
            .replace(/act mode/g, 'autopilot mode');
          fs.writeFileSync(filePath, migrated, 'utf-8');
        }
      }
    }

    // Create PLAN_PROMPT.md with default content if it doesn't exist
    const planPromptPath = path.join(this.basePath, 'PLAN_PROMPT.md');
    if (!fs.existsSync(planPromptPath)) {
      fs.writeFileSync(planPromptPath, DEFAULT_PLAN_PROMPT);
    }

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
