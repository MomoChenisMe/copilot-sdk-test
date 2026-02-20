import { describe, it, expect } from 'vitest';
import en from '../../src/locales/en.json';
import zhTW from '../../src/locales/zh-TW.json';

/** Helper to flatten nested JSON keys with dot notation */
function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return flattenKeys(value as Record<string, unknown>, fullKey);
    }
    return [fullKey];
  });
}

describe('i18n key completeness', () => {
  const enKeys = new Set(flattenKeys(en));
  const zhKeys = new Set(flattenKeys(zhTW));

  it('shortcuts.* keys exist in en.json', () => {
    const required = [
      'shortcuts.title',
      'shortcuts.newTab',
      'shortcuts.closeTab',
      'shortcuts.switchTab',
      'shortcuts.prevTab',
      'shortcuts.nextTab',
      'shortcuts.aiMode',
      'shortcuts.bashMode',
      'shortcuts.settings',
      'shortcuts.clearChat',
      'shortcuts.toggleTheme',
      'shortcuts.upload',
      'shortcuts.modelSelector',
      'shortcuts.showShortcuts',
    ];
    for (const key of required) {
      expect(enKeys.has(key), `Missing en key: ${key}`).toBe(true);
    }
  });

  it('shortcuts.* keys exist in zh-TW.json', () => {
    const required = [
      'shortcuts.title',
      'shortcuts.newTab',
      'shortcuts.closeTab',
      'shortcuts.switchTab',
      'shortcuts.prevTab',
      'shortcuts.nextTab',
      'shortcuts.aiMode',
      'shortcuts.bashMode',
      'shortcuts.settings',
      'shortcuts.clearChat',
      'shortcuts.toggleTheme',
      'shortcuts.upload',
      'shortcuts.modelSelector',
      'shortcuts.showShortcuts',
    ];
    for (const key of required) {
      expect(zhKeys.has(key), `Missing zh-TW key: ${key}`).toBe(true);
    }
  });

  it('common.* keys exist in both locales', () => {
    const required = ['common.close', 'common.delete', 'common.cancel'];
    for (const key of required) {
      expect(enKeys.has(key), `Missing en key: ${key}`).toBe(true);
      expect(zhKeys.has(key), `Missing zh-TW key: ${key}`).toBe(true);
    }
  });

  it('sidebar.deleteConfirm and sidebar.deleteConversation exist in both locales', () => {
    const required = ['sidebar.deleteConfirm', 'sidebar.deleteConversation'];
    for (const key of required) {
      expect(enKeys.has(key), `Missing en key: ${key}`).toBe(true);
      expect(zhKeys.has(key), `Missing zh-TW key: ${key}`).toBe(true);
    }
  });

  it('mcp.argsPlaceholder exists in both locales', () => {
    expect(enKeys.has('mcp.argsPlaceholder'), 'Missing en key: mcp.argsPlaceholder').toBe(true);
    expect(zhKeys.has('mcp.argsPlaceholder'), 'Missing zh-TW key: mcp.argsPlaceholder').toBe(true);
  });

  it('github.* keys exist in both locales', () => {
    const required = [
      'github.tab',
      'github.localTab',
      'github.loading',
      'github.cloning',
      'github.cloned',
      'github.alreadyCloned',
      'github.noRepos',
      'github.ghNotAvailable',
      'github.private',
      'github.searchRepos',
      'github.cloneError',
      'github.cloneTo',
      'github.cloneAndOpen',
      'github.openExisting',
      'github.back',
      'github.alreadyExists',
    ];
    for (const key of required) {
      expect(enKeys.has(key), `Missing en key: ${key}`).toBe(true);
      expect(zhKeys.has(key), `Missing zh-TW key: ${key}`).toBe(true);
    }
  });

  it('directoryPicker.* keys exist in both locales', () => {
    const required = [
      'directoryPicker.search',
      'directoryPicker.parent',
      'directoryPicker.empty',
      'directoryPicker.useCurrent',
      'directoryPicker.select',
      'directoryPicker.pathNotExist',
      'directoryPicker.cannotRead',
    ];
    for (const key of required) {
      expect(enKeys.has(key), `Missing en key: ${key}`).toBe(true);
      expect(zhKeys.has(key), `Missing zh-TW key: ${key}`).toBe(true);
    }
  });

  it('en.json and zh-TW.json have the same top-level key structure', () => {
    const enTopLevel = Object.keys(en).sort();
    const zhTopLevel = Object.keys(zhTW).sort();
    expect(enTopLevel).toEqual(zhTopLevel);
  });
});
