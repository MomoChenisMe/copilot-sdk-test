import { describe, it, expect, beforeEach } from 'vitest';
import { migrateLocalStorageKeys } from '../../src/store/index';

const KEYS = [
  'lastSelectedModel',
  'openTabs',
  'activePresets',
  'disabledSkills',
];

describe('migrateLocalStorageKeys', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should copy ai-terminal:* keys to codeforge:* keys', () => {
    localStorage.setItem('ai-terminal:lastSelectedModel', 'gpt-4o');
    localStorage.setItem('ai-terminal:openTabs', '[{"id":"1","title":"Tab"}]');
    localStorage.setItem('ai-terminal:activePresets', '["concise"]');
    localStorage.setItem('ai-terminal:disabledSkills', '["git"]');

    migrateLocalStorageKeys();

    expect(localStorage.getItem('codeforge:lastSelectedModel')).toBe('gpt-4o');
    expect(localStorage.getItem('codeforge:openTabs')).toBe('[{"id":"1","title":"Tab"}]');
    expect(localStorage.getItem('codeforge:activePresets')).toBe('["concise"]');
    expect(localStorage.getItem('codeforge:disabledSkills')).toBe('["git"]');
  });

  it('should delete old ai-terminal:* keys after copying', () => {
    for (const suffix of KEYS) {
      localStorage.setItem(`ai-terminal:${suffix}`, 'value');
    }

    migrateLocalStorageKeys();

    for (const suffix of KEYS) {
      expect(localStorage.getItem(`ai-terminal:${suffix}`)).toBeNull();
    }
  });

  it('should NOT error when no old keys exist', () => {
    expect(() => migrateLocalStorageKeys()).not.toThrow();
    // codeforge keys should remain absent
    for (const suffix of KEYS) {
      expect(localStorage.getItem(`codeforge:${suffix}`)).toBeNull();
    }
  });

  it('should NOT overwrite if new keys already exist (migration already ran)', () => {
    localStorage.setItem('ai-terminal:lastSelectedModel', 'old-model');
    localStorage.setItem('codeforge:lastSelectedModel', 'already-migrated');

    migrateLocalStorageKeys();

    expect(localStorage.getItem('codeforge:lastSelectedModel')).toBe('already-migrated');
  });

  it('should still remove old key even if new key already exists', () => {
    localStorage.setItem('ai-terminal:openTabs', '[]');
    localStorage.setItem('codeforge:openTabs', '[{"id":"1"}]');

    migrateLocalStorageKeys();

    expect(localStorage.getItem('ai-terminal:openTabs')).toBeNull();
    expect(localStorage.getItem('codeforge:openTabs')).toBe('[{"id":"1"}]');
  });

  it('should handle partial migration (some keys present, some not)', () => {
    localStorage.setItem('ai-terminal:lastSelectedModel', 'gpt-4o');
    // No other ai-terminal keys exist

    migrateLocalStorageKeys();

    expect(localStorage.getItem('codeforge:lastSelectedModel')).toBe('gpt-4o');
    expect(localStorage.getItem('ai-terminal:lastSelectedModel')).toBeNull();
    expect(localStorage.getItem('codeforge:openTabs')).toBeNull();
  });
});
