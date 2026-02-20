import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { PromptComposer } from '../../src/prompts/composer.js';
import { PromptFileStore } from '../../src/prompts/file-store.js';

describe('PromptComposer — .codeforge.md support', () => {
  let tmpDir: string;
  let store: PromptFileStore;
  let composer: PromptComposer;
  let cwdDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-composer-cf-'));
    store = new PromptFileStore(tmpDir);
    store.ensureDirectories();
    composer = new PromptComposer(store);

    cwdDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cwd-cf-'));
    // Clear SYSTEM_PROMPT so it does not interfere
    fs.writeFileSync(path.join(tmpDir, 'SYSTEM_PROMPT.md'), '');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.rmSync(cwdDir, { recursive: true, force: true });
  });

  it('should read .codeforge.md when it exists', () => {
    fs.writeFileSync(path.join(cwdDir, '.codeforge.md'), 'CodeForge project rules');

    const result = composer.compose([], cwdDir);
    expect(result).toContain('CodeForge project rules');
  });

  it('should fall back to .ai-terminal.md when .codeforge.md does not exist', () => {
    fs.writeFileSync(path.join(cwdDir, '.ai-terminal.md'), 'Legacy project rules');

    const result = composer.compose([], cwdDir);
    expect(result).toContain('Legacy project rules');
  });

  it('should prefer .codeforge.md over .ai-terminal.md when both exist', () => {
    fs.writeFileSync(path.join(cwdDir, '.codeforge.md'), 'New rules');
    fs.writeFileSync(path.join(cwdDir, '.ai-terminal.md'), 'Old rules');

    const result = composer.compose([], cwdDir);
    expect(result).toContain('New rules');
    expect(result).not.toContain('Old rules');
  });

  it('should ignore both when neither file exists', () => {
    fs.writeFileSync(path.join(tmpDir, 'PROFILE.md'), 'Profile');

    const result = composer.compose([], cwdDir);
    expect(result).toBe('Profile');
  });

  it('should ignore both when cwd is not provided', () => {
    fs.writeFileSync(path.join(tmpDir, 'PROFILE.md'), 'Profile');

    const result = composer.compose([]);
    expect(result).toBe('Profile');
  });
});
