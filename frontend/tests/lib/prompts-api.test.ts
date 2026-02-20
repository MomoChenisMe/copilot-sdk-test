import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { promptsApi, memoryApi, skillsApi } from '../../src/lib/prompts-api';

function mockResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
  };
}

describe('promptsApi', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('systemPrompt', () => {
    it('getSystemPrompt calls GET /api/prompts/system-prompt', async () => {
      mockFetch.mockResolvedValue(mockResponse({ content: '# System Prompt' }));

      const result = await promptsApi.getSystemPrompt();

      expect(mockFetch).toHaveBeenCalledWith('/api/prompts/system-prompt', expect.objectContaining({
        credentials: 'same-origin',
      }));
      expect(result).toEqual({ content: '# System Prompt' });
    });

    it('putSystemPrompt calls PUT /api/prompts/system-prompt with content', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: true }));

      await promptsApi.putSystemPrompt('Updated system prompt');

      expect(mockFetch).toHaveBeenCalledWith('/api/prompts/system-prompt', expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Updated system prompt' }),
      }));
    });

    it('resetSystemPrompt calls POST /api/prompts/system-prompt/reset', async () => {
      mockFetch.mockResolvedValue(mockResponse({ content: '# Default Prompt' }));

      const result = await promptsApi.resetSystemPrompt();

      expect(mockFetch).toHaveBeenCalledWith('/api/prompts/system-prompt/reset', expect.objectContaining({
        method: 'POST',
      }));
      expect(result).toEqual({ content: '# Default Prompt' });
    });
  });

  describe('profile', () => {
    it('getProfile calls GET /api/prompts/profile', async () => {
      mockFetch.mockResolvedValue(mockResponse({ content: '# My Profile' }));

      const result = await promptsApi.getProfile();

      expect(mockFetch).toHaveBeenCalledWith('/api/prompts/profile', expect.objectContaining({
        credentials: 'same-origin',
      }));
      expect(result).toEqual({ content: '# My Profile' });
    });

    it('putProfile calls PUT /api/prompts/profile with content', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: true }));

      await promptsApi.putProfile('Updated profile');

      expect(mockFetch).toHaveBeenCalledWith('/api/prompts/profile', expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Updated profile' }),
      }));
    });
  });

  describe('agent', () => {
    it('getAgent calls GET /api/prompts/agent', async () => {
      mockFetch.mockResolvedValue(mockResponse({ content: '# Agent rules' }));

      const result = await promptsApi.getAgent();

      expect(mockFetch).toHaveBeenCalledWith('/api/prompts/agent', expect.objectContaining({
        credentials: 'same-origin',
      }));
      expect(result).toEqual({ content: '# Agent rules' });
    });

    it('putAgent calls PUT /api/prompts/agent with content', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: true }));

      await promptsApi.putAgent('New agent rules');

      expect(mockFetch).toHaveBeenCalledWith('/api/prompts/agent', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ content: 'New agent rules' }),
      }));
    });
  });

  describe('error handling', () => {
    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValue(mockResponse({ error: 'Not found' }, false, 404));

      await expect(promptsApi.getSystemPrompt()).rejects.toThrow();
    });
  });
});

describe('memoryApi', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('preferences', () => {
    it('getPreferences calls GET /api/memory/preferences', async () => {
      mockFetch.mockResolvedValue(mockResponse({ content: '# Prefs' }));

      const result = await memoryApi.getPreferences();

      expect(mockFetch).toHaveBeenCalledWith('/api/memory/preferences', expect.objectContaining({
        credentials: 'same-origin',
      }));
      expect(result).toEqual({ content: '# Prefs' });
    });

    it('putPreferences calls PUT /api/memory/preferences', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: true }));

      await memoryApi.putPreferences('New prefs');

      expect(mockFetch).toHaveBeenCalledWith('/api/memory/preferences', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ content: 'New prefs' }),
      }));
    });
  });

  describe('projects', () => {
    it('listProjects calls GET /api/memory/projects', async () => {
      const data = { items: [{ name: 'proj-1', content: 'Desc' }] };
      mockFetch.mockResolvedValue(mockResponse(data));

      const result = await memoryApi.listProjects();

      expect(mockFetch).toHaveBeenCalledWith('/api/memory/projects', expect.objectContaining({
        credentials: 'same-origin',
      }));
      expect(result).toEqual(data);
    });

    it('putProject calls PUT /api/memory/projects/:name', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: true }));

      await memoryApi.putProject('my-project', 'Project notes');

      expect(mockFetch).toHaveBeenCalledWith('/api/memory/projects/my-project', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ content: 'Project notes' }),
      }));
    });

    it('deleteProject calls DELETE /api/memory/projects/:name', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: true }));

      await memoryApi.deleteProject('old-proj');

      expect(mockFetch).toHaveBeenCalledWith('/api/memory/projects/old-proj', expect.objectContaining({
        method: 'DELETE',
      }));
    });
  });

  describe('solutions', () => {
    it('listSolutions calls GET /api/memory/solutions', async () => {
      const data = { items: [{ name: 'fix-1', content: 'Steps' }] };
      mockFetch.mockResolvedValue(mockResponse(data));

      const result = await memoryApi.listSolutions();

      expect(result).toEqual(data);
    });

    it('putSolution calls PUT /api/memory/solutions/:name', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: true }));

      await memoryApi.putSolution('cache-fix', 'Solution steps');

      expect(mockFetch).toHaveBeenCalledWith('/api/memory/solutions/cache-fix', expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ content: 'Solution steps' }),
      }));
    });

    it('deleteSolution calls DELETE /api/memory/solutions/:name', async () => {
      mockFetch.mockResolvedValue(mockResponse({ ok: true }));

      await memoryApi.deleteSolution('old-fix');

      expect(mockFetch).toHaveBeenCalledWith('/api/memory/solutions/old-fix', expect.objectContaining({
        method: 'DELETE',
      }));
    });
  });
});

describe('skillsApi', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('list calls GET /api/skills', async () => {
    const data = { skills: [{ name: 'my-skill', description: 'A skill', content: '# Skill' }] };
    mockFetch.mockResolvedValue(mockResponse(data));

    const result = await skillsApi.list();

    expect(mockFetch).toHaveBeenCalledWith('/api/skills', expect.objectContaining({
      credentials: 'same-origin',
    }));
    expect(result).toEqual(data);
  });

  it('get calls GET /api/skills/:name', async () => {
    mockFetch.mockResolvedValue(mockResponse({ name: 'my-skill', description: 'A skill', content: '# Skill' }));

    const result = await skillsApi.get('my-skill');

    expect(mockFetch).toHaveBeenCalledWith('/api/skills/my-skill', expect.objectContaining({
      credentials: 'same-origin',
    }));
    expect(result).toEqual({ name: 'my-skill', description: 'A skill', content: '# Skill' });
  });

  it('put calls PUT /api/skills/:name with description and content', async () => {
    mockFetch.mockResolvedValue(mockResponse({ ok: true }));

    await skillsApi.put('my-skill', 'Updated description', '# Updated Skill');

    expect(mockFetch).toHaveBeenCalledWith('/api/skills/my-skill', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ description: 'Updated description', content: '# Updated Skill' }),
    }));
  });

  it('delete calls DELETE /api/skills/:name', async () => {
    mockFetch.mockResolvedValue(mockResponse({ ok: true }));

    await skillsApi.delete('old-skill');

    expect(mockFetch).toHaveBeenCalledWith('/api/skills/old-skill', expect.objectContaining({
      method: 'DELETE',
    }));
  });
});
