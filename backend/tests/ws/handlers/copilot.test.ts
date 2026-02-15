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
    getMessages: vi.fn().mockReturnValue([]),
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
    mockRepo.getMessages.mockClear().mockReturnValue([]);

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

      // Must fire tool_start first so tool_end has a record to update
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
        // Reasoning should also be in turnSegments
        const turnSegments = assistantCalls[0][1].metadata.turnSegments;
        expect(turnSegments).toBeTruthy();
        const reasoningSegments = turnSegments.filter((s: any) => s.type === 'reasoning');
        expect(reasoningSegments).toHaveLength(1);
        expect(reasoningSegments[0].content).toBe('Let me think...');
      });
    });

    it('should include reasoning in turnSegments on idle (with deltas)', async () => {
      const eventHandlers = setupRelayCapture();

      handler(
        { type: 'copilot:send', data: { conversationId: 'conv-1', prompt: 'Think' } },
        send,
      );

      await vi.waitFor(() => {
        expect(eventHandlers.has('assistant.reasoning_delta')).toBe(true);
      });

      // Simulate reasoning via deltas then complete event
      eventHandlers.get('assistant.reasoning_delta')!({ reasoningId: 'r-1', deltaContent: 'Let me ' });
      eventHandlers.get('assistant.reasoning_delta')!({ reasoningId: 'r-1', deltaContent: 'think...' });
      eventHandlers.get('assistant.reasoning')!({ reasoningId: 'r-1', content: 'Let me think...' });
      eventHandlers.get('assistant.message')!({ messageId: 'msg-1', content: 'Answer.' });
      eventHandlers.get('session.idle')!({});

      await vi.waitFor(() => {
        const assistantCalls = mockRepo.addMessage.mock.calls.filter(
          (call: any[]) => call[1].role === 'assistant',
        );
        expect(assistantCalls).toHaveLength(1);
        const metadata = assistantCalls[0][1].metadata;

        // reasoning text should be the accumulated deltas
        expect(metadata.reasoning).toBe('Let me think...');

        // turnSegments should have reasoning as first entry
        expect(metadata.turnSegments).toBeTruthy();
        expect(metadata.turnSegments[0].type).toBe('reasoning');
        expect(metadata.turnSegments[0].content).toBe('Let me think...');

        // text segment should follow
        const textSegments = metadata.turnSegments.filter((s: any) => s.type === 'text');
        expect(textSegments).toHaveLength(1);
      });
    });

    it('should include reasoning in turnSegments when only copilot:reasoning fires (no deltas)', async () => {
      const eventHandlers = setupRelayCapture();

      handler(
        { type: 'copilot:send', data: { conversationId: 'conv-1', prompt: 'Think' } },
        send,
      );

      await vi.waitFor(() => {
        expect(eventHandlers.has('assistant.reasoning')).toBe(true);
      });

      // Only complete event, no deltas
      eventHandlers.get('assistant.reasoning')!({ reasoningId: 'r-1', content: 'Quick thought' });
      eventHandlers.get('assistant.message')!({ messageId: 'msg-1', content: 'Done.' });
      eventHandlers.get('session.idle')!({});

      await vi.waitFor(() => {
        const assistantCalls = mockRepo.addMessage.mock.calls.filter(
          (call: any[]) => call[1].role === 'assistant',
        );
        expect(assistantCalls).toHaveLength(1);
        const metadata = assistantCalls[0][1].metadata;

        expect(metadata.reasoning).toBe('Quick thought');
        expect(metadata.turnSegments[0].type).toBe('reasoning');
        expect(metadata.turnSegments[0].content).toBe('Quick thought');
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

    it('should skip replayed assistant.message with duplicate messageId', async () => {
      const eventHandlers = setupRelayCapture();

      handler(
        { type: 'copilot:send', data: { conversationId: 'conv-1', prompt: 'Hello' } },
        send,
      );

      await vi.waitFor(() => {
        expect(eventHandlers.has('assistant.message')).toBe(true);
      });

      // First message — should be processed
      eventHandlers.get('assistant.message')!({ messageId: 'msg-1', content: 'Hello!' });

      await vi.waitFor(() => {
        expect(send).toHaveBeenCalledWith({
          type: 'copilot:message',
          data: { messageId: 'msg-1', content: 'Hello!' },
        });
      });

      const sendCountAfterFirst = send.mock.calls.filter(
        (call: any[]) => call[0].type === 'copilot:message',
      ).length;
      expect(sendCountAfterFirst).toBe(1);

      // Replayed message with same messageId — should be skipped
      eventHandlers.get('assistant.message')!({ messageId: 'msg-1', content: 'Hello!' });

      // Wait a tick to ensure no async forwarding
      await new Promise((r) => setTimeout(r, 50));

      const sendCountAfterSecond = send.mock.calls.filter(
        (call: any[]) => call[0].type === 'copilot:message',
      ).length;
      expect(sendCountAfterSecond).toBe(1); // Still 1 — duplicate was skipped

      // Trigger idle and verify only one content segment was accumulated
      eventHandlers.get('session.idle')!({});

      await vi.waitFor(() => {
        const assistantCalls = mockRepo.addMessage.mock.calls.filter(
          (call: any[]) => call[1].role === 'assistant',
        );
        expect(assistantCalls).toHaveLength(1);
        expect(assistantCalls[0][1].content).toBe('Hello!');
      });
    });

    it('should skip replayed copilot:delta for already-seen messageId', async () => {
      const eventHandlers = setupRelayCapture();

      handler(
        { type: 'copilot:send', data: { conversationId: 'conv-1', prompt: 'Hello' } },
        send,
      );

      await vi.waitFor(() => {
        expect(eventHandlers.has('assistant.message')).toBe(true);
      });

      // First: complete message finalizes the messageId
      eventHandlers.get('assistant.message')!({ messageId: 'msg-1', content: 'Done' });

      await vi.waitFor(() => {
        expect(send).toHaveBeenCalledWith({
          type: 'copilot:message',
          data: { messageId: 'msg-1', content: 'Done' },
        });
      });

      // Then: replayed delta with same messageId — should be skipped
      eventHandlers.get('assistant.message_delta')!({ messageId: 'msg-1', deltaContent: 'extra' });

      await new Promise((r) => setTimeout(r, 50));

      const deltaCalls = send.mock.calls.filter(
        (call: any[]) => call[0].type === 'copilot:delta',
      );
      expect(deltaCalls).toHaveLength(0); // Delta was skipped
    });

    it('should allow copilot:message with undefined messageId', async () => {
      const eventHandlers = setupRelayCapture();

      handler(
        { type: 'copilot:send', data: { conversationId: 'conv-1', prompt: 'Hello' } },
        send,
      );

      await vi.waitFor(() => {
        expect(eventHandlers.has('assistant.message')).toBe(true);
      });

      // Message without messageId — should be processed normally
      eventHandlers.get('assistant.message')!({ content: 'No ID message' });

      await vi.waitFor(() => {
        expect(send).toHaveBeenCalledWith({
          type: 'copilot:message',
          data: { messageId: undefined, content: 'No ID message' },
        });
      });

      // Send same content again without messageId — should also be processed
      eventHandlers.get('assistant.message')!({ content: 'No ID message' });

      await vi.waitFor(() => {
        const messageCalls = send.mock.calls.filter(
          (call: any[]) => call[0].type === 'copilot:message',
        );
        expect(messageCalls).toHaveLength(2); // Both processed
      });
    });

    it('should skip duplicate tool_start with same toolCallId', async () => {
      const eventHandlers = setupRelayCapture();

      handler(
        { type: 'copilot:send', data: { conversationId: 'conv-1', prompt: 'Hello' } },
        send,
      );

      await vi.waitFor(() => {
        expect(eventHandlers.has('tool.execution_start')).toBe(true);
      });

      send.mockClear();

      // Fire same tool_start twice (simulates listener accumulation)
      eventHandlers.get('tool.execution_start')!({ toolCallId: 'tc-1', toolName: 'bash', arguments: { command: 'echo hi' } });
      eventHandlers.get('tool.execution_start')!({ toolCallId: 'tc-1', toolName: 'bash', arguments: { command: 'echo hi' } });

      await vi.waitFor(() => {
        const toolStartCalls = send.mock.calls.filter((c: any[]) => c[0].type === 'copilot:tool_start');
        expect(toolStartCalls).toHaveLength(1); // Only first one forwarded
        expect(toolStartCalls[0][0].data.toolCallId).toBe('tc-1');
      });
    });

    it('should skip duplicate reasoning with same reasoningId', async () => {
      const eventHandlers = setupRelayCapture();

      handler(
        { type: 'copilot:send', data: { conversationId: 'conv-1', prompt: 'Hello' } },
        send,
      );

      await vi.waitFor(() => {
        expect(eventHandlers.has('assistant.reasoning')).toBe(true);
      });

      send.mockClear();

      // Fire reasoning deltas + complete, then duplicate complete (listener accumulation)
      eventHandlers.get('assistant.reasoning_delta')!({ reasoningId: 'r-1', deltaContent: 'Thinking' });
      eventHandlers.get('assistant.reasoning')!({ reasoningId: 'r-1', content: 'Thinking' });
      // Duplicate — should be skipped
      eventHandlers.get('assistant.reasoning')!({ reasoningId: 'r-1', content: 'Thinking' });

      await vi.waitFor(() => {
        const reasoningCalls = send.mock.calls.filter((c: any[]) => c[0].type === 'copilot:reasoning');
        expect(reasoningCalls).toHaveLength(1); // Only first complete forwarded
      });
    });

    it('should skip tool_end when corresponding tool_start was filtered', async () => {
      const eventHandlers = setupRelayCapture();

      handler(
        { type: 'copilot:send', data: { conversationId: 'conv-1', prompt: 'Hello' } },
        send,
      );

      await vi.waitFor(() => {
        expect(eventHandlers.has('tool.execution_start')).toBe(true);
      });

      // Process tool_start normally first
      eventHandlers.get('tool.execution_start')!({ toolCallId: 'tc-1', toolName: 'bash', arguments: {} });
      eventHandlers.get('tool.execution_complete')!({ toolCallId: 'tc-1', success: true, result: 'output' });
      eventHandlers.get('assistant.message')!({ messageId: 'msg-1', content: 'Done' });
      eventHandlers.get('session.idle')!({});

      send.mockClear();
      mockRepo.addMessage.mockClear();

      // Start new turn
      handler(
        { type: 'copilot:send', data: { conversationId: 'conv-1', prompt: 'Again' } },
        send,
      );

      await vi.waitFor(() => {
        expect(eventHandlers.has('tool.execution_start')).toBe(true);
      });

      send.mockClear();

      // Replayed tool_start (same tc-1) — should be filtered by dedup
      eventHandlers.get('tool.execution_start')!({ toolCallId: 'tc-1', toolName: 'bash', arguments: {} });
      // Replayed tool_end for tc-1 — should be skipped (no record in current accumulation)
      eventHandlers.get('tool.execution_complete')!({ toolCallId: 'tc-1', success: true, result: 'output' });

      await new Promise((r) => setTimeout(r, 50));

      const toolStartCalls = send.mock.calls.filter((c: any[]) => c[0].type === 'copilot:tool_start');
      expect(toolStartCalls).toHaveLength(0); // Replayed tool_start was filtered

      const toolEndCalls = send.mock.calls.filter((c: any[]) => c[0].type === 'copilot:tool_end');
      expect(toolEndCalls).toHaveLength(0); // Replayed tool_end was also filtered

      // New tool with different ID should pass through
      eventHandlers.get('tool.execution_start')!({ toolCallId: 'tc-2', toolName: 'bash', arguments: {} });
      eventHandlers.get('tool.execution_complete')!({ toolCallId: 'tc-2', success: true, result: 'new output' });

      await vi.waitFor(() => {
        const newToolStartCalls = send.mock.calls.filter((c: any[]) => c[0].type === 'copilot:tool_start');
        expect(newToolStartCalls).toHaveLength(1);
        expect(newToolStartCalls[0][0].data.toolCallId).toBe('tc-2');
      });
    });

    it('should filter replayed events across turns using persistent dedup sets', async () => {
      const eventHandlers = setupRelayCapture();

      // === TURN 1 ===
      handler(
        { type: 'copilot:send', data: { conversationId: 'conv-1', prompt: 'First' } },
        send,
      );

      await vi.waitFor(() => {
        expect(eventHandlers.has('assistant.message')).toBe(true);
      });

      // Turn 1 events
      eventHandlers.get('assistant.reasoning_delta')!({ reasoningId: 'r-1', deltaContent: 'Thinking T1' });
      eventHandlers.get('assistant.reasoning')!({ reasoningId: 'r-1', content: 'Thinking T1' });
      eventHandlers.get('tool.execution_start')!({ toolCallId: 'tc-1', toolName: 'bash', arguments: {} });
      eventHandlers.get('tool.execution_complete')!({ toolCallId: 'tc-1', success: true, result: 'out1' });
      eventHandlers.get('assistant.message')!({ messageId: 'msg-1', content: 'Answer 1' });
      eventHandlers.get('session.idle')!({});

      await vi.waitFor(() => {
        const assistantCalls = mockRepo.addMessage.mock.calls.filter(
          (call: any[]) => call[1].role === 'assistant',
        );
        expect(assistantCalls).toHaveLength(1);
      });

      mockRepo.addMessage.mockClear();
      send.mockClear();

      // === TURN 2 ===
      handler(
        { type: 'copilot:send', data: { conversationId: 'conv-1', prompt: 'Second' } },
        send,
      );

      await vi.waitFor(() => {
        expect(eventHandlers.has('assistant.message')).toBe(true);
      });

      send.mockClear();

      // Replayed turn 1 events (same IDs) — all should be filtered
      eventHandlers.get('assistant.reasoning_delta')!({ reasoningId: 'r-1', deltaContent: 'Thinking T1' });
      eventHandlers.get('assistant.reasoning')!({ reasoningId: 'r-1', content: 'Thinking T1' });
      eventHandlers.get('tool.execution_start')!({ toolCallId: 'tc-1', toolName: 'bash', arguments: {} });
      eventHandlers.get('tool.execution_complete')!({ toolCallId: 'tc-1', success: true, result: 'out1' });
      eventHandlers.get('assistant.message')!({ messageId: 'msg-1', content: 'Answer 1' });

      await new Promise((r) => setTimeout(r, 50));

      // Verify replayed events were filtered
      const replayedMessages = send.mock.calls.filter((c: any[]) => c[0].type === 'copilot:message');
      expect(replayedMessages).toHaveLength(0);
      const replayedToolStarts = send.mock.calls.filter((c: any[]) => c[0].type === 'copilot:tool_start');
      expect(replayedToolStarts).toHaveLength(0);
      const replayedReasoning = send.mock.calls.filter((c: any[]) => c[0].type === 'copilot:reasoning');
      expect(replayedReasoning).toHaveLength(0);

      // New turn 2 events (different IDs) — should pass through
      eventHandlers.get('assistant.reasoning_delta')!({ reasoningId: 'r-2', deltaContent: 'Thinking T2' });
      eventHandlers.get('assistant.reasoning')!({ reasoningId: 'r-2', content: 'Thinking T2' });
      eventHandlers.get('tool.execution_start')!({ toolCallId: 'tc-2', toolName: 'bash', arguments: {} });
      eventHandlers.get('tool.execution_complete')!({ toolCallId: 'tc-2', success: true, result: 'out2' });
      eventHandlers.get('assistant.message')!({ messageId: 'msg-2', content: 'Answer 2' });
      eventHandlers.get('session.idle')!({});

      await vi.waitFor(() => {
        const newMessages = send.mock.calls.filter((c: any[]) => c[0].type === 'copilot:message');
        expect(newMessages).toHaveLength(1);
        expect(newMessages[0][0].data.content).toBe('Answer 2');

        const newToolStarts = send.mock.calls.filter((c: any[]) => c[0].type === 'copilot:tool_start');
        expect(newToolStarts).toHaveLength(1);
        expect(newToolStarts[0][0].data.toolCallId).toBe('tc-2');

        // DB should only have turn 2 assistant message
        const assistantCalls = mockRepo.addMessage.mock.calls.filter(
          (call: any[]) => call[1].role === 'assistant',
        );
        expect(assistantCalls).toHaveLength(1);
        expect(assistantCalls[0][1].content).toBe('Answer 2');
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
