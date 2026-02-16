import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { BuiltinSkillStore } from '../../src/skills/builtin-store.js';

describe('BuiltinSkillStore', () => {
  let tmpDir: string;
  let store: BuiltinSkillStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'builtin-skills-'));
    // Create test skill directories
    const skill1Dir = path.join(tmpDir, 'test-skill');
    fs.mkdirSync(skill1Dir, { recursive: true });
    fs.writeFileSync(
      path.join(skill1Dir, 'SKILL.md'),
      '---\nname: test-skill\ndescription: "A test skill"\n---\n\n# Test Skill\n\nTest content here.',
    );

    const skill2Dir = path.join(tmpDir, 'another-skill');
    fs.mkdirSync(skill2Dir, { recursive: true });
    fs.writeFileSync(
      path.join(skill2Dir, 'SKILL.md'),
      '---\nname: another-skill\ndescription: "Another skill"\n---\n\n# Another\n\nMore content.',
    );

    store = new BuiltinSkillStore(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('listSkills', () => {
    it('should return all builtin skills with builtin: true', () => {
      const skills = store.listSkills();
      expect(skills).toHaveLength(2);
      for (const skill of skills) {
        expect(skill.builtin).toBe(true);
      }
    });

    it('should parse name, description, and content from SKILL.md', () => {
      const skills = store.listSkills();
      const testSkill = skills.find((s) => s.name === 'test-skill');
      expect(testSkill).toBeDefined();
      expect(testSkill!.description).toBe('A test skill');
      expect(testSkill!.content).toContain('# Test Skill');
    });

    it('should return empty array when directory does not exist', () => {
      const emptyStore = new BuiltinSkillStore('/nonexistent/path');
      expect(emptyStore.listSkills()).toEqual([]);
    });
  });

  describe('readSkill', () => {
    it('should return a skill with builtin: true', () => {
      const skill = store.readSkill('test-skill');
      expect(skill).not.toBeNull();
      expect(skill!.name).toBe('test-skill');
      expect(skill!.description).toBe('A test skill');
      expect(skill!.builtin).toBe(true);
    });

    it('should return null for non-existent skill', () => {
      expect(store.readSkill('nonexistent')).toBeNull();
    });
  });

  describe('getSkillDirectories', () => {
    it('should return absolute paths of all skill directories', () => {
      const dirs = store.getSkillDirectories();
      expect(dirs).toHaveLength(2);
      for (const dir of dirs) {
        expect(path.isAbsolute(dir)).toBe(true);
        expect(fs.existsSync(dir)).toBe(true);
      }
    });

    it('should return empty array when no skills exist', () => {
      const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-skills-'));
      const emptyStore = new BuiltinSkillStore(emptyDir);
      expect(emptyStore.getSkillDirectories()).toEqual([]);
      fs.rmSync(emptyDir, { recursive: true, force: true });
    });
  });

  describe('hasSkill', () => {
    it('should return true for existing skill', () => {
      expect(store.hasSkill('test-skill')).toBe(true);
    });

    it('should return false for non-existent skill', () => {
      expect(store.hasSkill('nonexistent')).toBe(false);
    });
  });
});
