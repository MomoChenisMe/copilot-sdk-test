import { apiGet, apiPatch, apiPut } from './api';

export interface AppSettings {
  theme?: string;
  language?: string;
  lastSelectedModel?: string;
  disabledSkills?: string[];
  openTabs?: unknown[];
}

export const settingsApi = {
  get: () => apiGet<AppSettings>('/api/settings'),
  patch: (partial: Partial<AppSettings>) => apiPatch<AppSettings>('/api/settings', partial),
  put: (settings: AppSettings) => apiPut<{ ok: true }>('/api/settings', settings),
};
