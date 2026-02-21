import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { PromptFileStore } from '../../src/prompts/file-store.js';
import { SettingsStore } from '../../src/settings/settings-store.js';

describe('SettingsStore', () => {
  let tmpDir: string;
  let promptStore: PromptFileStore;
  let settingsStore: SettingsStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'settings-store-'));
    promptStore = new PromptFileStore(path.join(tmpDir, 'prompts'));
    promptStore.ensureDirectories();
    settingsStore = new SettingsStore(promptStore);
  });

  describe('read()', () => {
    it('should return defaults when no settings file exists', () => {
      const settings = settingsStore.read();
      expect(settings).toEqual({});
    });

    it('should return stored settings', () => {
      promptStore.writeFile('SETTINGS.json', JSON.stringify({ theme: 'dark', language: 'zh-TW' }));
      const settings = settingsStore.read();
      expect(settings.theme).toBe('dark');
      expect(settings.language).toBe('zh-TW');
    });

    it('should return defaults for malformed JSON', () => {
      promptStore.writeFile('SETTINGS.json', 'not-json');
      const settings = settingsStore.read();
      expect(settings).toEqual({});
    });
  });

  describe('write()', () => {
    it('should persist settings to file', () => {
      settingsStore.write({ theme: 'light', language: 'en' });
      const raw = promptStore.readFile('SETTINGS.json');
      const parsed = JSON.parse(raw);
      expect(parsed.theme).toBe('light');
      expect(parsed.language).toBe('en');
    });

    it('should overwrite existing settings', () => {
      settingsStore.write({ theme: 'dark' });
      settingsStore.write({ theme: 'light', language: 'zh-TW' });
      const settings = settingsStore.read();
      expect(settings.theme).toBe('light');
      expect(settings.language).toBe('zh-TW');
    });
  });

  describe('patch()', () => {
    it('should merge partial settings into existing', () => {
      settingsStore.write({ theme: 'dark', language: 'en' });
      const result = settingsStore.patch({ language: 'zh-TW' });
      expect(result.theme).toBe('dark');
      expect(result.language).toBe('zh-TW');
    });

    it('should create settings when none exist', () => {
      const result = settingsStore.patch({ theme: 'dark' });
      expect(result.theme).toBe('dark');
      // Verify persistence
      const settings = settingsStore.read();
      expect(settings.theme).toBe('dark');
    });

    it('should preserve disabledSkills array', () => {
      settingsStore.write({ disabledSkills: ['skill-a', 'skill-b'] });
      const result = settingsStore.patch({ theme: 'light' });
      expect(result.disabledSkills).toEqual(['skill-a', 'skill-b']);
      expect(result.theme).toBe('light');
    });

    it('should return the merged result', () => {
      settingsStore.write({ theme: 'dark', lastSelectedModel: 'gpt-4o' });
      const result = settingsStore.patch({ lastSelectedModel: 'claude-3.5-sonnet' });
      expect(result.theme).toBe('dark');
      expect(result.lastSelectedModel).toBe('claude-3.5-sonnet');
    });
  });
});
