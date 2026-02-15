import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { PromptFileStore, sanitizeName } from '../../src/prompts/file-store.js';

describe('sanitizeName', () => {
  it('should accept valid names', () => {
    expect(sanitizeName('code-review')).toBe('code-review');
    expect(sanitizeName('my_preset')).toBe('my_preset');
    expect(sanitizeName('Test123')).toBe('Test123');
  });

  it('should replace spaces and special chars with dashes', () => {
    expect(sanitizeName('my preset')).toBe('my-preset');
    expect(sanitizeName('foo@bar!')).toBe('foo-bar-');
  });

  it('should reject path traversal attempts', () => {
    expect(() => sanitizeName('../etc/passwd')).toThrow('Invalid');
    expect(() => sanitizeName('..\\windows')).toThrow('Invalid');
    expect(() => sanitizeName('foo/bar')).toThrow('Invalid');
    expect(() => sanitizeName('foo\\bar')).toThrow('Invalid');
  });

  it('should reject null bytes', () => {
    expect(() => sanitizeName('foo\0bar')).toThrow('Invalid');
  });

  it('should reject empty or whitespace-only names', () => {
    expect(() => sanitizeName('')).toThrow('Invalid');
    expect(() => sanitizeName('   ')).toThrow('Invalid');
  });
});

describe('PromptFileStore', () => {
  let tmpDir: string;
  let store: PromptFileStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-store-'));
    store = new PromptFileStore(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('ensureDirectories', () => {
    it('should create prompt directory structure', () => {
      store.ensureDirectories();

      expect(fs.existsSync(path.join(tmpDir, 'PROFILE.md'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'AGENT.md'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'presets'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'memory'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'memory', 'preferences.md'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'memory', 'projects'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'memory', 'solutions'))).toBe(true);
    });

    it('should not overwrite existing files', () => {
      store.ensureDirectories();
      fs.writeFileSync(path.join(tmpDir, 'PROFILE.md'), 'existing content');
      store.ensureDirectories();
      expect(fs.readFileSync(path.join(tmpDir, 'PROFILE.md'), 'utf-8')).toBe('existing content');
    });

    it('should be idempotent (no error when called twice)', () => {
      store.ensureDirectories();
      expect(() => store.ensureDirectories()).not.toThrow();
    });
  });

  describe('readFile', () => {
    it('should read an existing file', () => {
      store.ensureDirectories();
      fs.writeFileSync(path.join(tmpDir, 'PROFILE.md'), 'Hello World');
      expect(store.readFile('PROFILE.md')).toBe('Hello World');
    });

    it('should return empty string for non-existent file', () => {
      expect(store.readFile('nonexistent.md')).toBe('');
    });
  });

  describe('writeFile', () => {
    it('should write content to file', () => {
      store.ensureDirectories();
      store.writeFile('PROFILE.md', 'New content');
      expect(fs.readFileSync(path.join(tmpDir, 'PROFILE.md'), 'utf-8')).toBe('New content');
    });

    it('should overwrite existing content', () => {
      store.ensureDirectories();
      store.writeFile('PROFILE.md', 'First');
      store.writeFile('PROFILE.md', 'Second');
      expect(fs.readFileSync(path.join(tmpDir, 'PROFILE.md'), 'utf-8')).toBe('Second');
    });
  });

  describe('deleteFile', () => {
    it('should delete an existing file', () => {
      store.ensureDirectories();
      fs.writeFileSync(path.join(tmpDir, 'presets', 'test.md'), 'content');
      store.deleteFile(path.join('presets', 'test.md'));
      expect(fs.existsSync(path.join(tmpDir, 'presets', 'test.md'))).toBe(false);
    });

    it('should not throw for non-existent file', () => {
      expect(() => store.deleteFile('nonexistent.md')).not.toThrow();
    });
  });

  describe('listFiles', () => {
    it('should list .md files in a subdirectory', () => {
      store.ensureDirectories();
      fs.writeFileSync(path.join(tmpDir, 'presets', 'code-review.md'), 'review');
      fs.writeFileSync(path.join(tmpDir, 'presets', 'devops.md'), 'ops');
      const files = store.listFiles('presets');
      expect(files).toContain('code-review');
      expect(files).toContain('devops');
      expect(files.length).toBe(2);
    });

    it('should return empty array when directory is empty', () => {
      store.ensureDirectories();
      expect(store.listFiles('presets')).toEqual([]);
    });

    it('should return empty array when directory does not exist', () => {
      expect(store.listFiles('nonexistent')).toEqual([]);
    });
  });
});
