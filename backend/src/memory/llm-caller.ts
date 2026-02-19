import type { ClientManager } from '../copilot/client-manager.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('memory-llm-caller');

export interface LlmCallerOptions {
  clientManager: ClientManager;
  model?: string;
  timeoutMs?: number;
}

export class MemoryLlmCaller {
  private clientManager: ClientManager;
  private model: string;
  private timeoutMs: number;

  constructor(options: LlmCallerOptions) {
    this.clientManager = options.clientManager;
    this.model = options.model ?? 'gpt-4o-mini';
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  /**
   * Send a prompt and get the complete text response.
   * Creates a disposable session for each call.
   * Returns null on any failure (timeout, SDK error, etc.)
   */
  async call(systemPrompt: string, userPrompt: string): Promise<string | null> {
    let session: any = null;
    try {
      const client = await this.clientManager.getClient();
      session = await client.createSession({
        model: this.model,
        systemMessage: { mode: 'replace', content: systemPrompt },
        tools: [],
      } as any);

      const response = await session.sendAndWait(
        { prompt: userPrompt },
        this.timeoutMs,
      );

      return response?.data?.content ?? null;
    } catch (err) {
      log.debug({ err }, 'MemoryLlmCaller call failed');
      return null;
    } finally {
      if (session) {
        try {
          await session.destroy();
        } catch {
          // ignore destroy errors
        }
      }
    }
  }
}
