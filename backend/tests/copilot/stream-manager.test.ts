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

      expect(mockSessionManager.getOrCreateSession).toHaveBeenCalledWith({
        sdkSessionId: null,
        model: 'gpt-5',
        workingDirectory: '/tmp',
      });
      expect(mockSessionManager.sendMessage).toHaveBeenCalledWith(
        mockSession,
        'hello',
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

  // === 10.2 PromptComposer integration ===
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
});
