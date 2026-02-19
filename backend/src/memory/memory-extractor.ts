import type { MemoryStore } from './memory-store.js';
import type { MemoryIndex } from './memory-index.js';
import type { MemoryQualityGate } from './memory-gating.js';
import type { LlmMemoryExtractor } from './llm-extractor.js';

export interface ExtractorOptions {
  extractIntervalSeconds: number;
  minNewMessages: number;
}

export interface ReconcileAction {
  action: 'add' | 'update' | 'delete';
  id?: string;
  content: string;
  category: string;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Keywords that suggest a user preference or memorable fact
const PREFERENCE_PATTERNS = [
  /\b(prefer|always use|never use|like|dislike|remember that|my .+ is|i use|switch to|favorite)\b/i,
  /\b(project uses?|stack is|deploy|framework|language|editor|tool)\b/i,
];

export class MemoryExtractor {
  private lastExtracted = new Map<string, number>();
  private options: ExtractorOptions;

  constructor(
    private store: MemoryStore,
    private index: MemoryIndex,
    options: Partial<ExtractorOptions> = {},
    private qualityGate?: MemoryQualityGate,
    private llmExtractor?: LlmMemoryExtractor,
  ) {
    this.options = {
      extractIntervalSeconds: options.extractIntervalSeconds ?? 60,
      minNewMessages: options.minNewMessages ?? 4,
    };
  }

  /**
   * Extract candidate facts from conversation messages.
   * This is a local heuristic — no LLM call needed.
   */
  extractCandidates(messages: ConversationMessage[]): string[] {
    if (messages.length === 0) return [];

    const candidates: string[] = [];

    for (const msg of messages) {
      if (msg.role !== 'user') continue;
      const content = msg.content.trim();
      if (!content || content.length < 10) continue;

      // Check if message contains preference-like patterns
      const isPreference = PREFERENCE_PATTERNS.some((p) => p.test(content));
      if (isPreference) {
        // Extract the full sentence as a candidate fact
        const sentences = content
          .split(/[.!?\n]/)
          .map((s) => s.trim())
          .filter((s) => s.length >= 10);

        for (const sentence of sentences) {
          if (PREFERENCE_PATTERNS.some((p) => p.test(sentence))) {
            candidates.push(sentence);
          }
        }
      }
    }

    return candidates;
  }

  /**
   * Reconcile candidate facts against existing memory.
   * Determines add/update/skip for each candidate.
   */
  reconcile(candidates: string[], categories?: Map<string, string>): ReconcileAction[] {
    const actions: ReconcileAction[] = [];

    for (const candidate of candidates) {
      // Search for similar existing facts
      const existing = this.index.searchBM25(candidate, 3);

      if (existing.length === 0) {
        // No similar facts — add new
        const category = categories?.get(candidate) ?? 'general';
        actions.push({ action: 'add', content: candidate, category });
        continue;
      }

      // Check for exact match (skip) or similar (update)
      const exactMatch = existing.find(
        (f) => f.content.toLowerCase() === candidate.toLowerCase(),
      );
      if (exactMatch) {
        // Already exists — skip
        continue;
      }

      // Similar but different — update the closest match
      const closest = existing[0];
      actions.push({
        action: 'update',
        id: closest.id,
        content: candidate,
        category: closest.category,
      });
    }

    return actions;
  }

  /**
   * Apply reconcile actions to store and index.
   */
  apply(actions: ReconcileAction[]): void {
    for (const action of actions) {
      switch (action.action) {
        case 'add': {
          this.index.addFact(action.content, action.category, 'MEMORY.md');
          const current = this.store.readMemory();
          const newLine = `- ${action.content}`;
          this.store.writeMemory(
            current ? `${current}\n${newLine}` : newLine,
          );
          break;
        }
        case 'update': {
          if (action.id) {
            this.index.updateFact(action.id, action.content);
          }
          break;
        }
        case 'delete': {
          if (action.id) {
            this.index.removeFact(action.id);
          }
          break;
        }
      }
    }
  }

  /**
   * Smart extraction: use LLM when available, fallback to regex.
   */
  async extractCandidatesSmartly(messages: ConversationMessage[]): Promise<string[]> {
    if (this.llmExtractor) {
      const facts = await this.llmExtractor.extractFacts(messages);
      if (facts && facts.length > 0) {
        return facts.map((f) => f.content);
      }
    }
    return this.extractCandidates(messages);
  }

  /**
   * Apply actions with optional quality gate filtering.
   */
  async applyWithGating(actions: ReconcileAction[]): Promise<void> {
    if (this.qualityGate) {
      const result = await this.qualityGate.filter(actions);
      this.apply(result.approved);
    } else {
      this.apply(actions);
    }
  }

  /**
   * Throttle check — should we extract for this conversation?
   */
  shouldExtract(conversationId: string, messageCount: number): boolean {
    if (messageCount < this.options.minNewMessages) return false;

    const last = this.lastExtracted.get(conversationId);
    if (last) {
      const elapsed = (Date.now() - last) / 1000;
      if (elapsed < this.options.extractIntervalSeconds) return false;
    }

    return true;
  }

  /**
   * Mark that extraction was performed for a conversation.
   */
  markExtracted(conversationId: string): void {
    this.lastExtracted.set(conversationId, Date.now());
  }
}
