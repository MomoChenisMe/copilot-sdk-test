import { Router } from 'express';
import type { PromptFileStore } from './prompts/file-store.js';
import { DEFAULT_OPENSPEC_SDD } from './prompts/defaults.js';

const CONFIG_FILE = 'CONFIG.json';

function readConfig(store: PromptFileStore): Record<string, unknown> {
  const raw = store.readFile(CONFIG_FILE);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeConfig(store: PromptFileStore, config: Record<string, unknown>): void {
  store.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function maskKey(key: string): string {
  if (key.length <= 4) return '****';
  return key.slice(0, 4) + '*'.repeat(key.length - 4);
}

export interface ConfigRoutesOptions {
  onBraveApiKeyChange?: (newKey: string) => void;
}

export function createConfigRoutes(promptStore: PromptFileStore, options?: ConfigRoutesOptions): Router {
  const router = Router();

  router.get('/brave-api-key', (_req, res) => {
    const config = readConfig(promptStore);
    const key = (config.braveApiKey as string) ?? '';
    res.json({
      hasKey: !!key,
      maskedKey: key ? maskKey(key) : '',
    });
  });

  router.put('/brave-api-key', (req, res) => {
    const { apiKey } = req.body;
    const config = readConfig(promptStore);
    config.braveApiKey = apiKey ?? '';
    writeConfig(promptStore, config);
    options?.onBraveApiKeyChange?.(apiKey ?? '');
    res.json({ ok: true });
  });

  // --- OpenSpec SDD ---

  router.get('/openspec-sdd', (_req, res) => {
    const config = readConfig(promptStore);
    res.json({ enabled: Boolean(config.openspecSddEnabled) });
  });

  router.put('/openspec-sdd', (req, res) => {
    const enabled = Boolean(req.body.enabled);
    const config = readConfig(promptStore);
    config.openspecSddEnabled = enabled;
    writeConfig(promptStore, config);

    // Auto-create OPENSPEC_SDD.md from default template on first enable
    if (enabled) {
      const existing = promptStore.readFile('OPENSPEC_SDD.md');
      if (!existing.trim()) {
        promptStore.writeFile('OPENSPEC_SDD.md', DEFAULT_OPENSPEC_SDD);
      }
    }

    res.json({ ok: true });
  });

  return router;
}

/** Read the Brave API key from stored config (used at startup). */
export function readBraveApiKey(promptStore: PromptFileStore): string {
  const config = readConfig(promptStore);
  return (config.braveApiKey as string) ?? '';
}

/** Read the OpenSpec SDD toggle from stored config. */
export function readOpenspecSddEnabled(promptStore: PromptFileStore): boolean {
  const config = readConfig(promptStore);
  return Boolean(config.openspecSddEnabled);
}
