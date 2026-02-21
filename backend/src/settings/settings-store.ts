import type { PromptFileStore } from '../prompts/file-store.js';

const SETTINGS_FILE = 'SETTINGS.json';

export interface AppSettings {
  theme?: string;
  language?: string;
  lastSelectedModel?: string;
  disabledSkills?: string[];
  openTabs?: unknown[];
}

const DEFAULTS: AppSettings = {};

export class SettingsStore {
  constructor(private fileStore: PromptFileStore) {}

  read(): AppSettings {
    const raw = this.fileStore.readFile(SETTINGS_FILE);
    if (!raw) return { ...DEFAULTS };
    try {
      return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULTS };
    }
  }

  write(settings: AppSettings): void {
    this.fileStore.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  }

  patch(partial: Partial<AppSettings>): AppSettings {
    const current = this.read();
    const merged = { ...current, ...partial };
    this.write(merged);
    return merged;
  }
}
