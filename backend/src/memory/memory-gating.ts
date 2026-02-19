import type { MemoryLlmCaller } from './llm-caller.js';
import type { ReconcileAction } from './memory-extractor.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('memory-gating');

export interface GatingResult {
  approved: ReconcileAction[];
  rejected: Array<{ action: ReconcileAction; reason: string }>;
}

interface GatingJudgment {
  index: number;
  keep: boolean;
  reason: string;
}

const SYSTEM_PROMPT = `You are a memory quality validator. Your job is to judge whether candidate facts are worth persisting as long-term user memory.

A fact is KEEP-worthy if it is:
- A specific, persistent user preference (tools, languages, styles)
- A project-level technical fact (stack, framework, architecture)
- A workflow convention or habit

A fact should be REJECTED if it is:
- A casual conversational remark ("I like this approach")
- A temporary, context-specific statement
- Ambiguous or too vague to be useful

Return a JSON array with your judgment for each fact.`;

export class MemoryQualityGate {
  constructor(private llmCaller: MemoryLlmCaller) {}

  async filter(actions: ReconcileAction[]): Promise<GatingResult> {
    if (actions.length === 0) {
      return { approved: [], rejected: [] };
    }

    const prompt = this.buildPrompt(actions);
    const response = await this.llmCaller.call(SYSTEM_PROMPT, prompt);

    if (!response) {
      log.debug('LLM unavailable, approving all actions');
      return { approved: [...actions], rejected: [] };
    }

    return this.parseResponse(response, actions);
  }

  private buildPrompt(actions: ReconcileAction[]): string {
    const facts = actions
      .map((a, i) => `${i}. "${a.content}"`)
      .join('\n');

    return `Judge these candidate facts. Return JSON array: [{ "index": number, "keep": boolean, "reason": "string" }]

Facts:
${facts}

Examples:
- "User prefers TypeScript strict mode" → keep: true (specific persistent preference)
- "I like this approach" → keep: false (casual conversational remark)
- "Project uses React 19 with Vite" → keep: true (project technical fact)`;
  }

  private parseResponse(response: string, actions: ReconcileAction[]): GatingResult {
    const judgments = this.parseJson(response);
    if (!judgments) {
      log.debug('Failed to parse LLM response, approving all actions');
      return { approved: [...actions], rejected: [] };
    }

    const approved: ReconcileAction[] = [];
    const rejected: GatingResult['rejected'] = [];
    const judgedIndices = new Set<number>();

    for (const j of judgments) {
      if (j.index < 0 || j.index >= actions.length) continue;
      judgedIndices.add(j.index);

      if (j.keep) {
        approved.push(actions[j.index]);
      } else {
        rejected.push({ action: actions[j.index], reason: j.reason ?? 'rejected by LLM' });
      }
    }

    // Approve any actions not mentioned by the LLM
    for (let i = 0; i < actions.length; i++) {
      if (!judgedIndices.has(i)) {
        approved.push(actions[i]);
      }
    }

    return { approved, rejected };
  }

  private parseJson(response: string): GatingJudgment[] | null {
    // Try direct parse
    try {
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed)) return parsed;
      return null;
    } catch {
      // Try extracting from markdown code block
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
