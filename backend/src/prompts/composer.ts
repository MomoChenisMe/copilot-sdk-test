import fs from 'node:fs';
import path from 'node:path';
import type { PromptFileStore } from './file-store.js';
import type { MemoryStore } from '../memory/memory-store.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('prompt-composer');

const SEPARATOR = '\n\n---\n\n';
const DEFAULT_MAX_LENGTH = 50_000;

export class PromptComposer {
  constructor(
    private store: PromptFileStore,
    private maxPromptLength: number = DEFAULT_MAX_LENGTH,
    private memoryStore?: MemoryStore,
  ) {}

  compose(cwd?: string, locale?: string): string {
    const sections: string[] = [];

    // 1. SYSTEM_PROMPT.md
    const systemPrompt = this.store.readFile('SYSTEM_PROMPT.md');
    if (systemPrompt.trim()) sections.push(systemPrompt);

    // 2. PROFILE.md (includes merged agent rules + preferences)
    const profile = this.store.readFile('PROFILE.md');
    if (profile.trim()) sections.push(profile);

    // 3. OPENSPEC_SDD.md (conditionally injected based on CONFIG.json toggle)
    try {
      const rawConfig = this.store.readFile('CONFIG.json');
      const config = rawConfig ? JSON.parse(rawConfig) : {};
      if (config.openspecSddEnabled) {
        const openspecSdd = this.store.readFile('OPENSPEC_SDD.md');
        if (openspecSdd.trim()) sections.push(openspecSdd);
      }
    } catch {
      // CONFIG.json missing or malformed — skip silently
    }

    // 4. Auto-memory MEMORY.md
    if (this.memoryStore) {
      const memory = this.memoryStore.readMemory();
      if (memory.trim()) sections.push(memory);
    }

    // 5. .codeforge.md from cwd (falls back to .ai-terminal.md)
    if (cwd) {
      try {
        const codeforgePromptPath = path.join(cwd, '.codeforge.md');
        const projectPrompt = fs.readFileSync(codeforgePromptPath, 'utf-8');
        if (projectPrompt.trim()) sections.push(projectPrompt);
      } catch {
        // .codeforge.md not found — try legacy .ai-terminal.md
        try {
          const legacyPromptPath = path.join(cwd, '.ai-terminal.md');
          const legacyPrompt = fs.readFileSync(legacyPromptPath, 'utf-8');
          if (legacyPrompt.trim()) sections.push(legacyPrompt);
        } catch {
          // Neither file exists — skip silently
        }
      }
    }

    // 6. Locale / language instruction
    if (locale && locale !== 'en') {
      const LOCALE_NAMES: Record<string, string> = {
        'zh-TW': '繁體中文（台灣）',
        'zh-CN': '简体中文',
        'ja': '日本語',
        'ko': '한국어',
      };
      const langName = LOCALE_NAMES[locale] || locale;
      sections.push(`# Language\nAlways respond in ${langName}. Use ${langName} for all explanations, comments, and communications. Technical terms and code identifiers should remain in their original form.`);
    }

    let result = sections.join(SEPARATOR);

    // Truncate if exceeding max length
    if (result.length > this.maxPromptLength) {
      log.warn({ length: result.length, max: this.maxPromptLength }, 'System prompt truncated');
      result = result.slice(0, this.maxPromptLength) + '\n[... truncated]';
    }

    return result;
  }
}
