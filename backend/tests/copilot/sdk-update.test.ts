import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock child_process and fs
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    readFileSync: vi.fn(),
  };
});

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { readFileSync } from 'fs';
import { exec } from 'child_process';
import { SdkUpdateChecker } from '../../src/copilot/sdk-update.js';

describe('SdkUpdateChecker', () => {
  let checker: SdkUpdateChecker;

  beforeEach(() => {
    vi.clearAllMocks();
    checker = new SdkUpdateChecker();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getInstalledVersion', () => {
    it('should read version from node_modules package.json', () => {
      (readFileSync as any).mockReturnValue(JSON.stringify({ version: '0.1.23' }));

      const version = checker.getInstalledVersion();
      expect(version).toBe('0.1.23');
      expect(readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('@github/copilot-sdk/package.json'),
        'utf-8',
      );
    });

    it('should return null when package.json not found', () => {
      (readFileSync as any).mockImplementation(() => { throw new Error('ENOENT'); });

      const version = checker.getInstalledVersion();
      expect(version).toBeNull();
    });
  });

  describe('getLatestVersion', () => {
    it('should query npm registry and return latest version', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 'dist-tags': { latest: '0.2.0' } }),
      });

      const version = await checker.getLatestVersion();
      expect(version).toBe('0.2.0');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('@github%2fcopilot-sdk'),
      );
    });

    it('should return null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const version = await checker.getLatestVersion();
      expect(version).toBeNull();
    });

    it('should cache npm registry result for 1 hour', async () => {
      vi.useFakeTimers();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 'dist-tags': { latest: '0.2.0' } }),
      });

      await checker.getLatestVersion();
      await checker.getLatestVersion();
      expect(mockFetch).toHaveBeenCalledTimes(1); // cached

      // Advance past 1 hour
      vi.advanceTimersByTime(60 * 60 * 1000 + 1);

      await checker.getLatestVersion();
      expect(mockFetch).toHaveBeenCalledTimes(2); // re-fetched
    });
  });

  describe('checkForUpdate', () => {
    it('should return update info when newer version is available', async () => {
      (readFileSync as any).mockReturnValue(JSON.stringify({ version: '0.1.23' }));
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 'dist-tags': { latest: '0.2.0' } }),
      });

      const result = await checker.checkForUpdate();
      expect(result).toEqual({
        currentVersion: '0.1.23',
        latestVersion: '0.2.0',
        updateAvailable: true,
      });
    });

    it('should return no update when versions match', async () => {
      (readFileSync as any).mockReturnValue(JSON.stringify({ version: '0.2.0' }));
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 'dist-tags': { latest: '0.2.0' } }),
      });

      const result = await checker.checkForUpdate();
      expect(result).toEqual({
        currentVersion: '0.2.0',
        latestVersion: '0.2.0',
        updateAvailable: false,
      });
    });
  });

  describe('getChangelog', () => {
    it('should return changelog from GitHub Releases API on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { tag_name: 'v0.1.24', body: 'Fix bug A' },
            { tag_name: 'v0.1.25', body: 'Add feature B' },
            { tag_name: 'v0.1.23', body: 'Old release' },
          ]),
      });

      const result = await checker.getChangelog('0.1.23', '0.1.25');
      expect(result).toContain('v0.1.24');
      expect(result).toContain('Fix bug A');
      expect(result).toContain('v0.1.25');
      expect(result).toContain('Add feature B');
      expect(result).not.toContain('Old release');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('github.com/repos/'),
        expect.objectContaining({ headers: { Accept: 'application/vnd.github.v3+json' } }),
      );
    });

    it('should fallback to npm registry when GitHub API fails', async () => {
      // GitHub fails
      mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });
      // npm registry fallback succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ description: 'Copilot SDK', gitHead: 'abc123' }),
      });

      const result = await checker.getChangelog('0.1.23', '0.1.25');
      expect(result).toContain('Copilot SDK');
      expect(result).toContain('abc123');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should return null when both GitHub and npm fail', async () => {
      // GitHub fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      // npm fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await checker.getChangelog('0.1.23', '0.1.25');
      expect(result).toBeNull();
    });
  });

  describe('performUpdate', () => {
    it('should run npm update command', async () => {
      (exec as any).mockImplementation((_cmd: string, _opts: any, cb: Function) => {
        cb(null, 'updated', '');
      });

      const result = await checker.performUpdate();
      expect(result.success).toBe(true);
      expect(exec).toHaveBeenCalledWith(
        expect.stringContaining('npm update @github/copilot-sdk'),
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should return failure on exec error', async () => {
      (exec as any).mockImplementation((_cmd: string, _opts: any, cb: Function) => {
        cb(new Error('npm failed'), '', 'error output');
      });

      const result = await checker.performUpdate();
      expect(result.success).toBe(false);
      expect(result.error).toBe('npm failed');
    });
  });
});
