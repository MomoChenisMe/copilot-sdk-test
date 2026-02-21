import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { settingsApi } from '../../src/lib/settings-api';

describe('settingsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('get()', () => {
    it('should GET /api/settings', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ theme: 'dark', language: 'zh-TW' }),
      });
      const result = await settingsApi.get();
      expect(result.theme).toBe('dark');
      expect(result.language).toBe('zh-TW');
      expect(mockFetch).toHaveBeenCalledWith('/api/settings', expect.objectContaining({ credentials: 'same-origin' }));
    });
  });

  describe('patch()', () => {
    it('should PATCH /api/settings with partial data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ theme: 'dark', language: 'zh-TW' }),
      });
      const result = await settingsApi.patch({ language: 'zh-TW' });
      expect(result.language).toBe('zh-TW');
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: 'zh-TW' }),
        }),
      );
    });
  });

  describe('put()', () => {
    it('should PUT /api/settings with full data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });
      const result = await settingsApi.put({ theme: 'light' });
      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ theme: 'light' }),
        }),
      );
    });
  });
});
