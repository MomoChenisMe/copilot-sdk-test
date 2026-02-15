import fs from 'node:fs';
import path from 'node:path';
import type { PromptFileStore } from './file-store.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('prompt-composer');

const SEPARATOR = '\n\n---\n\n';
const DEFAULT_MAX_LENGTH = 50_000;

export class PromptComposer {
  constructor(
    private store: PromptFileStore,
    private maxPromptLength: number = DEFAULT_MAX_LENGTH,
  ) {}

  compose(activePresets: string[], cwd?: string): string {
    const sections: string[] = [];

    // 1. PROFILE.md
    const profile = this.store.readFile('PROFILE.md');
    if (profile.trim()) sections.push(profile);

    // 2. AGENT.md
    const agent = this.store.readFile('AGENT.md');
    if (agent.trim()) sections.push(agent);

    // 3. Active presets (alphabetical order)
    const sortedPresets = [...activePresets].sort();
    for (const name of sortedPresets) {
      const content = this.store.readFile(`presets/${name}.md`);
      if (content.trim()) sections.push(content);
    }

    // 4. memory/preferences.md
    const preferences = this.store.readFile('memory/preferences.md');
    if (preferences.trim()) sections.push(preferences);

    // 5. .ai-terminal.md from cwd
    if (cwd) {
      try {
        const projectPromptPath = path.join(cwd, '.ai-terminal.md');
        const projectPrompt = fs.readFileSync(projectPromptPath, 'utf-8');
        if (projectPrompt.trim()) sections.push(projectPrompt);
      } catch {
        // File doesn't exist or can't be read - skip silently
      }
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
