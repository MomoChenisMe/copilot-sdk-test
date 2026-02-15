import { apiGet, apiPut, apiDelete } from './api';

export interface PromptContent {
  content: string;
}

export interface PresetItem {
  name: string;
  content: string;
}

export interface PresetList {
  presets: PresetItem[];
}

export interface MemoryItem {
  name: string;
  content: string;
}

export interface MemoryItemList {
  items: MemoryItem[];
}

export const promptsApi = {
  getProfile: () => apiGet<PromptContent>('/api/prompts/profile'),
  putProfile: (content: string) => apiPut<{ ok: true }>('/api/prompts/profile', { content }),

  getAgent: () => apiGet<PromptContent>('/api/prompts/agent'),
  putAgent: (content: string) => apiPut<{ ok: true }>('/api/prompts/agent', { content }),

  listPresets: () => apiGet<PresetList>('/api/prompts/presets'),
  getPreset: (name: string) => apiGet<PromptContent>(`/api/prompts/presets/${name}`),
  putPreset: (name: string, content: string) => apiPut<{ ok: true }>(`/api/prompts/presets/${name}`, { content }),
  deletePreset: (name: string) => apiDelete<{ ok: true }>(`/api/prompts/presets/${name}`),
};

export const memoryApi = {
  getPreferences: () => apiGet<PromptContent>('/api/memory/preferences'),
  putPreferences: (content: string) => apiPut<{ ok: true }>('/api/memory/preferences', { content }),

  listProjects: () => apiGet<MemoryItemList>('/api/memory/projects'),
  getProject: (name: string) => apiGet<PromptContent>(`/api/memory/projects/${name}`),
  putProject: (name: string, content: string) => apiPut<{ ok: true }>(`/api/memory/projects/${name}`, { content }),
  deleteProject: (name: string) => apiDelete<{ ok: true }>(`/api/memory/projects/${name}`),

  listSolutions: () => apiGet<MemoryItemList>('/api/memory/solutions'),
  getSolution: (name: string) => apiGet<PromptContent>(`/api/memory/solutions/${name}`),
  putSolution: (name: string, content: string) => apiPut<{ ok: true }>(`/api/memory/solutions/${name}`, { content }),
  deleteSolution: (name: string) => apiDelete<{ ok: true }>(`/api/memory/solutions/${name}`),
};
