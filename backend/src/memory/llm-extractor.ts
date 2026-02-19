import type { MemoryLlmCaller } from './llm-caller.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('llm-memory-extractor');

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface StructuredFact {
  content: string;
  category: 'preference' | 'project' | 'workflow' | 'tool' | 'convention' | 'general';
  confidence: number;
}

const SYSTEM_PROMPT = `You are a memory extraction assistant. Your job is to identify facts from conversations that are worth remembering long-term.

Extract facts that are:
- User preferences (tools, languages, coding styles, conventions)
- Project information (tech stack, architecture, frameworks)
- Workflow habits (deployment, testing, development processes)
- Tool choices (editors, package managers, linters)

Do NOT extract:
- Casual remarks or temporary statements
- Questions or requests for help
- Information only relevant to the current task

Return a JSON array: [{ "content": "fact text", "category": "preference|project|workflow|tool|convention|general", "confidence": 0.0-1.0 }]

Only include facts with high confidence (>= 0.7).`;

export class LlmMemoryExtractor {
  private maxMessages: number;

  constructor(
    private llmCaller: MemoryLlmCaller,
    maxMessages?: number,
  ) {
    this.maxMessages = maxMessages ?? 20;
  }

  async extractFacts(messages: ConversationMessage[]): Promise<StructuredFact[] | null> {
    const truncated = messages.slice(-this.maxMessages);
    const prompt = this.buildPrompt(truncated);
    const response = await this.llmCaller.call(SYSTEM_PROMPT, prompt);

    if (!response) {
      log.debug('LLM unavailable for extraction');
      return null;
    }

    return this.parseResponse(response);
  }

  private buildPrompt(messages: ConversationMessage[]): string {
    const conversation = messages
      .map((m) => `[${m.role}]: ${m.content}`)
      .join('\n');

    return `Extract memorable facts from this conversation:\n\n${conversation}`;
  }

  private parseResponse(response: string): StructuredFact[] | null {
    const parsed = this.parseJson(response);
    if (!parsed) return null;

    return parsed.filter((f) => f.confidence >= 0.7);
  }

  private parseJson(response: string): StructuredFact[] | null {
    // Try direct parse
    try {
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed)) return parsed;
      return null;
    } catch {
      // Try code block extraction
    }

    const codeBlockMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (codeBlockMatch) {
      try {
        const parsed = JSON.parse(codeBlockMatch[1]);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // fall through
      }
    }

    return null;
  }
}
