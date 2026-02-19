import type { MemoryLlmCaller } from './llm-caller.js';
import type { MemoryStore } from './memory-store.js';
import type { MemoryIndex } from './memory-index.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('memory-compactor');

export interface CompactionResult {
  beforeCount: number;
  afterCount: number;
}

export interface CompactorOptions {
  factCountThreshold: number;
}

const SYSTEM_PROMPT = `You are a memory compaction assistant. Your job is to consolidate, deduplicate, and organize a list of remembered facts about the user.

Rules:
- Merge duplicate or very similar facts into one
- Remove outdated facts that have been superseded
- Keep all unique, valuable information
- Output as a markdown bullet list (each line starts with "- ")
- Organize by topic if possible
- Be concise but preserve important details
- Do NOT add facts that weren't in the original list`;

export class MemoryCompactor {
  private isRunning = false;
  private lastCompactionAt = 0;
  private readonly minIntervalMs = 5 * 60 * 1000; // 5-minute cooldown
  private options: CompactorOptions;

  constructor(
    private llmCaller: MemoryLlmCaller,
    private store: MemoryStore,
    private index: MemoryIndex,
    options?: Partial<CompactorOptions>,
  ) {
    this.options = {
      factCountThreshold: options?.factCountThreshold ?? 30,
    };
  }

  shouldCompact(): boolean {
    if (this.isRunning) return false;

    const now = Date.now();
    if (this.lastCompactionAt && now - this.lastCompactionAt < this.minIntervalMs) {
      return false;
    }

    const stats = this.index.getStats();
    return stats.totalFacts >= this.options.factCountThreshold;
  }

  markCompacted(): void {
    this.lastCompactionAt = Date.now();
  }

  async compact(): Promise<CompactionResult | null> {
    if (this.isRunning) return null;
    this.isRunning = true;

    try {
      const allFacts = this.index.getAllFacts();
      const beforeCount = allFacts.length;

      const factList = allFacts.map((f) => `- ${f.content}`).join('\n');
      const prompt = `Consolidate and organize these ${beforeCount} facts:\n\n${factList}`;

      const response = await this.llmCaller.call(SYSTEM_PROMPT, prompt);

      if (!response) {
        log.debug('LLM unavailable for compaction');
        return null;
      }

      // Validate: must contain at least one bullet point
      if (!response.includes('- ')) {
        log.debug('Compaction result has no bullet points, rejecting');
        return null;
      }

      const trimmed = response.trim();
      const afterCount = trimmed.split('\n').filter((l) => l.startsWith('- ')).length;

      // Atomic write
      this.store.writeMemory(trimmed);
      this.index.reindexFromFiles(this.store);

      this.markCompacted();

      return { beforeCount, afterCount };
    } catch (err) {
      log.debug({ err }, 'Compaction failed');
      return null;
    } finally {
      this.isRunning = false;
    }
  }
}
