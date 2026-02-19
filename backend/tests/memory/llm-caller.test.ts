import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryLlmCaller } from '../../src/memory/llm-caller.js';
import type { ClientManager } from '../../src/copilot/client-manager.js';

function createMockSession(content: string | null, shouldThrow = false) {
  return {
    sendAndWait: vi.fn().mockImplementation(async () => {
      if (shouldThrow) throw new Error('timeout');
      if (content === null) return undefined;
      return { data: { content } };
    }),
    destroy: vi.fn().mockResolvedValue(undefined),
    sessionId: 'mock-session-id',
  };
}

function createMockClientManager(session: ReturnType<typeof createMockSession>) {
  return {
    getClient: vi.fn().mockResolvedValue({
      createSession: vi.fn().mockResolvedValue(session),
    }),
  } as unknown as ClientManager;
}

describe('MemoryLlmCaller', () => {
  let mockSession: ReturnType<typeof createMockSession>;
  let mockClientManager: ReturnType<typeof createMockClientManager>;

  beforeEach(() => {
    mockSession = createMockSession('Hello from LLM');
    mockClientManager = createMockClientManager(mockSession);
  });

  it('returns content string on successful call', async () => {
    const caller = new MemoryLlmCaller({ clientManager: mockClientManager });
    const result = await caller.call('You are helpful.', 'Say hello');
    expect(result).toBe('Hello from LLM');
  });

  it('passes systemPrompt as replace mode systemMessage', async () => {
    const caller = new MemoryLlmCaller({ clientManager: mockClientManager });
    await caller.call('Custom system prompt', 'User prompt');

    const client = await mockClientManager.getClient();
    const createSession = (client as any).createSession;
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        systemMessage: { mode: 'replace', content: 'Custom system prompt' },
      }),
    );
  });

  it('sets tools to empty array to prevent tool execution', async () => {
    const caller = new MemoryLlmCaller({ clientManager: mockClientManager });
    await caller.call('sys', 'usr');

    const client = await mockClientManager.getClient();
    const createSession = (client as any).createSession;
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: [],
      }),
    );
  });

  it('calls sendAndWait with prompt and timeout', async () => {
    const caller = new MemoryLlmCaller({ clientManager: mockClientManager, timeoutMs: 15000 });
    await caller.call('sys', 'Hello world');

    expect(mockSession.sendAndWait).toHaveBeenCalledWith(
      { prompt: 'Hello world' },
      15000,
    );
  });

  it('uses default model gpt-4o-mini', async () => {
    const caller = new MemoryLlmCaller({ clientManager: mockClientManager });
    await caller.call('sys', 'usr');

    const client = await mockClientManager.getClient();
    const createSession = (client as any).createSession;
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o-mini',
      }),
    );
  });

  it('uses custom model when specified', async () => {
    const caller = new MemoryLlmCaller({ clientManager: mockClientManager, model: 'gpt-4o' });
    await caller.call('sys', 'usr');

    const client = await mockClientManager.getClient();
    const createSession = (client as any).createSession;
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o',
      }),
    );
  });

  it('returns null when session creation fails', async () => {
    const failingClientManager = {
      getClient: vi.fn().mockResolvedValue({
        createSession: vi.fn().mockRejectedValue(new Error('auth failed')),
      }),
    } as unknown as ClientManager;

    const caller = new MemoryLlmCaller({ clientManager: failingClientManager });
    const result = await caller.call('sys', 'usr');
    expect(result).toBeNull();
  });

  it('returns null when sendAndWait times out', async () => {
    const timeoutSession = createMockSession(null, true);
    const cm = createMockClientManager(timeoutSession);

    const caller = new MemoryLlmCaller({ clientManager: cm });
    const result = await caller.call('sys', 'usr');
    expect(result).toBeNull();
  });

  it('returns null when sendAndWait returns undefined', async () => {
    const emptySession = createMockSession(null);
    const cm = createMockClientManager(emptySession);

    const caller = new MemoryLlmCaller({ clientManager: cm });
    const result = await caller.call('sys', 'usr');
    expect(result).toBeNull();
  });

  it('calls session.destroy() in finally block on success', async () => {
    const caller = new MemoryLlmCaller({ clientManager: mockClientManager });
    await caller.call('sys', 'usr');
    expect(mockSession.destroy).toHaveBeenCalledOnce();
  });

  it('calls session.destroy() in finally block on failure', async () => {
    const failSession = createMockSession(null, true);
    const cm = createMockClientManager(failSession);

    const caller = new MemoryLlmCaller({ clientManager: cm });
    await caller.call('sys', 'usr');
    expect(failSession.destroy).toHaveBeenCalledOnce();
  });

  it('returns null when getClient() fails', async () => {
    const failingCm = {
      getClient: vi.fn().mockRejectedValue(new Error('network error')),
    } as unknown as ClientManager;

    const caller = new MemoryLlmCaller({ clientManager: failingCm });
    const result = await caller.call('sys', 'usr');
    expect(result).toBeNull();
  });
});
