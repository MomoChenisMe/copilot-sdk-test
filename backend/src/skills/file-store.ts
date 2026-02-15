import fs from 'node:fs';
import path from 'node:path';
import { sanitizeName } from '../prompts/file-store.js';

export interface SkillInfo {
  name: string;
  description: string;
  content: string;
}

/** Parse YAML frontmatter from SKILL.md content */
export function parseFrontmatter(raw: string): { description: string; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { description: '', body: raw };

  const fm = match[1];
  const body = match[2].trim();

  // Handle both quoted and unquoted description values
  const descMatch = fm.match(/^description:\s*(?:"([^"]*?)"|'([^']*?)'|(.*))$/m);
  const description = (descMatch ? (descMatch[1] ?? descMatch[2] ?? descMatch[3] ?? '') : '').trim();

  return { description, body };
}

/** Compose SKILL.md with YAML frontmatter */
export function composeFrontmatter(name: string, description: string, body: string): string {
  const escaped = description.replace(/"/g, '\\"');
  return `---\nname: ${name}\ndescription: "${escaped}"\n---\n\n${body}`;
}

export class SkillFileStore {
  constructor(private basePath: string) {}

  ensureDirectory(): void {
    fs.mkdirSync(this.basePath, { recursive: true });
  }

  listSkills(): SkillInfo[] {
    try {
      const entries = fs.readdirSync(this.basePath, { withFileTypes: true });
      const skills: SkillInfo[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const skillMd = path.join(this.basePath, entry.name, 'SKILL.md');
        if (!fs.existsSync(skillMd)) continue;

        const raw = fs.readFileSync(skillMd, 'utf-8');
        const { description, body } = parseFrontmatter(raw);
        skills.push({ name: entry.name, description, content: body });
      }

      return skills;
    } catch {
      return [];
    }
  }

  readSkill(name: string): SkillInfo | null {
    const skillMd = path.join(this.basePath, name, 'SKILL.md');
    try {
      const raw = fs.readFileSync(skillMd, 'utf-8');
      const { description, body } = parseFrontmatter(raw);
      return { name, description, content: body };
    } catch {
      return null;
    }
  }

  writeSkill(name: string, description: string, content: string): void {
    const safeName = sanitizeName(name);
    const skillDir = path.join(this.basePath, safeName);
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(
      path.join(skillDir, 'SKILL.md'),
      composeFrontmatter(safeName, description, content),
      'utf-8',
    );
  }

  deleteSkill(name: string): void {
    const skillDir = path.join(this.basePath, name);
    try {
      fs.rmSync(skillDir, { recursive: true, force: true });
    } catch {
      // Ignore — directory may not exist
    }
  }

  getSkillDirectories(): string[] {
    return this.listSkills().map((s) => path.join(this.basePath, s.name));
  }
}
