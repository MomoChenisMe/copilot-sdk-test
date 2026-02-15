import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { SkillFileStore, parseFrontmatter, composeFrontmatter } from '../../src/skills/file-store.js';

describe('SkillFileStore', () => {
  let tmpDir: string;
  let store: SkillFileStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-store-'));
    store = new SkillFileStore(tmpDir);
    store.ensureDirectory();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // === parseFrontmatter ===
  describe('parseFrontmatter', () => {
    it('should parse quoted description', () => {
      const raw = '---\nname: my-skill\ndescription: "A useful skill"\n---\n\n# Content';
      const { description, body } = parseFrontmatter(raw);
      expect(description).toBe('A useful skill');
      expect(body).toBe('# Content');
    });

    it('should parse single-quoted description', () => {
      const raw = "---\nname: my-skill\ndescription: 'Single quoted'\n---\n\n# Body";
      const { description, body } = parseFrontmatter(raw);
      expect(description).toBe('Single quoted');
      expect(body).toBe('# Body');
    });

    it('should parse unquoted description', () => {
      const raw = '---\nname: my-skill\ndescription: Unquoted long description here\n---\n\n# Body';
      const { description, body } = parseFrontmatter(raw);
      expect(description).toBe('Unquoted long description here');
      expect(body).toBe('# Body');
    });

    it('should return empty description when no frontmatter', () => {
      const raw = '# Just markdown content';
      const { description, body } = parseFrontmatter(raw);
      expect(description).toBe('');
      expect(body).toBe('# Just markdown content');
    });

    it('should return empty description when frontmatter has no description', () => {
      const raw = '---\nname: my-skill\n---\n\n# Content';
      const { description, body } = parseFrontmatter(raw);
      expect(description).toBe('');
      expect(body).toBe('# Content');
    });
  });

  // === composeFrontmatter ===
  describe('composeFrontmatter', () => {
    it('should compose frontmatter with name and description', () => {
      const result = composeFrontmatter('test-skill', 'A test skill', '# Content');
      expect(result).toBe('---\nname: test-skill\ndescription: "A test skill"\n---\n\n# Content');
    });

    it('should escape double quotes in description', () => {
      const result = composeFrontmatter('skill', 'Uses "quotes"', '# Body');
      expect(result).toContain('description: "Uses \\"quotes\\""');
    });
  });

  // === ensureDirectory ===
  describe('ensureDirectory', () => {
    it('should create the base directory if it does not exist', () => {
      const newDir = path.join(tmpDir, 'new-skills');
      const newStore = new SkillFileStore(newDir);
      newStore.ensureDirectory();
      expect(fs.existsSync(newDir)).toBe(true);
    });

    it('should not throw if directory already exists', () => {
      expect(() => store.ensureDirectory()).not.toThrow();
    });
  });

  // === listSkills ===
  describe('listSkills', () => {
    it('should return empty array when no skills exist', () => {
      expect(store.listSkills()).toEqual([]);
    });

    it('should list skills with parsed frontmatter', () => {
      const skillDir1 = path.join(tmpDir, 'my-skill');
      const skillDir2 = path.join(tmpDir, 'another-skill');
      fs.mkdirSync(skillDir1);
      fs.mkdirSync(skillDir2);
      fs.writeFileSync(path.join(skillDir1, 'SKILL.md'), '---\nname: my-skill\ndescription: "Skill one"\n---\n\n# My Skill');
      fs.writeFileSync(path.join(skillDir2, 'SKILL.md'), '---\nname: another-skill\ndescription: "Skill two"\n---\n\n# Another');

      const skills = store.listSkills();
      expect(skills).toHaveLength(2);
      const names = skills.map((s) => s.name);
      expect(names).toContain('my-skill');
      expect(names).toContain('another-skill');

      const mySkill = skills.find((s) => s.name === 'my-skill')!;
      expect(mySkill.description).toBe('Skill one');
      expect(mySkill.content).toBe('# My Skill');
    });

    it('should handle SKILL.md without frontmatter', () => {
      const skillDir = path.join(tmpDir, 'plain-skill');
      fs.mkdirSync(skillDir);
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# Just markdown');

      const skills = store.listSkills();
      expect(skills).toHaveLength(1);
      expect(skills[0].description).toBe('');
      expect(skills[0].content).toBe('# Just markdown');
    });

    it('should skip directories without SKILL.md', () => {
      fs.mkdirSync(path.join(tmpDir, 'empty-dir'));
      fs.mkdirSync(path.join(tmpDir, 'has-skill'));
      fs.writeFileSync(path.join(tmpDir, 'has-skill', 'SKILL.md'), '---\nname: has-skill\ndescription: "Valid"\n---\n\n# Skill');

      const skills = store.listSkills();
      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe('has-skill');
    });

    it('should skip files (not directories) in base path', () => {
      fs.writeFileSync(path.join(tmpDir, 'not-a-dir.md'), 'file content');
      fs.mkdirSync(path.join(tmpDir, 'real-skill'));
      fs.writeFileSync(path.join(tmpDir, 'real-skill', 'SKILL.md'), '---\nname: real-skill\ndescription: "Real"\n---\n\n# Real');

      const skills = store.listSkills();
      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe('real-skill');
    });
  });

  // === readSkill ===
  describe('readSkill', () => {
    it('should return skill with parsed frontmatter', () => {
      const skillDir = path.join(tmpDir, 'test-skill');
      fs.mkdirSync(skillDir);
      fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '---\nname: test-skill\ndescription: "A test skill"\n---\n\n# Test Skill Content');

      const skill = store.readSkill('test-skill');
      expect(skill).not.toBeNull();
      expect(skill!.name).toBe('test-skill');
      expect(skill!.description).toBe('A test skill');
      expect(skill!.content).toBe('# Test Skill Content');
    });

    it('should return null when skill does not exist', () => {
      expect(store.readSkill('nonexistent')).toBeNull();
    });

    it('should return null when directory exists but SKILL.md is missing', () => {
      fs.mkdirSync(path.join(tmpDir, 'empty-skill'));
      expect(store.readSkill('empty-skill')).toBeNull();
    });
  });

  // === writeSkill ===
  describe('writeSkill', () => {
    it('should create skill directory and SKILL.md with frontmatter', () => {
      store.writeSkill('new-skill', 'A new skill', '# New Skill\nContent here');

      const skillPath = path.join(tmpDir, 'new-skill', 'SKILL.md');
      expect(fs.existsSync(skillPath)).toBe(true);
      const raw = fs.readFileSync(skillPath, 'utf-8');
      expect(raw).toContain('name: new-skill');
      expect(raw).toContain('description: "A new skill"');
      expect(raw).toContain('# New Skill\nContent here');
    });

    it('should overwrite existing SKILL.md', () => {
      store.writeSkill('my-skill', 'Original desc', 'Original body');
      store.writeSkill('my-skill', 'Updated desc', 'Updated body');

      const skill = store.readSkill('my-skill');
      expect(skill!.description).toBe('Updated desc');
      expect(skill!.content).toBe('Updated body');
    });

    it('should throw on invalid name', () => {
      expect(() => store.writeSkill('../escape', 'desc', 'bad')).toThrow();
      expect(() => store.writeSkill('', 'desc', 'bad')).toThrow();
    });

    it('should roundtrip through read after write', () => {
      store.writeSkill('roundtrip', 'Test roundtrip', '# Roundtrip body');
      const skill = store.readSkill('roundtrip');
      expect(skill!.name).toBe('roundtrip');
      expect(skill!.description).toBe('Test roundtrip');
      expect(skill!.content).toBe('# Roundtrip body');
    });
  });

  // === deleteSkill ===
  describe('deleteSkill', () => {
    it('should remove the skill directory', () => {
      store.writeSkill('to-delete', 'Delete me', '# Delete me');
      expect(fs.existsSync(path.join(tmpDir, 'to-delete'))).toBe(true);

      store.deleteSkill('to-delete');
      expect(fs.existsSync(path.join(tmpDir, 'to-delete'))).toBe(false);
    });

    it('should not throw when deleting non-existent skill', () => {
      expect(() => store.deleteSkill('nonexistent')).not.toThrow();
    });
  });

  // === getSkillDirectories ===
  describe('getSkillDirectories', () => {
    it('should return empty array when no skills exist', () => {
      expect(store.getSkillDirectories()).toEqual([]);
    });

    it('should return absolute paths to skill directories', () => {
      store.writeSkill('skill-a', 'Desc A', '# A');
      store.writeSkill('skill-b', 'Desc B', '# B');

      const dirs = store.getSkillDirectories();
      expect(dirs).toHaveLength(2);
      // Should be absolute paths
      for (const dir of dirs) {
        expect(path.isAbsolute(dir)).toBe(true);
        expect(fs.existsSync(dir)).toBe(true);
      }
      expect(dirs).toContain(path.join(tmpDir, 'skill-a'));
      expect(dirs).toContain(path.join(tmpDir, 'skill-b'));
    });

    it('should only include directories with SKILL.md', () => {
      store.writeSkill('valid-skill', 'Valid desc', '# Valid');
      fs.mkdirSync(path.join(tmpDir, 'no-skill-md'));

      const dirs = store.getSkillDirectories();
      expect(dirs).toHaveLength(1);
      expect(dirs[0]).toContain('valid-skill');
    });
  });
});
