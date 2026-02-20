import { apiGet, apiPut, apiDelete, apiPost } from './api';

export interface PromptContent {
  content: string;
}

export interface MemoryItem {
  name: string;
  content: string;
}

export interface MemoryItemList {
  items: MemoryItem[];
}

export const promptsApi = {
  getSystemPrompt: () => apiGet<PromptContent>('/api/prompts/system-prompt'),
  putSystemPrompt: (content: string) => apiPut<{ ok: true }>('/api/prompts/system-prompt', { content }),
  resetSystemPrompt: () => apiPost<PromptContent>('/api/prompts/system-prompt/reset'),

  getProfile: () => apiGet<PromptContent>('/api/prompts/profile'),
  putProfile: (content: string) => apiPut<{ ok: true }>('/api/prompts/profile', { content }),

  getAgent: () => apiGet<PromptContent>('/api/prompts/agent'),
  putAgent: (content: string) => apiPut<{ ok: true }>('/api/prompts/agent', { content }),

};

export interface SkillItem {
  name: string;
  description: string;
  content: string;
  builtin: boolean;
}

export interface SkillList {
  skills: SkillItem[];
}

export interface SkillInstallResult {
  ok: true;
  name: string;
  description: string;
}

export const skillsApi = {
  list: () => apiGet<SkillList>('/api/skills'),
  get: (name: string) => apiGet<SkillItem>(`/api/skills/${name}`),
  put: (name: string, description: string, content: string) => apiPut<{ ok: true }>(`/api/skills/${name}`, { description, content }),
  delete: (name: string) => apiDelete<{ ok: true }>(`/api/skills/${name}`),

  /** Upload a ZIP skill package */
  upload: async (file: File): Promise<SkillInstallResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/skills/upload', {
      method: 'POST',
      body: formData,
      credentials: 'same-origin',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(data.error ?? 'Upload failed');
    }
    return res.json();
  },

  /** Install a skill from a URL */
  installFromUrl: (url: string) => apiPost<SkillInstallResult>('/api/skills/install-url', { url }),
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
