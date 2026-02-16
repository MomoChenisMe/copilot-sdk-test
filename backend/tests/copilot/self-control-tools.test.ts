import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createSelfControlTools } from '../../src/copilot/self-control-tools.js';
import { PromptFileStore } from '../../src/prompts/file-store.js';
import { SkillFileStore } from '../../src/skills/file-store.js';
import { BuiltinSkillStore } from '../../src/skills/builtin-store.js';

describe('createSelfControlTools', () => {
  let tmpDir: string;
  let promptStore: PromptFileStore;
  let skillStore: SkillFileStore;
  let builtinSkillStore: BuiltinSkillStore;
  let builtinDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'self-control-'));
    const promptsPath = path.join(tmpDir, 'prompts');
    const skillsPath = path.join(tmpDir, 'skills');
    builtinDir = path.join(tmpDir, 'builtin-skills');

    promptStore = new PromptFileStore(promptsPath);
    promptStore.ensureDirectories();

    skillStore = new SkillFileStore(skillsPath);
    skillStore.ensureDirectory();

    builtinSkillStore = new BuiltinSkillStore(builtinDir);
    fs.mkdirSync(builtinDir, { recursive: true });
  });

  function getTools() {
    return createSelfControlTools({ promptStore, skillStore, builtinSkillStore });
  }

  function findTool(tools: ReturnType<typeof getTools>, name: string) {
    const tool = tools.find((t) => t.name === name);
    if (!tool) throw new Error(`Tool "${name}" not found`);
    return tool;
  }

  const dummyInvocation = { sessionId: 'test-session', toolCallId: 'tc-1', toolName: '', arguments: {} };

  it('should return an array of tools', () => {
    const tools = getTools();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
  });

  it('should include all expected tool names', () => {
    const tools = getTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain('read_profile');
    expect(names).toContain('update_profile');
    expect(names).toContain('read_agent_rules');
    expect(names).toContain('update_agent_rules');
    expect(names).toContain('read_preferences');
    expect(names).toContain('update_preferences');
    expect(names).toContain('list_skills');
    expect(names).toContain('read_skill');
    expect(names).toContain('create_skill');
    expect(names).toContain('update_skill');
    expect(names).toContain('delete_skill');
  });

  it('every tool should have a description', () => {
    const tools = getTools();
    for (const tool of tools) {
      expect(tool.description, `Tool "${tool.name}" missing description`).toBeTruthy();
    }
  });

  // --- read_profile / update_profile ---
  describe('read_profile', () => {
    it('should return empty string when PROFILE.md is empty', async () => {
      const tools = getTools();
      const tool = findTool(tools, 'read_profile');
      const result = await tool.handler({}, dummyInvocation);
      expect(result).toEqual({ content: '' });
    });

    it('should return content of PROFILE.md', async () => {
      promptStore.writeFile('PROFILE.md', '# My Profile\nI am a developer.');
      const tools = getTools();
      const tool = findTool(tools, 'read_profile');
      const result = await tool.handler({}, dummyInvocation);
      expect(result).toEqual({ content: '# My Profile\nI am a developer.' });
    });
  });

  describe('update_profile', () => {
    it('should write content to PROFILE.md', async () => {
      const tools = getTools();
      const tool = findTool(tools, 'update_profile');
      const result = await tool.handler({ content: '# Updated Profile' }, dummyInvocation);
      expect(result).toEqual({ ok: true });
      expect(promptStore.readFile('PROFILE.md')).toBe('# Updated Profile');
    });

    it('should reject content exceeding 50KB', async () => {
      const tools = getTools();
      const tool = findTool(tools, 'update_profile');
      const bigContent = 'x'.repeat(51 * 1024);
      const result = await tool.handler({ content: bigContent }, dummyInvocation);
      expect(result).toEqual({ ok: false, error: expect.stringContaining('50KB') });
      // Original content should be unchanged
      expect(promptStore.readFile('PROFILE.md')).toBe('');
    });
  });

  // --- read_agent_rules / update_agent_rules ---
  describe('read_agent_rules', () => {
    it('should return empty string when AGENT.md is empty', async () => {
      const tools = getTools();
      const tool = findTool(tools, 'read_agent_rules');
      const result = await tool.handler({}, dummyInvocation);
      expect(result).toEqual({ content: '' });
    });

    it('should return content of AGENT.md', async () => {
      promptStore.writeFile('AGENT.md', '## Rules\n- Be concise');
      const tools = getTools();
      const tool = findTool(tools, 'read_agent_rules');
      const result = await tool.handler({}, dummyInvocation);
      expect(result).toEqual({ content: '## Rules\n- Be concise' });
    });
  });

  describe('update_agent_rules', () => {
    it('should write content to AGENT.md', async () => {
      const tools = getTools();
      const tool = findTool(tools, 'update_agent_rules');
      const result = await tool.handler({ content: '## New Rules' }, dummyInvocation);
      expect(result).toEqual({ ok: true });
      expect(promptStore.readFile('AGENT.md')).toBe('## New Rules');
    });

    it('should reject content exceeding 50KB', async () => {
      const tools = getTools();
      const tool = findTool(tools, 'update_agent_rules');
      const bigContent = 'x'.repeat(51 * 1024);
      const result = await tool.handler({ content: bigContent }, dummyInvocation);
      expect(result).toEqual({ ok: false, error: expect.stringContaining('50KB') });
    });
  });

  // --- read_preferences / update_preferences ---
  describe('read_preferences', () => {
    it('should return empty string when memory/preferences.md is empty', async () => {
      const tools = getTools();
      const tool = findTool(tools, 'read_preferences');
      const result = await tool.handler({}, dummyInvocation);
      expect(result).toEqual({ content: '' });
    });

    it('should return content of memory/preferences.md', async () => {
      promptStore.writeFile('memory/preferences.md', 'Prefer TypeScript');
      const tools = getTools();
      const tool = findTool(tools, 'read_preferences');
      const result = await tool.handler({}, dummyInvocation);
      expect(result).toEqual({ content: 'Prefer TypeScript' });
    });
  });

  describe('update_preferences', () => {
    it('should write content to memory/preferences.md', async () => {
      const tools = getTools();
      const tool = findTool(tools, 'update_preferences');
      const result = await tool.handler({ content: 'Use Vitest' }, dummyInvocation);
      expect(result).toEqual({ ok: true });
      expect(promptStore.readFile('memory/preferences.md')).toBe('Use Vitest');
    });

    it('should reject content exceeding 50KB', async () => {
      const tools = getTools();
      const tool = findTool(tools, 'update_preferences');
      const bigContent = 'x'.repeat(51 * 1024);
      const result = await tool.handler({ content: bigContent }, dummyInvocation);
      expect(result).toEqual({ ok: false, error: expect.stringContaining('50KB') });
    });
  });

  // --- list_skills ---
  describe('list_skills', () => {
    it('should return empty array when no skills exist', async () => {
      const tools = getTools();
      const tool = findTool(tools, 'list_skills');
      const result = await tool.handler({}, dummyInvocation);
      expect(result).toEqual({ skills: [] });
    });

    it('should list user skills', async () => {
      skillStore.writeSkill('my-skill', 'A test skill', 'skill body');
      const tools = getTools();
      const tool = findTool(tools, 'list_skills');
      const result = await tool.handler({}, dummyInvocation) as any;
      expect(result.skills).toHaveLength(1);
      expect(result.skills[0]).toMatchObject({ name: 'my-skill', description: 'A test skill', builtin: false });
    });

    it('should list builtin skills', async () => {
      // Create a builtin skill
      const builtinSkillDir = path.join(builtinDir, 'code-review');
      fs.mkdirSync(builtinSkillDir, { recursive: true });
      fs.writeFileSync(
        path.join(builtinSkillDir, 'SKILL.md'),
        '---\nname: code-review\ndescription: "Review code"\n---\n\nReview code for issues.',
      );

      const tools = getTools();
      const tool = findTool(tools, 'list_skills');
      const result = await tool.handler({}, dummyInvocation) as any;
      expect(result.skills.some((s: any) => s.name === 'code-review' && s.builtin === true)).toBe(true);
    });

    it('should list both builtin and user skills', async () => {
      // Create builtin
      const builtinSkillDir = path.join(builtinDir, 'code-review');
      fs.mkdirSync(builtinSkillDir, { recursive: true });
      fs.writeFileSync(
        path.join(builtinSkillDir, 'SKILL.md'),
        '---\nname: code-review\ndescription: "Review code"\n---\n\nReview code.',
      );
      // Create user skill
      skillStore.writeSkill('my-skill', 'Custom skill', 'custom body');

      const tools = getTools();
      const tool = findTool(tools, 'list_skills');
      const result = await tool.handler({}, dummyInvocation) as any;
      expect(result.skills.length).toBeGreaterThanOrEqual(2);
    });
  });

  // --- read_skill ---
  describe('read_skill', () => {
    it('should read a user skill', async () => {
      skillStore.writeSkill('my-skill', 'A test skill', 'skill body content');
      const tools = getTools();
      const tool = findTool(tools, 'read_skill');
      const result = await tool.handler({ name: 'my-skill' }, dummyInvocation) as any;
      expect(result.name).toBe('my-skill');
      expect(result.description).toBe('A test skill');
      expect(result.content).toBe('skill body content');
      expect(result.builtin).toBe(false);
    });

    it('should read a builtin skill', async () => {
      const builtinSkillDir = path.join(builtinDir, 'code-review');
      fs.mkdirSync(builtinSkillDir, { recursive: true });
      fs.writeFileSync(
        path.join(builtinSkillDir, 'SKILL.md'),
        '---\nname: code-review\ndescription: "Review code"\n---\n\nReview code for issues.',
      );

      const tools = getTools();
      const tool = findTool(tools, 'read_skill');
      const result = await tool.handler({ name: 'code-review' }, dummyInvocation) as any;
      expect(result.name).toBe('code-review');
      expect(result.builtin).toBe(true);
    });

    it('should return error for non-existent skill', async () => {
      const tools = getTools();
      const tool = findTool(tools, 'read_skill');
      const result = await tool.handler({ name: 'nonexistent' }, dummyInvocation);
      expect(result).toEqual({ ok: false, error: expect.stringContaining('not found') });
    });
  });

  // --- create_skill ---
  describe('create_skill', () => {
    it('should create a new user skill', async () => {
      const tools = getTools();
      const tool = findTool(tools, 'create_skill');
      const result = await tool.handler(
        { name: 'new-skill', description: 'New skill', content: 'Do something' },
        dummyInvocation,
      );
      expect(result).toEqual({ ok: true });
      const skill = skillStore.readSkill('new-skill');
      expect(skill).not.toBeNull();
      expect(skill!.description).toBe('New skill');
      expect(skill!.content).toBe('Do something');
    });

    it('should reject content exceeding 100KB', async () => {
      const tools = getTools();
      const tool = findTool(tools, 'create_skill');
      const bigContent = 'x'.repeat(101 * 1024);
      const result = await tool.handler(
        { name: 'big-skill', description: 'Big', content: bigContent },
        dummyInvocation,
      );
      expect(result).toEqual({ ok: false, error: expect.stringContaining('100KB') });
    });

    it('should reject creating a skill with a builtin name', async () => {
      const builtinSkillDir = path.join(builtinDir, 'code-review');
      fs.mkdirSync(builtinSkillDir, { recursive: true });
      fs.writeFileSync(
        path.join(builtinSkillDir, 'SKILL.md'),
        '---\nname: code-review\ndescription: "Review code"\n---\n\nReview.',
      );

      const tools = getTools();
      const tool = findTool(tools, 'create_skill');
      const result = await tool.handler(
        { name: 'code-review', description: 'Override', content: 'body' },
        dummyInvocation,
      );
      expect(result).toEqual({ ok: false, error: expect.stringContaining('built-in') });
    });
  });

  // --- update_skill ---
  describe('update_skill', () => {
    it('should update an existing user skill', async () => {
      skillStore.writeSkill('my-skill', 'Old desc', 'old body');
      const tools = getTools();
      const tool = findTool(tools, 'update_skill');
      const result = await tool.handler(
        { name: 'my-skill', description: 'New desc', content: 'new body' },
        dummyInvocation,
      );
      expect(result).toEqual({ ok: true });
      const skill = skillStore.readSkill('my-skill');
      expect(skill!.description).toBe('New desc');
      expect(skill!.content).toBe('new body');
    });

    it('should reject updating a builtin skill', async () => {
      const builtinSkillDir = path.join(builtinDir, 'code-review');
      fs.mkdirSync(builtinSkillDir, { recursive: true });
      fs.writeFileSync(
        path.join(builtinSkillDir, 'SKILL.md'),
        '---\nname: code-review\ndescription: "Review code"\n---\n\nReview.',
      );

      const tools = getTools();
      const tool = findTool(tools, 'update_skill');
      const result = await tool.handler(
        { name: 'code-review', description: 'Override', content: 'body' },
        dummyInvocation,
      );
      expect(result).toEqual({ ok: false, error: expect.stringContaining('built-in') });
    });

    it('should reject content exceeding 100KB', async () => {
      skillStore.writeSkill('my-skill', 'desc', 'body');
      const tools = getTools();
      const tool = findTool(tools, 'update_skill');
      const bigContent = 'x'.repeat(101 * 1024);
      const result = await tool.handler(
        { name: 'my-skill', description: 'desc', content: bigContent },
        dummyInvocation,
      );
      expect(result).toEqual({ ok: false, error: expect.stringContaining('100KB') });
    });
  });

  // --- delete_skill ---
  describe('delete_skill', () => {
    it('should delete an existing user skill', async () => {
      skillStore.writeSkill('my-skill', 'desc', 'body');
      const tools = getTools();
      const tool = findTool(tools, 'delete_skill');
      const result = await tool.handler({ name: 'my-skill' }, dummyInvocation);
      expect(result).toEqual({ ok: true });
      expect(skillStore.readSkill('my-skill')).toBeNull();
    });

    it('should reject deleting a builtin skill', async () => {
      const builtinSkillDir = path.join(builtinDir, 'code-review');
      fs.mkdirSync(builtinSkillDir, { recursive: true });
      fs.writeFileSync(
        path.join(builtinSkillDir, 'SKILL.md'),
        '---\nname: code-review\ndescription: "Review code"\n---\n\nReview.',
      );

      const tools = getTools();
      const tool = findTool(tools, 'delete_skill');
      const result = await tool.handler({ name: 'code-review' }, dummyInvocation);
      expect(result).toEqual({ ok: false, error: expect.stringContaining('built-in') });
    });

    it('should succeed silently for non-existent user skill', async () => {
      const tools = getTools();
      const tool = findTool(tools, 'delete_skill');
      const result = await tool.handler({ name: 'nonexistent' }, dummyInvocation);
      expect(result).toEqual({ ok: true });
    });
  });
});
