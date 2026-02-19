import { readFileSync } from 'fs';
import { exec } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../utils/logger.js';

const log = createLogger('sdk-update');

const NPM_REGISTRY_URL = 'https://registry.npmjs.org/@github%2fcopilot-sdk';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export class SdkUpdateChecker {
  private latestVersionCache: { version: string; timestamp: number } | null = null;

  getInstalledVersion(): string | null {
    try {
      // Resolve from project root (two levels up from this file's directory)
      const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
      const pkgPath = resolve(projectRoot, 'node_modules', '@github', 'copilot-sdk', 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      return pkg.version;
    } catch {
      return null;
    }
  }

  async getLatestVersion(): Promise<string | null> {
    // Check cache
    if (this.latestVersionCache && Date.now() - this.latestVersionCache.timestamp < CACHE_TTL_MS) {
      return this.latestVersionCache.version;
    }

    try {
      const res = await fetch(NPM_REGISTRY_URL);
      if (!res.ok) return null;
      const data = await res.json();
      const version = data['dist-tags']?.latest ?? null;
      if (version) {
        this.latestVersionCache = { version, timestamp: Date.now() };
      }
      return version;
    } catch (err) {
      log.warn('Failed to fetch latest SDK version from npm registry', err);
      return null;
    }
  }

  async checkForUpdate(): Promise<{
    currentVersion: string | null;
    latestVersion: string | null;
    updateAvailable: boolean;
  }> {
    const currentVersion = this.getInstalledVersion();
    const latestVersion = await this.getLatestVersion();

    return {
      currentVersion,
      latestVersion,
      updateAvailable: !!(currentVersion && latestVersion && currentVersion !== latestVersion),
    };
  }

  async performUpdate(): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      exec(
        'npm update @github/copilot-sdk',
        { cwd: dirname(fileURLToPath(import.meta.url)) + '/../..' },
        (err, _stdout, _stderr) => {
          if (err) {
            log.error('SDK update failed:', err.message);
            resolve({ success: false, error: err.message });
          } else {
            log.info('SDK update completed successfully');
            resolve({ success: true });
          }
        },
      );
    });
  }
}
