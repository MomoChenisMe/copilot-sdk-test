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

  describe('accumulatingSend', () => {
    // Helper to simulate events through the relay
    function setupRelayCapture() {
      const eventHandlers = new Map<string, (event: any) => void>();
      mockSession.on.mockImplementation((event: string, cb: any) => {
        eventHandlers.set(event, cb);
        return () => { eventHandlers.delete(event); };
      });
      return eventHandlers;
    }

    it('should forward copilot:message events to frontend', async () => {
      const eventHandlers = setupRelayCapture();

      handler(
        { type: 'copilot:send', data: { conversationId: 'conv-1', prompt: 'Hello' } },
        send,
      );

      await vi.waitFor(() => {
        expect(eventHandlers.has('assistant.message')).toBe(true);
      });

      // Simulate assistant.message event
      eventHandlers.get('assistant.message')!({ messageId: 'msg-1', content: 'Hi there' });

      await vi.waitFor(() => {
        expect(send).toHaveBeenCalledWith({
          type: 'copilot:message',
          data: { messageId: 'msg-1', content: 'Hi there' },
        });
      });
    });

    it('should forward copilot:tool_start events to frontend', async () => {
      const eventHandlers = setupRelayCapture();

      handler(
        { type: 'copilot:send', data: { conversationId: 'conv-1', prompt: 'Hello' } },
        send,
      );

      await vi.waitFor(() => {
        expect(eventHandlers.has('tool.execution_start')).toBe(true);
      });

      eventHandlers.get('tool.execution_start')!({
        toolCallId: 'tc-1',
        toolName: 'bash',
        arguments: { command: 'echo hi' },
      });

      await vi.waitFor(() => {
        expect(send).toHaveBeenCalledWith({
          type: 'copilot:tool_start',
          data: { toolCallId: 'tc-1', toolName: 'bash', arguments: { command: 'echo hi' } },
        });
      });
    });

    it('should forward copilot:tool_end events to frontend', async () => {
      const eventHandlers = setupRelayCapture();

      handler(
        { type: 'copilot:send', data: { conversationId: 'conv-1', prompt: 'Hello' } },
        send,
      );

      await vi.waitFor(() => {
        expect(eventHandlers.has('tool.execution_complete')).toBe(true);
      });

      eventHandlers.get('tool.execution_complete')!({
        toolCallId: 'tc-1',
        success: true,
        result: 'hi',
      });

      await vi.waitFor(() => {
        expect(send).toHaveBeenCalledWith({
          type: 'copilot:tool_end',
          data: { toolCallId: 'tc-1', success: true, result: 'hi' },
        });
      });
    });

    it('should NOT save per-message to DB — only on idle', async () => {
      const eventHandlers = setupRelayCapture();

      handler(
        { type: 'copilot:send', data: { conversationId: 'conv-1', prompt: 'Hello' } },
        send,
      );

      await vi.waitFor(() => {
        expect(eventHandlers.has('assistant.message')).toBe(true);
      });

      // Simulate assistant.message — should NOT trigger addMessage for assistant
      eventHandlers.get('assistant.message')!({ messageId: 'msg-1', content: 'Hi' });

      // Only user message should have been saved at this point
      const assistantCalls = mockRepo.addMessage.mock.calls.filter(
        (call: any[]) => call[1].role === 'assistant',
      );
      expect(assistantCalls).toHaveLength(0);
    });

    it('should persist accumulated content on copilot:idle', async () => {
      const eventHandlers = setupRelayCapture();

      handler(
        { type: 'copilot:send', data: { conversationId: 'conv-1', prompt: 'Hello' } },
        send,
      );

      await vi.waitFor(() => {
        expect(eventHandlers.has('assistant.message')).toBe(true);
      });

      // Simulate events
      eventHandlers.get('assistant.message')!({ messageId: 'msg-1', content: 'Part 1. ' });
      eventHandlers.get('tool.execution_start')!({
        toolCallId: 'tc-1',
        toolName: 'bash',
        arguments: { command: 'echo hi' },
      });
      eventHandlers.get('tool.execution_complete')!({
        toolCallId: 'tc-1',
        success: true,
        result: 'hi',
      });
      eventHandlers.get('assistant.message')!({ messageId: 'msg-2', content: 'Part 2.' });

      // Trigger idle
      eventHandlers.get('session.idle')!({});

      await vi.waitFor(() => {
        const assistantCalls = mockRepo.addMessage.mock.calls.filter(
          (call: any[]) => call[1].role === 'assistant',
        );
        expect(assistantCalls).toHaveLength(1);

        const savedMessage = assistantCalls[0][1];
        expect(savedMessage.content).toBe('Part 1. Part 2.');
        expect(savedMessage.metadata).toBeTruthy();
        expect(savedMessage.metadata.toolRecords).toHaveLength(1);
        expect(savedMessage.metadata.toolRecords[0].toolName).toBe('bash');
        expect(savedMessage.metadata.toolRecords[0].status).toBe('success');
        expect(savedMessage.metadata.turnSegments).toBeTruthy();
        expect(savedMessage.metadata.turnSegments.length).toBeGreaterThanOrEqual(3);
      });
    });

    it('should persist reasoning in metadata on idle', async () => {
      const eventHandlers = setupRelayCapture();

      handler(
        { type: 'copilot:send', data: { conversationId: 'conv-1', prompt: 'Think hard' } },
        send,
      );

      await vi.waitFor(() => {
        expect(eventHandlers.has('assistant.reasoning')).toBe(true);
      });

      eventHandlers.get('assistant.reasoning')!({ reasoningId: 'r-1', content: 'Let me think...' });
      eventHandlers.get('assistant.message')!({ messageId: 'msg-1', content: 'Answer.' });
      eventHandlers.get('session.idle')!({});

      await vi.waitFor(() => {
        const assistantCalls = mockRepo.addMessage.mock.calls.filter(
          (call: any[]) => call[1].role === 'assistant',
        );
        expect(assistantCalls).toHaveLength(1);
        expect(assistantCalls[0][1].metadata.reasoning).toBe('Let me think...');
      });
    });

    it('should forward idle event to frontend', async () => {
      const eventHandlers = setupRelayCapture();

      handler(
        { type: 'copilot:send', data: { conversationId: 'conv-1', prompt: 'Hello' } },
        send,
      );

      await vi.waitFor(() => {
        expect(eventHandlers.has('session.idle')).toBe(true);
      });

      eventHandlers.get('assistant.message')!({ messageId: 'msg-1', content: 'Done' });
      eventHandlers.get('session.idle')!({});

      await vi.waitFor(() => {
        expect(send).toHaveBeenCalledWith({ type: 'copilot:idle' });
      });
    });

    it('should reset accumulation state on new copilot:send', async () => {
      const eventHandlers = setupRelayCapture();

      // First message
      handler(
        { type: 'copilot:send', data: { conversationId: 'conv-1', prompt: 'First' } },
        send,
      );

      await vi.waitFor(() => {
        expect(eventHandlers.has('assistant.message')).toBe(true);
      });

      eventHandlers.get('assistant.message')!({ messageId: 'msg-1', content: 'Response 1' });
      eventHandlers.get('session.idle')!({});

      await vi.waitFor(() => {
        const assistantCalls = mockRepo.addMessage.mock.calls.filter(
          (call: any[]) => call[1].role === 'assistant',
        );
        expect(assistantCalls).toHaveLength(1);
      });

      mockRepo.addMessage.mockClear();

      // Second message — should reset state
      handler(
        { type: 'copilot:send', data: { conversationId: 'conv-1', prompt: 'Second' } },
        send,
      );

      await vi.waitFor(() => {
        expect(eventHandlers.has('assistant.message')).toBe(true);
      });

      eventHandlers.get('assistant.message')!({ messageId: 'msg-2', content: 'Response 2' });
      eventHandlers.get('session.idle')!({});

      await vi.waitFor(() => {
        const assistantCalls = mockRepo.addMessage.mock.calls.filter(
          (call: any[]) => call[1].role === 'assistant',
        );
        expect(assistantCalls).toHaveLength(1);
        // Should only contain Response 2, not Response 1
        expect(assistantCalls[0][1].content).toBe('Response 2');
      });
    });

    it('should save accumulated content on copilot:abort', async () => {
      const eventHandlers = setupRelayCapture();

      handler(
        { type: 'copilot:send', data: { conversationId: 'conv-1', prompt: 'Hello' } },
        send,
      );

      await vi.waitFor(() => {
        expect(eventHandlers.has('assistant.message')).toBe(true);
      });

      // Simulate partial response
      eventHandlers.get('assistant.message')!({ messageId: 'msg-1', content: 'Partial response' });

      // Abort
      handler({ type: 'copilot:abort' }, send);

      await vi.waitFor(() => {
        const assistantCalls = mockRepo.addMessage.mock.calls.filter(
          (call: any[]) => call[1].role === 'assistant',
        );
        expect(assistantCalls).toHaveLength(1);
        expect(assistantCalls[0][1].content).toBe('Partial response');
      });
    });

    it('should not save empty content on idle', async () => {
      const eventHandlers = setupRelayCapture();

      handler(
        { type: 'copilot:send', data: { conversationId: 'conv-1', prompt: 'Hello' } },
        send,
      );

      await vi.waitFor(() => {
        expect(eventHandlers.has('session.idle')).toBe(true);
      });

      // idle with no accumulated content
      eventHandlers.get('session.idle')!({});

      await vi.waitFor(() => {
        // Only user message should be saved
        const assistantCalls = mockRepo.addMessage.mock.calls.filter(
          (call: any[]) => call[1].role === 'assistant',
        );
        expect(assistantCalls).toHaveLength(0);
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
