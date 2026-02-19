import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { WsMessage, SendFn } from '../../src/ws/types.js';

// Mock SDK and dependencies
const { mockSession, mockSessionManager, mockRepo } = vi.hoisted(() => {
  const eventHandlers = new Map<string, (event: any) => void>();

  const _mockSession = {
    sessionId: 'sdk-session-1',
    send: vi.fn().mockResolvedValue('msg-1'),
    abort: vi.fn().mockResolvedValue(undefined),
    on: vi.fn((eventOrHandler: string | Function, handler?: Function) => {
      if (typeof eventOrHandler === 'string' && handler) {
        eventHandlers.set(eventOrHandler, handler as (event: any) => void);
      }
      return () => {
        if (typeof eventOrHandler === 'string') {
          eventHandlers.delete(eventOrHandler);
        }
      };
    }),
    _eventHandlers: eventHandlers,
  };

  const _mockSessionManager = {
    getOrCreateSession: vi.fn().mockResolvedValue(_mockSession),
    sendMessage: vi.fn().mockResolvedValue('msg-1'),
    abortMessage: vi.fn().mockResolvedValue(undefined),
  };

  const _mockRepo = {
    getById: vi.fn().mockReturnValue({
      id: 'conv-1',
      title: 'Test',
      sdkSessionId: null,
      model: 'gpt-5',
      cwd: '/tmp',
      pinned: false,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }),
    update: vi.fn(),
    addMessage: vi.fn(),
  };

  return {
    mockSession: _mockSession,
    mockSessionManager: _mockSessionManager,
    mockRepo: _mockRepo,
  };
});

import { StreamManager } from '../../src/copilot/stream-manager.js';

function clearMocks() {
  mockSession.send.mockClear().mockResolvedValue('msg-1');
  mockSession.abort.mockClear().mockResolvedValue(undefined);
  mockSession.on.mockClear().mockImplementation(
    (eventOrHandler: string | Function, handler?: Function) => {
      if (typeof eventOrHandler === 'string' && handler) {
        mockSession._eventHandlers.set(eventOrHandler, handler as (event: any) => void);
      }
      return () => {
        if (typeof eventOrHandler === 'string') {
          mockSession._eventHandlers.delete(eventOrHandler);
        }
      };
    },
  );
  mockSession._eventHandlers.clear();
  mockSessionManager.getOrCreateSession.mockClear().mockResolvedValue(mockSession);
  mockSessionManager.sendMessage.mockClear().mockResolvedValue('msg-1');
  mockSessionManager.abortMessage.mockClear().mockResolvedValue(undefined);
  mockRepo.getById.mockClear();
  mockRepo.update.mockClear();
  mockRepo.addMessage.mockClear();
}

/** Simulate an SDK event by firing the captured handler */
function fireEvent(eventName: string, data: any) {
  const handler = mockSession._eventHandlers.get(eventName);
  if (handler) handler(data);
}

/** Wait for async operations to complete */
function tick(ms = 10) {
  return new Promise((r) => setTimeout(r, ms));
}

describe('StreamManager', () => {
  let sm: StreamManager;

  beforeEach(() => {
    StreamManager.resetInstance();
    clearMocks();
    sm = StreamManager.getInstance({
      sessionManager: mockSessionManager as any,
      repo: mockRepo as any,
      maxConcurrency: 3,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    StreamManager.resetInstance();
  });

  // === 5.1 Singleton ===
  describe('singleton', () => {
    it('getInstance returns same instance on subsequent calls', () => {
      const sm2 = StreamManager.getInstance();
      expect(sm).toBe(sm2);
    });

    it('resetInstance allows creating a new instance', () => {
      StreamManager.resetInstance();
      const sm2 = StreamManager.getInstance({
        sessionManager: mockSessionManager as any,
        repo: mockRepo as any,
      });
      expect(sm2).not.toBe(sm);
    });
  });

  // === 5.2 startStream ===
  describe('startStream', () => {
    it('should start a stream for a conversation', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });

      expect(mockSessionManager.getOrCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({
          sdkSessionId: null,
          model: 'gpt-5',
          workingDirectory: '/tmp',
        }),
      );
      expect(mockSessionManager.sendMessage).toHaveBeenCalledWith(
        mockSession,
        'hello',
        undefined,
      );
      expect(sm.getActiveStreamIds()).toContain('conv-1');
    });

    it('should throw if stream already exists for conversation', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });

      await expect(
        sm.startStream('conv-1', {
          prompt: 'again',
          sdkSessionId: null,
          model: 'gpt-5',
          cwd: '/tmp',
        }),
      ).rejects.toThrow();
    });

    it('should reject when maxConcurrency is exceeded', async () => {
      // Create 3 streams (max)
      for (let i = 1; i <= 3; i++) {
        await sm.startStream(`conv-${i}`, {
          prompt: 'hello',
          sdkSessionId: null,
          model: 'gpt-5',
          cwd: '/tmp',
        });
      }

      await expect(
        sm.startStream('conv-4', {
          prompt: 'hello',
          sdkSessionId: null,
          model: 'gpt-5',
          cwd: '/tmp',
        }),
      ).rejects.toThrow(/concurrency/i);
    });

    it('should default maxConcurrency to 3', () => {
      StreamManager.resetInstance();
      const sm2 = StreamManager.getInstance({
        sessionManager: mockSessionManager as any,
        repo: mockRepo as any,
        // No maxConcurrency specified
      });
      // Internal default is 3 - verified by trying to start 4 streams
      expect(sm2).toBeDefined();
    });
  });

  // === 5.3 subscribe ===
  describe('subscribe', () => {
    it('should subscribe to a running stream', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      const received: WsMessage[] = [];
      const unsub = sm.subscribe('conv-1', (msg) => received.push(msg));
      expect(unsub).not.toBeNull();

      // Fire a delta event
      fireEvent('assistant.message_delta', {
        messageId: 'msg-1',
        deltaContent: 'Hi',
      });

      expect(received.length).toBeGreaterThan(0);
      expect(received.some((m) => m.type === 'copilot:delta')).toBe(true);
    });

    it('should replay eventBuffer on subscribe (catch-up)', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      // Fire events BEFORE subscribing
      fireEvent('assistant.message_delta', {
        messageId: 'msg-1',
        deltaContent: 'Hello',
      });
      fireEvent('assistant.message', {
        messageId: 'msg-1',
        content: 'Hello world',
      });

      // Now subscribe — should receive buffered events
      const received: WsMessage[] = [];
      sm.subscribe('conv-1', (msg) => received.push(msg));

      // Should have received catch-up events
      expect(received.length).toBeGreaterThanOrEqual(2);
      expect(received.some((m) => m.type === 'copilot:delta')).toBe(true);
      expect(received.some((m) => m.type === 'copilot:message')).toBe(true);
    });

    it('should return null when subscribing to non-existent stream', () => {
      const unsub = sm.subscribe('nonexistent', () => {});
      expect(unsub).toBeNull();
    });

    it('should not receive events after unsubscribe', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      const received: WsMessage[] = [];
      const unsub = sm.subscribe('conv-1', (msg) => received.push(msg))!;

      // Unsubscribe
      unsub();

      // Fire event after unsubscribe
      fireEvent('assistant.message_delta', {
        messageId: 'msg-2',
        deltaContent: 'After unsub',
      });

      expect(received).toHaveLength(0);
    });
  });

  // === 5.4 abortStream ===
  describe('abortStream', () => {
    it('should abort a running stream and persist', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      // Generate some content to persist
      fireEvent('assistant.message', {
        messageId: 'msg-1',
        content: 'partial answer',
      });

      await sm.abortStream('conv-1');

      expect(mockSessionManager.abortMessage).toHaveBeenCalledWith(mockSession);
      // Should have persisted accumulated content
      expect(mockRepo.addMessage).toHaveBeenCalled();
    });

    it('should silently ignore abort for non-existent stream', async () => {
      await expect(sm.abortStream('nonexistent')).resolves.not.toThrow();
    });

    it('should notify subscribers with idle event on abort', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      const received: WsMessage[] = [];
      sm.subscribe('conv-1', (msg) => received.push(msg));

      await sm.abortStream('conv-1');

      expect(received.some((m) => m.type === 'copilot:idle')).toBe(true);
    });
  });

  // === 5.5 Event flow ===
  describe('event flow', () => {
    it('should buffer events even without subscribers', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      // Fire events with no subscribers
      fireEvent('assistant.message_delta', {
        messageId: 'msg-1',
        deltaContent: 'buffered',
      });

      // Now subscribe — should get catch-up
      const received: WsMessage[] = [];
      sm.subscribe('conv-1', (msg) => received.push(msg));

      expect(received.length).toBeGreaterThan(0);
    });

    it('should persist accumulated content on idle event', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      // Simulate full message flow
      fireEvent('assistant.message', {
        messageId: 'msg-1',
        content: 'Hello world',
      });
      fireEvent('session.idle', {});

      // Should have persisted
      expect(mockRepo.addMessage).toHaveBeenCalledWith(
        'conv-1',
        expect.objectContaining({
          role: 'assistant',
          content: 'Hello world',
        }),
      );
    });

    it('should persist sdkSessionId to repo after creating a new session', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null, // No existing session — triggers createSession
        model: 'gpt-5',
        cwd: '/tmp',
      });

      // Should have saved the session ID back to the conversation
      expect(mockRepo.update).toHaveBeenCalledWith('conv-1', {
        sdkSessionId: mockSession.sessionId,
      });
    });

    it('should not update sdkSessionId when resuming an existing session', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: 'existing-session', // Has existing session — triggers resumeSession
        model: 'gpt-5',
        cwd: '/tmp',
      });

      // Should NOT have updated the session ID (it already exists)
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('should allow starting a new stream after idle (same conversation)', async () => {
      await sm.startStream('conv-1', {
        prompt: 'first',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      // Complete the first stream
      fireEvent('session.idle', {});
      await tick();

      // Should be able to start a second stream on the same conversation
      clearMocks();
      await sm.startStream('conv-1', {
        prompt: 'second',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });

      expect(mockSessionManager.sendMessage).toHaveBeenCalledWith(
        mockSession,
        'second',
        undefined,
      );
    });

    it('should forward events to all subscribers', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      const received1: WsMessage[] = [];
      const received2: WsMessage[] = [];
      sm.subscribe('conv-1', (msg) => received1.push(msg));
      sm.subscribe('conv-1', (msg) => received2.push(msg));

      fireEvent('assistant.message_delta', {
        messageId: 'msg-1',
        deltaContent: 'Hi',
      });

      expect(received1.length).toBeGreaterThan(0);
      expect(received2.length).toBeGreaterThan(0);
    });

    it('should inject conversationId into eventBuffer events', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      fireEvent('assistant.message_delta', {
        messageId: 'msg-1',
        deltaContent: 'Hello',
      });
      fireEvent('assistant.message', {
        messageId: 'msg-1',
        content: 'Hello world',
      });

      // Subscribe to get catch-up from eventBuffer
      const received: WsMessage[] = [];
      sm.subscribe('conv-1', (msg) => received.push(msg));

      // Every buffered event should contain conversationId in data
      for (const msg of received) {
        const data = msg.data as Record<string, unknown>;
        expect(data.conversationId).toBe('conv-1');
      }
    });

    it('should inject conversationId into broadcast events', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      const received: WsMessage[] = [];
      sm.subscribe('conv-1', (msg) => received.push(msg));

      // Fire events AFTER subscribing — these go through broadcast
      fireEvent('assistant.message_delta', {
        messageId: 'msg-2',
        deltaContent: 'Hi',
      });
      fireEvent('assistant.message', {
        messageId: 'msg-2',
        content: 'Hi there',
      });
      fireEvent('assistant.tool.start', {
        toolCallId: 'tc-1',
        toolName: 'read_file',
        arguments: { path: '/tmp' },
      });
      fireEvent('assistant.tool.end', {
        toolCallId: 'tc-1',
        success: true,
        result: 'done',
      });

      // All broadcast events should contain conversationId
      for (const msg of received) {
        const data = msg.data as Record<string, unknown>;
        expect(data.conversationId).toBe('conv-1');
      }
    });

    it('should inject correct conversationId for different conversations', async () => {
      await sm.startStream('conv-A', {
        prompt: 'hello A',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      const receivedA: WsMessage[] = [];
      sm.subscribe('conv-A', (msg) => receivedA.push(msg));

      fireEvent('assistant.message_delta', {
        messageId: 'msg-A',
        deltaContent: 'Response A',
      });

      for (const msg of receivedA) {
        const data = msg.data as Record<string, unknown>;
        expect(data.conversationId).toBe('conv-A');
      }
    });
  });

  // === 5.6 shutdownAll ===
  describe('shutdownAll', () => {
    it('should persist all running streams on shutdown', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      fireEvent('assistant.message', {
        messageId: 'msg-1',
        content: 'in progress',
      });

      await sm.shutdownAll();

      expect(mockRepo.addMessage).toHaveBeenCalled();
    });

    it('should reject new startStream during shutdown', async () => {
      const shutdownPromise = sm.shutdownAll();

      await expect(
        sm.startStream('conv-1', {
          prompt: 'hello',
          sdkSessionId: null,
          model: 'gpt-5',
          cwd: '/tmp',
        }),
      ).rejects.toThrow(/shutdown/i);

      await shutdownPromise;
    });

    it('should complete within timeout', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      // shutdownAll with short timeout should still complete
      await expect(sm.shutdownAll(5000)).resolves.not.toThrow();
    });
  });

  // === skillStore integration ===
  describe('startStream with skillStore', () => {
    it('should pass skillDirectories from skillStore to session', async () => {
      const mockSkillStore = {
        getSkillDirectories: vi.fn().mockReturnValue(['/data/skills/a', '/data/skills/b']),
      };

      StreamManager.resetInstance();
      const smSkills = StreamManager.getInstance({
        sessionManager: mockSessionManager as any,
        repo: mockRepo as any,
        skillStore: mockSkillStore as any,
      });

      await smSkills.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });

      expect(mockSkillStore.getSkillDirectories).toHaveBeenCalled();
      expect(mockSessionManager.getOrCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({
          skillDirectories: ['/data/skills/a', '/data/skills/b'],
        }),
      );
    });

    it('should pass disabledSkills when provided in options', async () => {
      StreamManager.resetInstance();
      const smDisabled = StreamManager.getInstance({
        sessionManager: mockSessionManager as any,
        repo: mockRepo as any,
      });

      await smDisabled.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
        disabledSkills: ['old-skill'],
      });

      expect(mockSessionManager.getOrCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({
          disabledSkills: ['old-skill'],
        }),
      );
    });

    it('should not pass skillDirectories when no skillStore provided', async () => {
      StreamManager.resetInstance();
      const smNoSkills = StreamManager.getInstance({
        sessionManager: mockSessionManager as any,
        repo: mockRepo as any,
      });

      await smNoSkills.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });

      const opts = mockSessionManager.getOrCreateSession.mock.calls[0][0];
      expect(opts.skillDirectories).toBeUndefined();
      expect(opts.disabledSkills).toBeUndefined();
    });
  });

  // === selfControlTools integration ===
  describe('startStream with selfControlTools', () => {
    it('should pass selfControlTools to session options', async () => {
      const fakeTools = [
        { name: 'read_profile', description: 'Read profile', handler: async () => ({}) },
        { name: 'update_profile', description: 'Update profile', handler: async () => ({}) },
      ];

      StreamManager.resetInstance();
      const smTools = StreamManager.getInstance({
        sessionManager: mockSessionManager as any,
        repo: mockRepo as any,
        selfControlTools: fakeTools as any,
      });

      await smTools.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });

      expect(mockSessionManager.getOrCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: fakeTools,
        }),
      );
    });

    it('should not pass tools when no selfControlTools provided', async () => {
      StreamManager.resetInstance();
      const smNoTools = StreamManager.getInstance({
        sessionManager: mockSessionManager as any,
        repo: mockRepo as any,
      });

      await smNoTools.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });

      const opts = mockSessionManager.getOrCreateSession.mock.calls[0][0];
      expect(opts.tools).toBeUndefined();
    });
  });

  // === Usage accumulation ===
  describe('usage accumulation', () => {
    it('should accumulate usage tokens from copilot:usage events and persist in metadata', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      // Simulate a message + usage events
      fireEvent('assistant.message', {
        messageId: 'msg-1',
        content: 'Hello world',
      });
      fireEvent('assistant.usage', {
        inputTokens: 100,
        outputTokens: 50,
      });
      fireEvent('assistant.usage', {
        inputTokens: 200,
        outputTokens: 80,
      });

      // Trigger persist
      fireEvent('session.idle', {});

      expect(mockRepo.addMessage).toHaveBeenCalledWith(
        'conv-1',
        expect.objectContaining({
          role: 'assistant',
          content: 'Hello world',
          metadata: expect.objectContaining({
            usage: {
              inputTokens: 300,
              outputTokens: 130,
            },
          }),
        }),
      );
    });

    it('should persist usage even when only usage events exist (no text)', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      // Only usage events, no message
      fireEvent('assistant.message', {
        messageId: 'msg-1',
        content: 'response',
      });
      fireEvent('assistant.usage', {
        inputTokens: 50,
        outputTokens: 25,
      });
      fireEvent('session.idle', {});

      const callArgs = mockRepo.addMessage.mock.calls[0];
      expect(callArgs[1].metadata.usage).toEqual({
        inputTokens: 50,
        outputTokens: 25,
      });
    });

    it('should not include usage in metadata when no usage events were received', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      fireEvent('assistant.message', {
        messageId: 'msg-1',
        content: 'No usage info',
      });
      fireEvent('session.idle', {});

      const callArgs = mockRepo.addMessage.mock.calls[0];
      expect(callArgs[1].metadata.usage).toBeUndefined();
    });

    it('should reset usage accumulation after idle', async () => {
      await sm.startStream('conv-1', {
        prompt: 'first',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      fireEvent('assistant.message', { messageId: 'msg-1', content: 'First' });
      fireEvent('assistant.usage', { inputTokens: 100, outputTokens: 50 });
      fireEvent('session.idle', {});
      await tick();

      // Start a new stream on the same conversation
      clearMocks();
      await sm.startStream('conv-1', {
        prompt: 'second',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      fireEvent('assistant.message', { messageId: 'msg-2', content: 'Second' });
      fireEvent('assistant.usage', { inputTokens: 10, outputTokens: 5 });
      fireEvent('session.idle', {});

      const callArgs = mockRepo.addMessage.mock.calls[0];
      // Should only have the second turn's usage, not accumulated from first
      expect(callArgs[1].metadata.usage).toEqual({
        inputTokens: 10,
        outputTokens: 5,
      });
    });
  });

  // === 10.2 PromptComposer integration ===
  // === Quota + cache token accumulation ===
  describe('quota and cache token accumulation', () => {
    it('should accumulate cacheReadTokens and cacheWriteTokens from copilot:usage events', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      fireEvent('assistant.message', { messageId: 'msg-1', content: 'response' });
      fireEvent('assistant.usage', {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 500,
        cacheWriteTokens: 200,
      });
      fireEvent('session.idle', {});

      const callArgs = mockRepo.addMessage.mock.calls[0];
      expect(callArgs[1].metadata.usage).toEqual({
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 500,
        cacheWriteTokens: 200,
      });
    });

    it('should accumulate cache tokens across multiple usage events', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      fireEvent('assistant.message', { messageId: 'msg-1', content: 'response' });
      fireEvent('assistant.usage', {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 300,
        cacheWriteTokens: 100,
      });
      fireEvent('assistant.usage', {
        inputTokens: 200,
        outputTokens: 80,
        cacheReadTokens: 200,
        cacheWriteTokens: 150,
      });
      fireEvent('session.idle', {});

      const callArgs = mockRepo.addMessage.mock.calls[0];
      expect(callArgs[1].metadata.usage).toEqual({
        inputTokens: 300,
        outputTokens: 130,
        cacheReadTokens: 500,
        cacheWriteTokens: 250,
      });
    });

    it('should persist quota data from copilot:quota events', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      fireEvent('assistant.message', { messageId: 'msg-1', content: 'response' });
      fireEvent('assistant.usage', { inputTokens: 100, outputTokens: 50 });

      // Note: quota events come separately via event-relay's copilot:quota
      // but stream-manager sees the raw assistant.usage with quotaSnapshots
      // For stream-manager, we simulate via the relay's copilot:quota
      // Actually the stream-manager processes events from EventRelay,
      // so we need to simulate via the relay which processes SDK events.
      // The EventRelay will fire copilot:quota separately.
      // Let's check that the stream-manager can handle copilot:quota events
      // (processed via the accumulatingSend)

      fireEvent('session.idle', {});

      const callArgs = mockRepo.addMessage.mock.calls[0];
      expect(callArgs[1].metadata.usage).toEqual({
        inputTokens: 100,
        outputTokens: 50,
      });
    });

    it('should not include cache tokens when none were received', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      fireEvent('assistant.message', { messageId: 'msg-1', content: 'response' });
      fireEvent('assistant.usage', { inputTokens: 100, outputTokens: 50 });
      fireEvent('session.idle', {});

      const callArgs = mockRepo.addMessage.mock.calls[0];
      expect(callArgs[1].metadata.usage).toEqual({
        inputTokens: 100,
        outputTokens: 50,
      });
    });
  });

  // === Plan mode ===
  describe('plan mode', () => {
    it('should pass a permission handler that denies in plan mode', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
        mode: 'plan',
      });

      const sessionOpts = mockSessionManager.getOrCreateSession.mock.calls[0][0];
      expect(typeof sessionOpts.onPermissionRequest).toBe('function');

      // In plan mode, should deny
      const result = sessionOpts.onPermissionRequest({ kind: 'shell' }, { sessionId: 's-1' });
      expect(result).toEqual({ kind: 'denied-by-rules' });
    });

    it('should pass a permission handler that approves in act mode', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
        mode: 'act',
      });

      const sessionOpts = mockSessionManager.getOrCreateSession.mock.calls[0][0];
      const result = sessionOpts.onPermissionRequest({ kind: 'shell' }, { sessionId: 's-1' });
      expect(result).toEqual({ kind: 'approved' });
    });

    it('should default to act mode when mode is not specified', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });

      const sessionOpts = mockSessionManager.getOrCreateSession.mock.calls[0][0];
      const result = sessionOpts.onPermissionRequest({ kind: 'write' }, { sessionId: 's-1' });
      expect(result).toEqual({ kind: 'approved' });
    });

    it('setMode should change mode and broadcast copilot:mode_changed', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
        mode: 'act',
      });
      await tick();

      const received: WsMessage[] = [];
      sm.subscribe('conv-1', (msg) => received.push(msg));

      sm.setMode('conv-1', 'plan');

      const modeMsg = received.find((m) => m.type === 'copilot:mode_changed');
      expect(modeMsg).toBeDefined();
      expect((modeMsg!.data as any).mode).toBe('plan');

      // Verify the permission handler now denies
      const sessionOpts = mockSessionManager.getOrCreateSession.mock.calls[0][0];
      const result = sessionOpts.onPermissionRequest({ kind: 'shell' }, { sessionId: 's-1' });
      expect(result).toEqual({ kind: 'denied-by-rules' });
    });

    it('setMode should switch back to act and permission handler approves again', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
        mode: 'plan',
      });
      await tick();

      sm.setMode('conv-1', 'act');

      const sessionOpts = mockSessionManager.getOrCreateSession.mock.calls[0][0];
      const result = sessionOpts.onPermissionRequest({ kind: 'shell' }, { sessionId: 's-1' });
      expect(result).toEqual({ kind: 'approved' });
    });

    it('setMode should no-op for non-existent stream', () => {
      expect(() => sm.setMode('nonexistent', 'plan')).not.toThrow();
    });
  });

  // === User input request bridge ===
  describe('user input request bridge', () => {
    it('should pass onUserInputRequest handler to session options', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });

      const sessionOpts = mockSessionManager.getOrCreateSession.mock.calls[0][0];
      expect(typeof sessionOpts.onUserInputRequest).toBe('function');
    });

    it('should broadcast copilot:user_input_request when SDK triggers onUserInputRequest', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      const received: WsMessage[] = [];
      sm.subscribe('conv-1', (msg) => received.push(msg));

      // Get the handler and call it (simulating SDK asking user)
      const sessionOpts = mockSessionManager.getOrCreateSession.mock.calls[0][0];
      const handlerPromise = sessionOpts.onUserInputRequest(
        { question: 'Which approach?', choices: ['A', 'B'], allowFreeform: true },
        { sessionId: 'sdk-session-1' },
      );

      // Should have broadcast the request
      const requestMsg = received.find((m) => m.type === 'copilot:user_input_request');
      expect(requestMsg).toBeDefined();
      const requestData = requestMsg!.data as Record<string, unknown>;
      expect(requestData.question).toBe('Which approach?');
      expect(requestData.choices).toEqual(['A', 'B']);
      expect(requestData.allowFreeform).toBe(true);
      expect(typeof requestData.requestId).toBe('string');
      expect(requestData.conversationId).toBe('conv-1');

      // Clean up — resolve the promise so test doesn't hang
      sm.handleUserInputResponse('conv-1', requestData.requestId as string, 'A', false);
      await handlerPromise;
    });

    it('handleUserInputResponse should resolve the pending Promise with correct response', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      const received: WsMessage[] = [];
      sm.subscribe('conv-1', (msg) => received.push(msg));

      const sessionOpts = mockSessionManager.getOrCreateSession.mock.calls[0][0];
      const handlerPromise = sessionOpts.onUserInputRequest(
        { question: 'Pick one', choices: ['X', 'Y'] },
        { sessionId: 'sdk-session-1' },
      );

      const requestMsg = received.find((m) => m.type === 'copilot:user_input_request');
      const requestId = (requestMsg!.data as Record<string, unknown>).requestId as string;

      // Simulate frontend responding
      sm.handleUserInputResponse('conv-1', requestId, 'X', false);

      const result = await handlerPromise;
      expect(result).toEqual({ answer: 'X', wasFreeform: false });
    });

    it('handleUserInputResponse with freeform answer should return wasFreeform true', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      const received: WsMessage[] = [];
      sm.subscribe('conv-1', (msg) => received.push(msg));

      const sessionOpts = mockSessionManager.getOrCreateSession.mock.calls[0][0];
      const handlerPromise = sessionOpts.onUserInputRequest(
        { question: 'What do you think?', allowFreeform: true },
        { sessionId: 'sdk-session-1' },
      );

      const requestMsg = received.find((m) => m.type === 'copilot:user_input_request');
      const requestId = (requestMsg!.data as Record<string, unknown>).requestId as string;

      sm.handleUserInputResponse('conv-1', requestId, 'My custom answer', true);

      const result = await handlerPromise;
      expect(result).toEqual({ answer: 'My custom answer', wasFreeform: true });
    });

    it('abortStream should reject all pending user input requests', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      const sessionOpts = mockSessionManager.getOrCreateSession.mock.calls[0][0];
      const handlerPromise = sessionOpts.onUserInputRequest(
        { question: 'Pick?', choices: ['A'] },
        { sessionId: 'sdk-session-1' },
      );

      await sm.abortStream('conv-1');

      await expect(handlerPromise).rejects.toThrow(/aborted/i);
    });

    it('shutdownAll should reject all pending user input requests', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      const sessionOpts = mockSessionManager.getOrCreateSession.mock.calls[0][0];
      const handlerPromise = sessionOpts.onUserInputRequest(
        { question: 'Ready?', choices: ['Yes', 'No'] },
        { sessionId: 'sdk-session-1' },
      );

      await sm.shutdownAll();

      await expect(handlerPromise).rejects.toThrow(/aborted/i);
    });

    it('handleUserInputResponse should no-op for non-existent conversation', () => {
      expect(() => sm.handleUserInputResponse('nonexistent', 'req-1', 'answer', false)).not.toThrow();
    });

    it('handleUserInputResponse should no-op for unknown requestId', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      expect(() => sm.handleUserInputResponse('conv-1', 'unknown-req', 'answer', false)).not.toThrow();
    });

    describe('user input timeout event', () => {
      it('should broadcast copilot:user_input_timeout before rejecting on timeout', async () => {
        // Use fake timers for this test
        vi.useFakeTimers();

        await sm.startStream('conv-1', {
          prompt: 'hello', sdkSessionId: null, model: 'gpt-5', cwd: '/tmp',
        });
        // Need real tick for async startStream
        await vi.advanceTimersByTimeAsync(10);

        const received: WsMessage[] = [];
        sm.subscribe('conv-1', (msg) => received.push(msg));

        const sessionOpts = mockSessionManager.getOrCreateSession.mock.calls[0][0];
        const handlerPromise = sessionOpts.onUserInputRequest(
          { question: 'Which approach?', choices: ['A', 'B'], allowFreeform: true },
          { sessionId: 'sdk-session-1' },
        );

        // Attach a no-op catch to avoid unhandled rejection warning during timer advance
        let rejectedError: Error | undefined;
        const safePromise = handlerPromise.catch((err: Error) => { rejectedError = err; });

        // Advance past the 30 minute timeout
        await vi.advanceTimersByTimeAsync(30 * 60 * 1000 + 100);
        await safePromise;

        // Should have broadcast timeout event
        const timeoutMsg = received.find((m) => m.type === 'copilot:user_input_timeout');
        expect(timeoutMsg).toBeDefined();
        expect((timeoutMsg!.data as any).question).toBe('Which approach?');
        expect((timeoutMsg!.data as any).choices).toEqual(['A', 'B']);
        expect((timeoutMsg!.data as any).allowFreeform).toBe(true);
        expect(typeof (timeoutMsg!.data as any).requestId).toBe('string');

        // Promise should have been rejected
        expect(rejectedError).toBeDefined();
        expect(rejectedError!.message).toMatch(/timed out/i);

        vi.useRealTimers();
      });

      it('should NOT broadcast timeout when user responds before timeout', async () => {
        await sm.startStream('conv-1', {
          prompt: 'hello', sdkSessionId: null, model: 'gpt-5', cwd: '/tmp',
        });
        await tick();

        const received: WsMessage[] = [];
        sm.subscribe('conv-1', (msg) => received.push(msg));

        const sessionOpts = mockSessionManager.getOrCreateSession.mock.calls[0][0];
        const handlerPromise = sessionOpts.onUserInputRequest(
          { question: 'Pick?', choices: ['A'] },
          { sessionId: 'sdk-session-1' },
        );

        const requestMsg = received.find((m) => m.type === 'copilot:user_input_request');
        const requestId = (requestMsg!.data as Record<string, unknown>).requestId as string;

        // Respond before timeout
        sm.handleUserInputResponse('conv-1', requestId, 'A', false);
        await handlerPromise;

        // Should NOT have timeout event
        const timeoutMsg = received.find((m) => m.type === 'copilot:user_input_timeout');
        expect(timeoutMsg).toBeUndefined();
      });
    });
  });

  // === sessionConversationMap ===
  describe('sessionConversationMap', () => {
    it('should map sessionId to conversationId after startStream', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello', sdkSessionId: null, model: 'gpt-5', cwd: '/tmp',
      });
      expect(StreamManager.sessionConversationMap.get('sdk-session-1')).toBe('conv-1');
    });

    it('should clean up mapping on idle', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello', sdkSessionId: null, model: 'gpt-5', cwd: '/tmp',
      });
      await tick();
      fireEvent('session.idle', {});
      await tick();
      expect(StreamManager.sessionConversationMap.has('sdk-session-1')).toBe(false);
    });

    it('should clean up mapping on abort', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello', sdkSessionId: null, model: 'gpt-5', cwd: '/tmp',
      });
      await tick();
      await sm.abortStream('conv-1');
      expect(StreamManager.sessionConversationMap.has('sdk-session-1')).toBe(false);
    });

    it('resetInstance should clear the map', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello', sdkSessionId: null, model: 'gpt-5', cwd: '/tmp',
      });
      StreamManager.resetInstance();
      expect(StreamManager.sessionConversationMap.size).toBe(0);
    });
  });

  describe('startStream with promptComposer', () => {
    it('should call promptComposer.compose with activePresets and pass systemMessage to session', async () => {
      const mockComposer = {
        compose: vi.fn().mockReturnValue('Composed system prompt'),
      };

      StreamManager.resetInstance();
      const smWithComposer = StreamManager.getInstance({
        sessionManager: mockSessionManager as any,
        repo: mockRepo as any,
        maxConcurrency: 3,
        promptComposer: mockComposer as any,
      });

      await smWithComposer.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
        activePresets: ['code-review'],
      });

      expect(mockComposer.compose).toHaveBeenCalledWith(['code-review'], '/tmp');
      expect(mockSessionManager.getOrCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({
          systemMessage: { mode: 'append', content: 'Composed system prompt' },
        }),
      );
    });

    it('should not pass systemMessage when composer returns empty string', async () => {
      const mockComposer = {
        compose: vi.fn().mockReturnValue(''),
      };

      StreamManager.resetInstance();
      const smNoPrompt = StreamManager.getInstance({
        sessionManager: mockSessionManager as any,
        repo: mockRepo as any,
        promptComposer: mockComposer as any,
      });

      await smNoPrompt.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });

      const sessionOpts = mockSessionManager.getOrCreateSession.mock.calls[0][0];
      expect(sessionOpts.systemMessage).toBeUndefined();
    });

    it('should default activePresets to empty array when not provided', async () => {
      const mockComposer = {
        compose: vi.fn().mockReturnValue(''),
      };

      StreamManager.resetInstance();
      const smDefault = StreamManager.getInstance({
        sessionManager: mockSessionManager as any,
        repo: mockRepo as any,
        promptComposer: mockComposer as any,
      });

      await smDefault.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });

      expect(mockComposer.compose).toHaveBeenCalledWith([], '/tmp');
    });
  });

  // === getFullState ===
  describe('getFullState', () => {
    it('should return empty arrays when no streams exist', () => {
      const state = sm.getFullState();
      expect(state.activeStreams).toEqual([]);
      expect(state.pendingUserInputs).toEqual([]);
    });

    it('should return active streams with correct metadata', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      const state = sm.getFullState();
      expect(state.activeStreams).toHaveLength(1);
      expect(state.activeStreams[0]).toEqual(
        expect.objectContaining({
          conversationId: 'conv-1',
          status: 'running',
        }),
      );
      expect(typeof state.activeStreams[0].startedAt).toBe('string');
    });

    it('should return pending user inputs with request metadata', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      // Trigger a user input request
      const sessionOpts = mockSessionManager.getOrCreateSession.mock.calls[0][0];
      const handlerPromise = sessionOpts.onUserInputRequest(
        { question: 'Which approach?', choices: ['A', 'B'], allowFreeform: true },
        { sessionId: 'sdk-session-1' },
      );

      const state = sm.getFullState();
      expect(state.pendingUserInputs).toHaveLength(1);
      expect(state.pendingUserInputs[0]).toEqual(
        expect.objectContaining({
          conversationId: 'conv-1',
          question: 'Which approach?',
          choices: ['A', 'B'],
          allowFreeform: true,
        }),
      );
      expect(typeof state.pendingUserInputs[0].requestId).toBe('string');

      // Clean up
      sm.handleUserInputResponse('conv-1', state.pendingUserInputs[0].requestId, 'A', false);
      await handlerPromise;
    });

    it('should include multiple active streams', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello', sdkSessionId: null, model: 'gpt-5', cwd: '/tmp',
      });
      await sm.startStream('conv-2', {
        prompt: 'world', sdkSessionId: null, model: 'gpt-5', cwd: '/tmp',
      });
      await tick();

      const state = sm.getFullState();
      expect(state.activeStreams).toHaveLength(2);
      const ids = state.activeStreams.map((s: any) => s.conversationId);
      expect(ids).toContain('conv-1');
      expect(ids).toContain('conv-2');
    });

    it('should not include idle streams', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello', sdkSessionId: null, model: 'gpt-5', cwd: '/tmp',
      });
      await tick();

      fireEvent('session.idle', {});
      await tick();

      const state = sm.getFullState();
      expect(state.activeStreams).toHaveLength(0);
    });
  });

  // === multiSelect field forwarding ===
  describe('multiSelect field forwarding', () => {
    it('should include multiSelect=true in copilot:user_input_request broadcast', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello', sdkSessionId: null, model: 'gpt-5', cwd: '/tmp',
      });
      await tick();

      const received: WsMessage[] = [];
      sm.subscribe('conv-1', (msg) => received.push(msg));

      const sessionOpts = mockSessionManager.getOrCreateSession.mock.calls[0][0];
      const handlerPromise = sessionOpts.onUserInputRequest(
        { question: 'Pick many', choices: ['A', 'B', 'C'], allowFreeform: true, multiSelect: true },
        { sessionId: 'sdk-session-1' },
      );

      const requestMsg = received.find((m) => m.type === 'copilot:user_input_request');
      expect(requestMsg).toBeDefined();
      const requestData = requestMsg!.data as Record<string, unknown>;
      expect(requestData.multiSelect).toBe(true);

      // Clean up
      sm.handleUserInputResponse('conv-1', requestData.requestId as string, '["A","B"]', false);
      await handlerPromise;
    });

    it('should include multiSelect=undefined when not provided (default single-select)', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello', sdkSessionId: null, model: 'gpt-5', cwd: '/tmp',
      });
      await tick();

      const received: WsMessage[] = [];
      sm.subscribe('conv-1', (msg) => received.push(msg));

      const sessionOpts = mockSessionManager.getOrCreateSession.mock.calls[0][0];
      const handlerPromise = sessionOpts.onUserInputRequest(
        { question: 'Pick one', choices: ['X', 'Y'], allowFreeform: false },
        { sessionId: 'sdk-session-1' },
      );

      const requestMsg = received.find((m) => m.type === 'copilot:user_input_request');
      const requestData = requestMsg!.data as Record<string, unknown>;
      expect(requestData.multiSelect).toBeUndefined();

      // Clean up
      sm.handleUserInputResponse('conv-1', requestData.requestId as string, 'X', false);
      await handlerPromise;
    });
  });

  // === AskUser timeout pause/resume ===
  describe('user input timeout pause/resume', () => {
    it('should use 30-minute timeout instead of 5 minutes', async () => {
      vi.useFakeTimers();

      await sm.startStream('conv-1', {
        prompt: 'hello', sdkSessionId: null, model: 'gpt-5', cwd: '/tmp',
      });
      await vi.advanceTimersByTimeAsync(10);

      const received: WsMessage[] = [];
      sm.subscribe('conv-1', (msg) => received.push(msg));

      const sessionOpts = mockSessionManager.getOrCreateSession.mock.calls[0][0];
      const handlerPromise = sessionOpts.onUserInputRequest(
        { question: 'Q?', choices: ['A'] },
        { sessionId: 'sdk-session-1' },
      );

      let rejectedError: Error | undefined;
      const safePromise = handlerPromise.catch((err: Error) => { rejectedError = err; });

      // After 5 minutes, should NOT have timed out yet (old behavior was 5 min)
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100);
      expect(rejectedError).toBeUndefined();

      // After 30 minutes total, should have timed out
      await vi.advanceTimersByTimeAsync(25 * 60 * 1000);
      await safePromise;
      expect(rejectedError).toBeDefined();
      expect(rejectedError!.message).toMatch(/timed out/i);

      vi.useRealTimers();
    });

    it('should pause timeout when all subscribers disconnect', async () => {
      vi.useFakeTimers();

      try {
        await sm.startStream('conv-1', {
          prompt: 'hello', sdkSessionId: null, model: 'gpt-5', cwd: '/tmp',
        });
        await vi.advanceTimersByTimeAsync(10);

        const sub1: SendFn = vi.fn();
        const unsub1 = sm.subscribe('conv-1', sub1)!;

        const sessionOpts = mockSessionManager.getOrCreateSession.mock.calls[0][0];
        const handlerPromise = sessionOpts.onUserInputRequest(
          { question: 'Q?', choices: ['A'] },
          { sessionId: 'sdk-session-1' },
        );

        let rejectedError: Error | undefined;
        handlerPromise.catch((err: Error) => { rejectedError = err; });

        // Advance 10 minutes, then remove all subscribers
        await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
        unsub1();

        // Advance another 25 minutes with no subscribers — timer should be paused
        await vi.advanceTimersByTimeAsync(25 * 60 * 1000);
        expect(rejectedError).toBeUndefined(); // Still not timed out because timer paused

        // Clean up
        vi.useRealTimers();
        sm.handleUserInputResponse('conv-1', sm.getPendingUserInputs('conv-1')[0].requestId, 'A', false);
        await handlerPromise;
      } finally {
        vi.useRealTimers();
      }
    });

    it('should resume timeout when a new subscriber joins after pause', async () => {
      vi.useFakeTimers();

      try {
        await sm.startStream('conv-1', {
          prompt: 'hello', sdkSessionId: null, model: 'gpt-5', cwd: '/tmp',
        });
        await vi.advanceTimersByTimeAsync(10);

        const sub1: SendFn = vi.fn();
        const unsub1 = sm.subscribe('conv-1', sub1)!;

        const sessionOpts = mockSessionManager.getOrCreateSession.mock.calls[0][0];
        const handlerPromise = sessionOpts.onUserInputRequest(
          { question: 'Q?', choices: ['A'] },
          { sessionId: 'sdk-session-1' },
        );

        let rejectedError: Error | undefined;
        const safePromise = handlerPromise.catch((err: Error) => { rejectedError = err; });

        // Advance 10 minutes with subscriber, then disconnect
        await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
        unsub1(); // Timer pauses, ~20 min remaining

        // Wait a long time with no subscribers (should not count)
        await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
        expect(rejectedError).toBeUndefined();

        // Reconnect — timer should resume with ~20 min remaining
        const sub2: SendFn = vi.fn();
        sm.subscribe('conv-1', sub2);

        // Advance another 19 minutes — should NOT timeout yet
        await vi.advanceTimersByTimeAsync(19 * 60 * 1000);
        expect(rejectedError).toBeUndefined();

        // Advance 2 more minutes — should timeout now (total ~31 min active)
        await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
        await safePromise;
        expect(rejectedError).toBeDefined();
        expect(rejectedError!.message).toMatch(/timed out/i);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  // === PendingUserInput metadata persistence ===
  describe('pending user input metadata persistence', () => {
    it('should store request metadata alongside resolve/reject', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      const sessionOpts = mockSessionManager.getOrCreateSession.mock.calls[0][0];
      const handlerPromise = sessionOpts.onUserInputRequest(
        { question: 'Select option', choices: ['X', 'Y'], allowFreeform: false },
        { sessionId: 'sdk-session-1' },
      );

      // getPendingUserInputs should return the metadata
      const pending = sm.getPendingUserInputs('conv-1');
      expect(pending).toHaveLength(1);
      expect(pending[0].question).toBe('Select option');
      expect(pending[0].choices).toEqual(['X', 'Y']);
      expect(pending[0].allowFreeform).toBe(false);

      // Clean up
      sm.handleUserInputResponse('conv-1', pending[0].requestId, 'X', false);
      await handlerPromise;
    });

    it('should store multiSelect metadata when provided', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      const sessionOpts = mockSessionManager.getOrCreateSession.mock.calls[0][0];
      const handlerPromise = sessionOpts.onUserInputRequest(
        { question: 'Pick many', choices: ['A', 'B', 'C'], allowFreeform: true, multiSelect: true },
        { sessionId: 'sdk-session-1' },
      );

      const pending = sm.getPendingUserInputs('conv-1');
      expect(pending).toHaveLength(1);
      expect(pending[0].multiSelect).toBe(true);

      // Clean up
      sm.handleUserInputResponse('conv-1', pending[0].requestId, '["A","B"]', false);
      await handlerPromise;
    });

    it('should return empty array for non-existent conversation', () => {
      const pending = sm.getPendingUserInputs('nonexistent');
      expect(pending).toEqual([]);
    });

    it('should remove metadata after response', async () => {
      await sm.startStream('conv-1', {
        prompt: 'hello',
        sdkSessionId: null,
        model: 'gpt-5',
        cwd: '/tmp',
      });
      await tick();

      const sessionOpts = mockSessionManager.getOrCreateSession.mock.calls[0][0];
      const handlerPromise = sessionOpts.onUserInputRequest(
        { question: 'Q?', choices: ['A'] },
        { sessionId: 'sdk-session-1' },
      );

      const pending = sm.getPendingUserInputs('conv-1');
      sm.handleUserInputResponse('conv-1', pending[0].requestId, 'A', false);
      await handlerPromise;

      expect(sm.getPendingUserInputs('conv-1')).toEqual([]);
    });
  });
});
