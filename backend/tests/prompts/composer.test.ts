import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { PromptComposer } from '../../src/prompts/composer.js';
import { PromptFileStore } from '../../src/prompts/file-store.js';
import { MemoryStore } from '../../src/memory/memory-store.js';

describe('PromptComposer', () => {
  let tmpDir: string;
  let store: PromptFileStore;
  let composer: PromptComposer;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-composer-'));
    store = new PromptFileStore(tmpDir);
    store.ensureDirectories();
    composer = new PromptComposer(store);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should compose in order: SYSTEM_PROMPT → PROFILE (no AGENT or preferences)', () => {
    fs.writeFileSync(path.join(tmpDir, 'SYSTEM_PROMPT.md'), 'System prompt content');
    fs.writeFileSync(path.join(tmpDir, 'PROFILE.md'), 'Profile content');
    // AGENT.md and memory/preferences.md should be ignored
    fs.writeFileSync(path.join(tmpDir, 'AGENT.md'), 'Agent content');
    fs.writeFileSync(path.join(tmpDir, 'memory', 'preferences.md'), 'Preferences content');

    const result = composer.compose();
    const sections = result.split('\n\n---\n\n');
    expect(sections[0]).toBe('System prompt content');
    expect(sections[1]).toBe('Profile content');
    // Should NOT include AGENT or preferences as separate sections
    expect(result).not.toContain('Agent content');
    expect(result).not.toContain('Preferences content');
  });

  it('should skip SYSTEM_PROMPT when empty', () => {
    fs.writeFileSync(path.join(tmpDir, 'SYSTEM_PROMPT.md'), '');
    fs.writeFileSync(path.join(tmpDir, 'PROFILE.md'), 'Profile content');

    const result = composer.compose();
    expect(result).toBe('Profile content');
  });

  it('should skip empty sections (no extra separators)', () => {
    // Clear SYSTEM_PROMPT so we only test non-system sections
    fs.writeFileSync(path.join(tmpDir, 'SYSTEM_PROMPT.md'), '');
    fs.writeFileSync(path.join(tmpDir, 'PROFILE.md'), 'Profile only');

    const result = composer.compose();
    expect(result).toBe('Profile only');
    expect(result).not.toContain('---');
  });

  it('should return empty string when all sections are empty', () => {
    fs.writeFileSync(path.join(tmpDir, 'SYSTEM_PROMPT.md'), '');
    const result = composer.compose();
    expect(result).toBe('');
  });

  it('should skip whitespace-only sections', () => {
    fs.writeFileSync(path.join(tmpDir, 'SYSTEM_PROMPT.md'), '');
    fs.writeFileSync(path.join(tmpDir, 'PROFILE.md'), '   \n  ');

    const result = composer.compose();
    expect(result).toBe('');
  });

  it('should truncate when exceeding maxPromptLength', () => {
    const longContent = 'A'.repeat(200);
    fs.writeFileSync(path.join(tmpDir, 'PROFILE.md'), longContent);

    const shortComposer = new PromptComposer(store, 100);
    const result = shortComposer.compose();
    expect(result.length).toBeLessThanOrEqual(116); // 100 + '\n[... truncated]'.length
    expect(result).toContain('[... truncated]');
  });

  it('should include .ai-terminal.md from cwd when provided', () => {
    fs.writeFileSync(path.join(tmpDir, 'SYSTEM_PROMPT.md'), '');
    const cwdDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cwd-'));
    fs.writeFileSync(path.join(cwdDir, '.ai-terminal.md'), 'Project rules');
    fs.writeFileSync(path.join(tmpDir, 'PROFILE.md'), 'Profile');

    const result = composer.compose(cwdDir);
    expect(result).toContain('Project rules');
    expect(result).toContain('Profile');

    fs.rmSync(cwdDir, { recursive: true, force: true });
  });

  it('should skip .ai-terminal.md when file does not exist', () => {
    fs.writeFileSync(path.join(tmpDir, 'SYSTEM_PROMPT.md'), '');
    fs.writeFileSync(path.join(tmpDir, 'PROFILE.md'), 'Profile');

    const result = composer.compose('/nonexistent-dir');
    expect(result).toBe('Profile');
  });

  describe('locale injection', () => {
    it('should append language instruction when locale is non-English', () => {
      fs.writeFileSync(path.join(tmpDir, 'SYSTEM_PROMPT.md'), '');
      fs.writeFileSync(path.join(tmpDir, 'PROFILE.md'), 'Profile');

      const result = composer.compose(undefined, 'zh-TW');
      expect(result).toContain('# Language');
      expect(result).toContain('繁體中文（台灣）');
    });

    it('should not append language instruction when locale is en', () => {
      fs.writeFileSync(path.join(tmpDir, 'SYSTEM_PROMPT.md'), '');
      fs.writeFileSync(path.join(tmpDir, 'PROFILE.md'), 'Profile');

      const result = composer.compose(undefined, 'en');
      expect(result).not.toContain('# Language');
    });

    it('should not append language instruction when locale is undefined', () => {
      fs.writeFileSync(path.join(tmpDir, 'SYSTEM_PROMPT.md'), '');
      fs.writeFileSync(path.join(tmpDir, 'PROFILE.md'), 'Profile');

      const result = composer.compose();
      expect(result).not.toContain('# Language');
    });

    it('should use locale code as fallback for unknown locales', () => {
      fs.writeFileSync(path.join(tmpDir, 'SYSTEM_PROMPT.md'), '');
      fs.writeFileSync(path.join(tmpDir, 'PROFILE.md'), 'Profile');

      const result = composer.compose(undefined, 'fr');
      expect(result).toContain('Always respond in fr');
    });
  });

  describe('OPENSPEC_SDD.md injection', () => {
    it('should inject OPENSPEC_SDD.md when toggle is enabled in CONFIG.json', () => {
      fs.writeFileSync(path.join(tmpDir, 'SYSTEM_PROMPT.md'), '');
      fs.writeFileSync(path.join(tmpDir, 'PROFILE.md'), 'Profile rules');
      fs.writeFileSync(path.join(tmpDir, 'OPENSPEC_SDD.md'), 'OpenSpec content');
      fs.writeFileSync(path.join(tmpDir, 'CONFIG.json'), JSON.stringify({ openspecSddEnabled: true }));

      const result = composer.compose();
      expect(result).toContain('OpenSpec content');
    });

    it('should place OPENSPEC_SDD.md after PROFILE and before auto-memory', () => {
      const memDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-'));
      const memStore = new MemoryStore(memDir);
      memStore.ensureDirectories();
      memStore.writeMemory('Memory facts');

      const composerWithMem = new PromptComposer(store, 50_000, memStore);
      fs.writeFileSync(path.join(tmpDir, 'SYSTEM_PROMPT.md'), '');
      fs.writeFileSync(path.join(tmpDir, 'PROFILE.md'), 'Profile rules');
      fs.writeFileSync(path.join(tmpDir, 'OPENSPEC_SDD.md'), 'OpenSpec content');
      fs.writeFileSync(path.join(tmpDir, 'CONFIG.json'), JSON.stringify({ openspecSddEnabled: true }));

      const result = composerWithMem.compose();
      const sections = result.split('\n\n---\n\n');
      const profileIdx = sections.indexOf('Profile rules');
      const sddIdx = sections.indexOf('OpenSpec content');
      const memIdx = sections.indexOf('Memory facts');
      expect(profileIdx).toBeLessThan(sddIdx);
      expect(sddIdx).toBeLessThan(memIdx);

      fs.rmSync(memDir, { recursive: true, force: true });
    });

    it('should NOT inject OPENSPEC_SDD.md when toggle is disabled', () => {
      fs.writeFileSync(path.join(tmpDir, 'SYSTEM_PROMPT.md'), '');
      fs.writeFileSync(path.join(tmpDir, 'OPENSPEC_SDD.md'), 'OpenSpec content');
      fs.writeFileSync(path.join(tmpDir, 'CONFIG.json'), JSON.stringify({ openspecSddEnabled: false }));

      const result = composer.compose();
      expect(result).not.toContain('OpenSpec content');
    });

    it('should NOT inject OPENSPEC_SDD.md when CONFIG.json does not exist', () => {
      fs.writeFileSync(path.join(tmpDir, 'SYSTEM_PROMPT.md'), '');
      fs.writeFileSync(path.join(tmpDir, 'OPENSPEC_SDD.md'), 'OpenSpec content');

      const result = composer.compose();
      expect(result).not.toContain('OpenSpec content');
    });

    it('should skip empty OPENSPEC_SDD.md even when enabled', () => {
      fs.writeFileSync(path.join(tmpDir, 'SYSTEM_PROMPT.md'), '');
      fs.writeFileSync(path.join(tmpDir, 'OPENSPEC_SDD.md'), '');
      fs.writeFileSync(path.join(tmpDir, 'CONFIG.json'), JSON.stringify({ openspecSddEnabled: true }));

      const result = composer.compose();
      expect(result).toBe('');
    });

    it('should handle malformed CONFIG.json gracefully', () => {
      fs.writeFileSync(path.join(tmpDir, 'SYSTEM_PROMPT.md'), '');
      fs.writeFileSync(path.join(tmpDir, 'OPENSPEC_SDD.md'), 'OpenSpec content');
      fs.writeFileSync(path.join(tmpDir, 'CONFIG.json'), 'NOT VALID JSON');

      const result = composer.compose();
      expect(result).not.toContain('OpenSpec content');
    });
  });

  describe('MEMORY.md injection', () => {
    it('should include MEMORY.md content when memoryStore is provided', () => {
      const memDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-'));
      const memStore = new MemoryStore(memDir);
      memStore.ensureDirectories();
      memStore.writeMemory('- User prefers dark mode\n- Project uses pnpm');

      const composerWithMem = new PromptComposer(store, 50_000, memStore);
      fs.writeFileSync(path.join(tmpDir, 'SYSTEM_PROMPT.md'), '');
      fs.writeFileSync(path.join(tmpDir, 'PROFILE.md'), 'Profile');

      const result = composerWithMem.compose();
      expect(result).toContain('User prefers dark mode');
      expect(result).toContain('Project uses pnpm');

      fs.rmSync(memDir, { recursive: true, force: true });
    });

    it('should not include MEMORY.md section when empty', () => {
      const memDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-'));
      const memStore = new MemoryStore(memDir);
      memStore.ensureDirectories();

      const composerWithMem = new PromptComposer(store, 50_000, memStore);
      fs.writeFileSync(path.join(tmpDir, 'SYSTEM_PROMPT.md'), '');
      fs.writeFileSync(path.join(tmpDir, 'PROFILE.md'), 'Profile');

      const result = composerWithMem.compose();
      expect(result).toBe('Profile');

      fs.rmSync(memDir, { recursive: true, force: true });
    });

    it('should place MEMORY.md after PROFILE section', () => {
      const memDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-'));
      const memStore = new MemoryStore(memDir);
      memStore.ensureDirectories();
      memStore.writeMemory('Memory facts here');

      const composerWithMem = new PromptComposer(store, 50_000, memStore);
      fs.writeFileSync(path.join(tmpDir, 'SYSTEM_PROMPT.md'), '');
      fs.writeFileSync(path.join(tmpDir, 'PROFILE.md'), 'Profile');

      const result = composerWithMem.compose();
      expect(result.indexOf('Profile')).toBeLessThan(result.indexOf('Memory facts here'));

      fs.rmSync(memDir, { recursive: true, force: true });
    });
  });
});
