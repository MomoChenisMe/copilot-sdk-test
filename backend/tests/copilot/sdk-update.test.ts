import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hoisted mocks
const { mockResolve, mockCreateRequire, mockLogDebug, mockLogWarn } = vi.hoisted(() => {
  const mockResolve = vi.fn();
  const mockCreateRequire = vi.fn(() => ({ resolve: mockResolve }));
  const mockLogDebug = vi.fn();
  const mockLogWarn = vi.fn();
  return { mockResolve, mockCreateRequire, mockLogDebug, mockLogWarn };
});

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    readFileSync: vi.fn(),
  };
});

// Mock node:module to control createRequire behavior
vi.mock('node:module', () => ({
  createRequire: mockCreateRequire,
}));

// Mock logger
vi.mock('../../src/utils/logger.js', () => ({
  createLogger: () => ({
    debug: mockLogDebug,
    warn: mockLogWarn,
    info: vi.fn(),
    error: vi.fn(),
  }),
}));

import { readFileSync } from 'fs';
import { SdkUpdateChecker } from '../../src/copilot/sdk-update.js';

describe('SdkUpdateChecker', () => {
  let checker: SdkUpdateChecker;

  beforeEach(() => {
    vi.clearAllMocks();
    checker = new SdkUpdateChecker();
  });

  describe('getInstalledVersion', () => {
    it('should resolve main entry and walk up to find package.json with correct name', () => {
      // Simulate: require.resolve('@github/copilot-sdk') → .../dist/index.js
      mockResolve.mockReturnValue('/fake/node_modules/@github/copilot-sdk/dist/index.js');

      (readFileSync as any).mockImplementation((path: string) => {
        // dist/package.json doesn't exist
        if (path === '/fake/node_modules/@github/copilot-sdk/dist/package.json') {
          throw new Error('ENOENT');
        }
        // copilot-sdk/package.json has the correct name
        if (path === '/fake/node_modules/@github/copilot-sdk/package.json') {
          return JSON.stringify({ name: '@github/copilot-sdk', version: '0.1.23' });
        }
        throw new Error('ENOENT');
      });

      const version = checker.getInstalledVersion();
      expect(version).toBe('0.1.23');
    });

    it('should skip package.json with wrong name and keep walking up', () => {
      mockResolve.mockReturnValue('/fake/node_modules/@github/copilot-sdk/dist/index.js');

      (readFileSync as any).mockImplementation((path: string) => {
        // dist/package.json exists but has wrong name (e.g., a nested dependency)
        if (path === '/fake/node_modules/@github/copilot-sdk/dist/package.json') {
          return JSON.stringify({ name: 'some-other-pkg', version: '1.0.0' });
        }
        // copilot-sdk/package.json has the correct name
        if (path === '/fake/node_modules/@github/copilot-sdk/package.json') {
          return JSON.stringify({ name: '@github/copilot-sdk', version: '0.1.23' });
        }
        throw new Error('ENOENT');
      });

      const version = checker.getInstalledVersion();
      expect(version).toBe('0.1.23');
    });

    it('should not throw ERR_PACKAGE_PATH_NOT_EXPORTED (resolves main entry, not package.json subpath)', () => {
      // The key fix: we resolve '@github/copilot-sdk' (main), not '@github/copilot-sdk/package.json'
      mockResolve.mockReturnValue('/fake/node_modules/@github/copilot-sdk/dist/index.js');
      (readFileSync as any).mockReturnValue(
        JSON.stringify({ name: '@github/copilot-sdk', version: '0.2.0' }),
      );

      const version = checker.getInstalledVersion();
      expect(version).toBe('0.2.0');
      expect(mockResolve).toHaveBeenCalledWith('@github/copilot-sdk');
    });

    it('should fallback to candidate paths when createRequire fails', () => {
      mockResolve.mockImplementation(() => { throw new Error('MODULE_NOT_FOUND'); });

      // Strategy 2: candidate paths
      (readFileSync as any).mockImplementation((path: string) => {
        if (path.includes('node_modules/@github/copilot-sdk/package.json')) {
          return JSON.stringify({ version: '0.1.23' });
        }
        throw new Error('ENOENT');
      });

      const version = checker.getInstalledVersion();
      expect(version).toBe('0.1.23');
    });

    it('should return null when package.json not found anywhere', () => {
      mockResolve.mockImplementation(() => { throw new Error('MODULE_NOT_FOUND'); });
      (readFileSync as any).mockImplementation(() => { throw new Error('ENOENT'); });

      const version = checker.getInstalledVersion();
      expect(version).toBeNull();
    });

    it('should log at DEBUG level when Strategy 1 fails but Strategy 2 succeeds', () => {
      mockResolve.mockImplementation(() => { throw new Error('ERR_PACKAGE_PATH_NOT_EXPORTED'); });
      (readFileSync as any).mockImplementation((path: string) => {
        if (path.includes('node_modules/@github/copilot-sdk/package.json')) {
          return JSON.stringify({ version: '0.1.23' });
        }
        throw new Error('ENOENT');
      });

      const version = checker.getInstalledVersion();
      expect(version).toBe('0.1.23');
      expect(mockLogDebug).toHaveBeenCalled();
      expect(mockLogWarn).not.toHaveBeenCalled();
    });

    it('should log at WARN level when both strategies fail', () => {
      mockResolve.mockImplementation(() => { throw new Error('MODULE_NOT_FOUND'); });
      (readFileSync as any).mockImplementation(() => { throw new Error('ENOENT'); });

      checker.getInstalledVersion();
      expect(mockLogWarn).toHaveBeenCalledWith(expect.stringContaining('Could not find'));
    });

    it('should NOT log debug or warn when Strategy 1 succeeds', () => {
      mockResolve.mockReturnValue('/fake/node_modules/@github/copilot-sdk/dist/index.js');
      (readFileSync as any).mockReturnValue(
        JSON.stringify({ name: '@github/copilot-sdk', version: '0.2.0' }),
      );

      const version = checker.getInstalledVersion();
      expect(version).toBe('0.2.0');
      expect(mockLogDebug).not.toHaveBeenCalled();
      expect(mockLogWarn).not.toHaveBeenCalled();
    });
  });
});
