import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock all copilot dependencies
const { mockSession, mockSessionManager, mockRepo } = vi.hoisted(() => {
  const _mockSession = {
    sessionId: 'sdk-session-1',
    send: vi.fn().mockResolvedValue('msg-1'),
    abort: vi.fn().mockResolvedValue(undefined),
    on: vi.fn().mockReturnValue(() => {}),
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
    update: vi.fn().mockReturnValue(null),
    addMessage: vi.fn(),
  };

  return {
    mockSession: _mockSession,
    mockSessionManager: _mockSessionManager,
    mockRepo: _mockRepo,
  };
});

import { createCopilotHandler } from '../../../src/ws/handlers/copilot.js';
import type { WsMessage } from '../../../src/ws/types.js';

describe('copilot WS handler', () => {
  let handler: (message: WsMessage, send: (msg: WsMessage) => void) => void;
  let send: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSession.send.mockClear().mockResolvedValue('msg-1');
    mockSession.abort.mockClear().mockResolvedValue(undefined);
    mockSession.on.mockClear().mockReturnValue(() => {});
    mockSessionManager.getOrCreateSession.mockClear().mockResolvedValue(mockSession);
    mockSessionManager.sendMessage.mockClear().mockResolvedValue('msg-1');
    mockSessionManager.abortMessage.mockClear().mockResolvedValue(undefined);
    mockRepo.getById.mockClear().mockReturnValue({
      id: 'conv-1',
      title: 'Test',
      sdkSessionId: null,
      model: 'gpt-5',
      cwd: '/tmp',
      pinned: false,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    });
    mockRepo.update.mockClear();
    mockRepo.addMessage.mockClear();

    send = vi.fn();
    handler = createCopilotHandler(mockSessionManager as any, mockRepo as any);
  });

  describe('copilot:send', () => {
    it('should get or create session and send message', async () => {
      handler(
        {
          type: 'copilot:send',
          data: { conversationId: 'conv-1', prompt: 'Hello' },
        },
        send,
      );

      // Wait for async operations
      await vi.waitFor(() => {
        expect(mockSessionManager.getOrCreateSession).toHaveBeenCalledWith({
          sdkSessionId: null,
          model: 'gpt-5',
          workingDirectory: '/tmp',
        });
      });

      await vi.waitFor(() => {
        expect(mockSessionManager.sendMessage).toHaveBeenCalledWith(mockSession, 'Hello');
      });
    });

    it('should save sdkSessionId to conversation after creating session', async () => {
      handler(
        {
          type: 'copilot:send',
          data: { conversationId: 'conv-1', prompt: 'Hello' },
        },
        send,
      );

      await vi.waitFor(() => {
        expect(mockRepo.update).toHaveBeenCalledWith('conv-1', {
          sdkSessionId: 'sdk-session-1',
        });
      });
    });

    it('should save user message to repo', async () => {
      handler(
        {
          type: 'copilot:send',
          data: { conversationId: 'conv-1', prompt: 'Hello' },
        },
        send,
      );

      await vi.waitFor(() => {
        expect(mockRepo.addMessage).toHaveBeenCalledWith('conv-1', {
          role: 'user',
          content: 'Hello',
        });
      });
    });

    it('should save assistant message when relay sends copilot:message', async () => {
      // Capture the send function that EventRelay receives
      let relaySend: ((msg: WsMessage) => void) | null = null;
      mockSession.on.mockImplementation((event: string, cb: any) => {
        if (event === 'assistant.message') {
          // When relay attaches, simulate the event immediately
          setTimeout(() => cb({ messageId: 'msg-1', content: 'AI response' }), 10);
        }
        return () => {};
      });

      handler(
        {
          type: 'copilot:send',
          data: { conversationId: 'conv-1', prompt: 'Hello' },
        },
        send,
      );

      await vi.waitFor(() => {
        expect(mockRepo.addMessage).toHaveBeenCalledWith('conv-1', {
          role: 'assistant',
          content: 'AI response',
        });
      });
    });

    it('should send error when conversation not found', async () => {
      mockRepo.getById.mockReturnValue(null);

      handler(
        {
          type: 'copilot:send',
          data: { conversationId: 'nonexistent', prompt: 'Hi' },
        },
        send,
      );

      await vi.waitFor(() => {
        expect(send).toHaveBeenCalledWith({
          type: 'copilot:error',
          data: { message: 'Conversation not found' },
        });
      });
    });

    it('should send error when prompt is missing', async () => {
      handler(
        {
          type: 'copilot:send',
          data: { conversationId: 'conv-1' },
        },
        send,
      );

      await vi.waitFor(() => {
        expect(send).toHaveBeenCalledWith({
          type: 'copilot:error',
          data: { message: 'prompt is required' },
        });
      });
    });
  });

  describe('copilot:abort', () => {
    it('should abort the active session', async () => {
      // First send a message to set up session
      handler(
        {
          type: 'copilot:send',
          data: { conversationId: 'conv-1', prompt: 'Hello' },
        },
        send,
      );

      await vi.waitFor(() => {
        expect(mockSessionManager.sendMessage).toHaveBeenCalled();
      });

      // Now abort
      handler({ type: 'copilot:abort' }, send);

      await vi.waitFor(() => {
        expect(mockSessionManager.abortMessage).toHaveBeenCalledWith(mockSession);
      });
    });
  });

  describe('unknown copilot message', () => {
    it('should send error for unknown sub-type', () => {
      handler({ type: 'copilot:unknown' }, send);

      expect(send).toHaveBeenCalledWith({
        type: 'error',
        data: { message: 'Unknown copilot action: copilot:unknown' },
      });
    });
  });
});
