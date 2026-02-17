import fs from 'node:fs';
import path from 'node:path';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class MemoryStore {
  constructor(private basePath: string) {}

  ensureDirectories(): void {
    fs.mkdirSync(this.basePath, { recursive: true });
    fs.mkdirSync(path.join(this.basePath, 'daily'), { recursive: true });

    const memoryFile = path.join(this.basePath, 'MEMORY.md');
    if (!fs.existsSync(memoryFile)) {
      fs.writeFileSync(memoryFile, '', 'utf-8');
    }
  }

  readMemory(): string {
    const filePath = path.join(this.basePath, 'MEMORY.md');
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return '';
    }
  }

  writeMemory(content: string): void {
    fs.writeFileSync(path.join(this.basePath, 'MEMORY.md'), content, 'utf-8');
  }

  appendMemory(content: string): void {
    const existing = this.readMemory();
    this.writeMemory(existing + content);
  }

  readDailyLog(date: string): string {
    this.validateDate(date);
    const filePath = path.join(this.basePath, 'daily', `${date}.md`);
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return '';
    }
  }

  appendDailyLog(date: string, entry: string): void {
    this.validateDate(date);
    const filePath = path.join(this.basePath, 'daily', `${date}.md`);
    const existing = this.readDailyLog(date);
    const content = existing ? `${existing}\n${entry}` : entry;
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  listDailyLogs(): string[] {
    const dailyDir = path.join(this.basePath, 'daily');
    try {
      return fs
        .readdirSync(dailyDir)
        .filter((f) => f.endsWith('.md'))
        .map((f) => f.replace('.md', ''))
        .filter((d) => DATE_RE.test(d))
        .sort()
        .reverse();
    } catch {
      return [];
    }
  }

  private validateDate(date: string): void {
    if (!DATE_RE.test(date)) {
      throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD.`);
    }
  }
}
