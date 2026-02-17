import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createWebSearchTool } from '../../src/copilot/tools/web-search.js';
import { PromptFileStore } from '../../src/prompts/file-store.js';

describe('Web Search integration with config', () => {
  let tmpDir: string;
  let promptStore: PromptFileStore;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'web-search-'));
    promptStore = new PromptFileStore(path.join(tmpDir, 'prompts'));
    promptStore.ensureDirectories();
  });

  it('should not create tool when no API key is stored', () => {
    const raw = promptStore.readFile('CONFIG.json');
    const config = raw ? JSON.parse(raw) : {};
    const tool = createWebSearchTool(config.braveApiKey);
    expect(tool).toBeNull();
  });

  it('should create tool when API key is stored in CONFIG.json', () => {
    promptStore.writeFile('CONFIG.json', JSON.stringify({ braveApiKey: 'test-key' }));
    const raw = promptStore.readFile('CONFIG.json');
    const config = JSON.parse(raw);
    const tool = createWebSearchTool(config.braveApiKey);
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('web_search');
  });

  it('should not create tool when API key is empty string', () => {
    promptStore.writeFile('CONFIG.json', JSON.stringify({ braveApiKey: '' }));
    const raw = promptStore.readFile('CONFIG.json');
    const config = JSON.parse(raw);
    const tool = createWebSearchTool(config.braveApiKey);
    expect(tool).toBeNull();
  });
});
