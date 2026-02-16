import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from './file-store.js';

export interface BuiltinSkillInfo {
  name: string;
  description: string;
  content: string;
  builtin: true;
}

export class BuiltinSkillStore {
  constructor(private basePath: string) {}

  listSkills(): BuiltinSkillInfo[] {
    try {
      const entries = fs.readdirSync(this.basePath, { withFileTypes: true });
      const skills: BuiltinSkillInfo[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const skillMd = path.join(this.basePath, entry.name, 'SKILL.md');
        if (!fs.existsSync(skillMd)) continue;

        const raw = fs.readFileSync(skillMd, 'utf-8');
        const { description, body } = parseFrontmatter(raw);
        skills.push({ name: entry.name, description, content: body, builtin: true });
      }

      return skills;
    } catch {
      return [];
    }
  }

  readSkill(name: string): BuiltinSkillInfo | null {
    const skillMd = path.join(this.basePath, name, 'SKILL.md');
    try {
      const raw = fs.readFileSync(skillMd, 'utf-8');
      const { description, body } = parseFrontmatter(raw);
      return { name, description, content: body, builtin: true };
    } catch {
      return null;
    }
  }

  hasSkill(name: string): boolean {
    return fs.existsSync(path.join(this.basePath, name, 'SKILL.md'));
  }

  getSkillDirectories(): string[] {
    return this.listSkills().map((s) => path.join(this.basePath, s.name));
  }
}
