import { apiGet, apiPut, apiPost, apiDelete } from './api';

export interface PromptContent {
  content: string;
}

export const promptsApi = {
  getSystemPrompt: () => apiGet<PromptContent>('/api/prompts/system-prompt'),
  putSystemPrompt: (content: string) => apiPut<{ ok: true }>('/api/prompts/system-prompt', { content }),
  resetSystemPrompt: () => apiPost<PromptContent>('/api/prompts/system-prompt/reset'),

  getProfile: () => apiGet<PromptContent>('/api/prompts/profile'),
  putProfile: (content: string) => apiPut<{ ok: true }>('/api/prompts/profile', { content }),

  /** @deprecated Agent rules merged into PROFILE.md */
  getAgent: () => apiGet<PromptContent>('/api/prompts/agent'),
  /** @deprecated Agent rules merged into PROFILE.md */
  putAgent: (content: string) => apiPut<{ ok: true }>('/api/prompts/agent', { content }),

  getOpenspecSdd: () => apiGet<PromptContent>('/api/prompts/openspec-sdd'),
  putOpenspecSdd: (content: string) => apiPut<{ ok: true }>('/api/prompts/openspec-sdd', { content }),

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

/** @deprecated Memory preferences merged into PROFILE.md. Projects/solutions removed. */
export const memoryApi = {
  getPreferences: () => apiGet<PromptContent>('/api/memory/preferences'),
  putPreferences: (content: string) => apiPut<{ ok: true }>('/api/memory/preferences', { content }),
};
