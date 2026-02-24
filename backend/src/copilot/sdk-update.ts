import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'node:module';
import { createLogger } from '../utils/logger.js';

const log = createLogger('sdk-update');

export class SdkUpdateChecker {
  getInstalledVersion(): string | null {
    // Strategy 1: Resolve main entry, then walk up to find package.json
    // (avoids ERR_PACKAGE_PATH_NOT_EXPORTED when exports field omits ./package.json)
    try {
      const require = createRequire(import.meta.url);
      const mainPath = require.resolve('@github/copilot-sdk');
      let dir = dirname(mainPath);
      while (dir !== dirname(dir)) {
        const candidate = resolve(dir, 'package.json');
        try {
          const pkg = JSON.parse(readFileSync(candidate, 'utf-8'));
          if (pkg.name === '@github/copilot-sdk') return pkg.version;
        } catch { /* continue walking up */ }
        dir = dirname(dir);
      }
    } catch (err) {
      log.debug({ err }, 'Failed to resolve SDK version via createRequire');
    }

    // Strategy 2: Try known candidate paths (backend/ and project root)
    const thisDir = dirname(fileURLToPath(import.meta.url));
    const candidates = [
      resolve(thisDir, '..', '..', 'node_modules', '@github', 'copilot-sdk', 'package.json'),
      resolve(thisDir, '..', '..', '..', 'node_modules', '@github', 'copilot-sdk', 'package.json'),
    ];
    for (const candidate of candidates) {
      try {
        const pkg = JSON.parse(readFileSync(candidate, 'utf-8'));
        return pkg.version;
      } catch {
        // Try next candidate
      }
    }

    log.warn('Could not find @github/copilot-sdk package.json in any known location');
    return null;
  }
}
