import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { PromptComposer } from '../../src/prompts/composer.js';
import { PromptFileStore } from '../../src/prompts/file-store.js';

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

  it('should compose in order: PROFILE → AGENT → presets → preferences → .ai-terminal.md', () => {
    fs.writeFileSync(path.join(tmpDir, 'PROFILE.md'), 'Profile content');
    fs.writeFileSync(path.join(tmpDir, 'AGENT.md'), 'Agent content');
    fs.writeFileSync(path.join(tmpDir, 'presets', 'alpha.md'), 'Alpha preset');
    fs.writeFileSync(path.join(tmpDir, 'memory', 'preferences.md'), 'Preferences content');

    const result = composer.compose(['alpha']);
    const sections = result.split('\n\n---\n\n');
    expect(sections[0]).toBe('Profile content');
    expect(sections[1]).toBe('Agent content');
    expect(sections[2]).toBe('Alpha preset');
    expect(sections[3]).toBe('Preferences content');
  });

  it('should include presets in alphabetical order', () => {
    fs.writeFileSync(path.join(tmpDir, 'presets', 'zebra.md'), 'Zebra');
    fs.writeFileSync(path.join(tmpDir, 'presets', 'alpha.md'), 'Alpha');

    const result = composer.compose(['zebra', 'alpha']);
    expect(result.indexOf('Alpha')).toBeLessThan(result.indexOf('Zebra'));
  });

  it('should skip empty sections (no extra separators)', () => {
    // Only PROFILE has content
    fs.writeFileSync(path.join(tmpDir, 'PROFILE.md'), 'Profile only');
    // AGENT.md is empty (created by ensureDirectories)

    const result = composer.compose([]);
    expect(result).toBe('Profile only');
    expect(result).not.toContain('---');
  });

  it('should return empty string when all sections are empty', () => {
    const result = composer.compose([]);
    expect(result).toBe('');
  });

  it('should skip whitespace-only sections', () => {
    fs.writeFileSync(path.join(tmpDir, 'PROFILE.md'), '   \n  ');
    fs.writeFileSync(path.join(tmpDir, 'AGENT.md'), 'Agent rules');

    const result = composer.compose([]);
    expect(result).toBe('Agent rules');
  });

  it('should truncate when exceeding maxPromptLength', () => {
    const longContent = 'A'.repeat(200);
    fs.writeFileSync(path.join(tmpDir, 'PROFILE.md'), longContent);

    const shortComposer = new PromptComposer(store, 100);
    const result = shortComposer.compose([]);
    expect(result.length).toBeLessThanOrEqual(116); // 100 + '\n[... truncated]'.length
    expect(result).toContain('[... truncated]');
  });

  it('should include .ai-terminal.md from cwd when provided', () => {
    const cwdDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cwd-'));
    fs.writeFileSync(path.join(cwdDir, '.ai-terminal.md'), 'Project rules');
    fs.writeFileSync(path.join(tmpDir, 'PROFILE.md'), 'Profile');

    const result = composer.compose([], cwdDir);
    expect(result).toContain('Project rules');
    expect(result).toContain('Profile');

    fs.rmSync(cwdDir, { recursive: true, force: true });
  });

  it('should skip .ai-terminal.md when file does not exist', () => {
    fs.writeFileSync(path.join(tmpDir, 'PROFILE.md'), 'Profile');

    const result = composer.compose([], '/nonexistent-dir');
    expect(result).toBe('Profile');
  });

  it('should only include active presets, not all presets in directory', () => {
    fs.writeFileSync(path.join(tmpDir, 'presets', 'active.md'), 'Active preset');
    fs.writeFileSync(path.join(tmpDir, 'presets', 'inactive.md'), 'Inactive preset');

    const result = composer.compose(['active']);
    expect(result).toContain('Active preset');
    expect(result).not.toContain('Inactive preset');
  });
});
