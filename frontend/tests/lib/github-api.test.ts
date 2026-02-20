import { describe, it, expect, vi, beforeEach } from 'vitest';
import { githubApi } from '../../src/lib/github-api';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    statusText: 'OK',
  });
}

describe('githubApi', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('status', () => {
    it('should call GET /api/github/status', async () => {
      mockFetch.mockReturnValue(jsonResponse({ available: true }));
      const result = await githubApi.status();
      expect(result.available).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/github/status', expect.objectContaining({ credentials: 'same-origin' }));
    });
  });

  describe('listRepos', () => {
    it('should call GET /api/github/repos', async () => {
      const repos = [{ name: 'repo1', nameWithOwner: 'user/repo1', description: null, isPrivate: false, url: 'https://github.com/user/repo1' }];
      mockFetch.mockReturnValue(jsonResponse({ repos }));
      const result = await githubApi.listRepos();
      expect(result.repos).toHaveLength(1);
      expect(result.repos[0].nameWithOwner).toBe('user/repo1');
    });
  });

  describe('cloneRepo', () => {
    it('should call POST /api/github/clone with nameWithOwner', async () => {
      mockFetch.mockReturnValue(jsonResponse({ path: '/home/user/Projects/user/repo1', alreadyExists: false }));
      const result = await githubApi.cloneRepo('user/repo1');
      expect(result.path).toContain('repo1');
      expect(result.alreadyExists).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/github/clone',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ nameWithOwner: 'user/repo1', targetPath: undefined }),
        }),
      );
    });

    it('should pass custom targetPath when provided', async () => {
      mockFetch.mockReturnValue(jsonResponse({ path: '/tmp/my-repo', alreadyExists: false }));
      const result = await githubApi.cloneRepo('user/repo1', '/tmp/my-repo');
      expect(result.path).toBe('/tmp/my-repo');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/github/clone',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ nameWithOwner: 'user/repo1', targetPath: '/tmp/my-repo' }),
        }),
      );
    });
  });
});
