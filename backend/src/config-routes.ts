import { Router } from 'express';
import type { PromptFileStore } from './prompts/file-store.js';

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

  return router;
}

/** Read the Brave API key from stored config (used at startup). */
export function readBraveApiKey(promptStore: PromptFileStore): string {
  const config = readConfig(promptStore);
  return (config.braveApiKey as string) ?? '';
}
