import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock all dependencies
const { mockStreamManager, mockRepo } = vi.hoisted(() => {
  const _unsubFn = vi.fn();
  const _mockStreamManager = {
    startStream: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockReturnValue(_unsubFn),
    abortStream: vi.fn().mockResolvedValue(undefined),
    getActiveStreamIds: vi.fn().mockReturnValue([]),
    setMode: vi.fn(),
    handleUserInputResponse: vi.fn(),
    _unsubFn,
  };

  const _mockRepo = {
    getById: vi.fn().mockReturnValue({
      id: 'conv-1',
      title: 'Test',
      sdkSessionId: 'sdk-1',
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
    mockStreamManager: _mockStreamManager,
    mockRepo: _mockRepo,
  };
});

import { createCopilotHandler } from '../../../src/ws/handlers/copilot.js';
import type { WsMessage, WsHandlerObject } from '../../../src/ws/types.js';

describe('copilot WS handler (v2 — StreamManager delegation)', () => {
  let handlerObj: WsHandlerObject;
  let send: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockStreamManager.startStream.mockClear().mockResolvedValue(undefined);
    mockStreamManager.subscribe.mockClear().mockReturnValue(mockStreamManager._unsubFn);
    mockStreamManager.abortStream.mockClear().mockResolvedValue(undefined);
    mockStreamManager.getActiveStreamIds.mockClear().mockReturnValue([]);
    mockStreamManager.setMode.mockClear();
    mockStreamManager.handleUserInputResponse.mockClear();
    mockStreamManager._unsubFn.mockClear();
    mockRepo.getById.mockClear().mockReturnValue({
      id: 'conv-1',
      title: 'Test',
      sdkSessionId: 'sdk-1',
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
    handlerObj = createCopilotHandler(mockStreamManager as any, mockRepo as any);
  });

  function handle(msg: WsMessage) {
    handlerObj.onMessage(msg, send);
  }

  // === 6.1 Handler delegation: copilot:send ===
  describe('copilot:send delegation', () => {
    it('should call streamManager.startStream with conversation details', async () => {
      handle({
        type: 'copilot:send',
        data: { conversationId: 'conv-1', prompt: 'Hello' },
      });

      await vi.waitFor(() => {
        expect(mockStreamManager.startStream).toHaveBeenCalledWith('conv-1', {
          prompt: 'Hello',
          sdkSessionId: 'sdk-1',
          model: 'gpt-5',
          cwd: '/tmp',
          activePresets: [],
          disabledSkills: [],
        });
      });
    });

    it('should auto-subscribe after starting stream', async () => {
      handle({
        type: 'copilot:send',
        data: { conversationId: 'conv-1', prompt: 'Hello' },
      });

      await vi.waitFor(() => {
        expect(mockStreamManager.subscribe).toHaveBeenCalledWith('conv-1', send);
      });
    });

    it('should save user message to repo', () => {
      handle({
        type: 'copilot:send',
        data: { conversationId: 'conv-1', prompt: 'Hello' },
      });

      expect(mockRepo.addMessage).toHaveBeenCalledWith('conv-1', {
        role: 'user',
        content: 'Hello',
      });
    });

    it('should save user message with attachment metadata when files are provided', () => {
      handle({
        type: 'copilot:send',
        data: {
          conversationId: 'conv-1',
          prompt: 'See image',
          files: [
            { id: 'f1', originalName: 'photo.png', mimeType: 'image/png', size: 1024, path: '/uploads/f1-photo.png' },
          ],
        },
      });

      expect(mockRepo.addMessage).toHaveBeenCalledWith('conv-1', {
        role: 'user',
        content: 'See image',
        metadata: {
          attachments: [
            { id: 'f1', originalName: 'photo.png', mimeType: 'image/png', size: 1024 },
          ],
        },
      });
    });

    it('should NOT include metadata when no files are provided', () => {
      handle({
        type: 'copilot:send',
        data: { conversationId: 'conv-1', prompt: 'Hello' },
      });

      expect(mockRepo.addMessage).toHaveBeenCalledWith('conv-1', {
        role: 'user',
        content: 'Hello',
      });
    });

    it('should pass activePresets to streamManager.startStream', async () => {
      handle({
        type: 'copilot:send',
        data: { conversationId: 'conv-1', prompt: 'Hello', activePresets: ['code-review', 'devops'] },
      });

      await vi.waitFor(() => {
        expect(mockStreamManager.startStream).toHaveBeenCalledWith('conv-1', {
          prompt: 'Hello',
          sdkSessionId: 'sdk-1',
          model: 'gpt-5',
          cwd: '/tmp',
          activePresets: ['code-review', 'devops'],
          disabledSkills: [],
        });
      });
    });

    it('should pass disabledSkills to streamManager.startStream', async () => {
      handle({
        type: 'copilot:send',
        data: { conversationId: 'conv-1', prompt: 'Hello', disabledSkills: ['old-skill'] },
      });

      await vi.waitFor(() => {
        expect(mockStreamManager.startStream).toHaveBeenCalledWith('conv-1', expect.objectContaining({
          disabledSkills: ['old-skill'],
        }));
      });
    });

    it('should default disabledSkills to empty array when not provided', async () => {
      handle({
        type: 'copilot:send',
        data: { conversationId: 'conv-1', prompt: 'Hello' },
      });

      await vi.waitFor(() => {
        expect(mockStreamManager.startStream).toHaveBeenCalledWith('conv-1', expect.objectContaining({
          disabledSkills: [],
        }));
      });
    });

    it('should default activePresets to empty array when not provided', async () => {
      handle({
        type: 'copilot:send',
        data: { conversationId: 'conv-1', prompt: 'Hello' },
      });

      await vi.waitFor(() => {
        expect(mockStreamManager.startStream).toHaveBeenCalledWith('conv-1', expect.objectContaining({
          activePresets: [],
        }));
      });
    });

    it('should send error when prompt is missing', () => {
      handle({
        type: 'copilot:send',
        data: { conversationId: 'conv-1' },
      });

      expect(send).toHaveBeenCalledWith({
        type: 'copilot:error',
        data: { message: 'prompt is required' },
      });
      expect(mockStreamManager.startStream).not.toHaveBeenCalled();
    });

    it('should send error when conversationId is missing', () => {
      handle({
        type: 'copilot:send',
        data: { prompt: 'Hello' },
      });

      expect(send).toHaveBeenCalledWith({
        type: 'copilot:error',
        data: { message: 'conversationId is required' },
      });
    });

    it('should send error when conversation not found', () => {
      mockRepo.getById.mockReturnValue(null);

      handle({
        type: 'copilot:send',
        data: { conversationId: 'nonexistent', prompt: 'Hello' },
      });

      expect(send).toHaveBeenCalledWith({
        type: 'copilot:error',
        data: { message: 'Conversation not found' },
      });
      expect(mockStreamManager.startStream).not.toHaveBeenCalled();
    });

    it('should send error when startStream fails', async () => {
      mockStreamManager.startStream.mockRejectedValue(new Error('Max concurrency exceeded'));

      handle({
        type: 'copilot:send',
        data: { conversationId: 'conv-1', prompt: 'Hello' },
      });

      await vi.waitFor(() => {
        expect(send).toHaveBeenCalledWith({
          type: 'copilot:error',
          data: { message: 'Max concurrency exceeded' },
        });
      });
    });
  });

  // === 6.2 Subscribe/Unsubscribe ===
  describe('copilot:subscribe', () => {
    it('should call streamManager.subscribe and send stream-status', () => {
      handle({
        type: 'copilot:subscribe',
        data: { conversationId: 'conv-1' },
      });

      expect(mockStreamManager.subscribe).toHaveBeenCalledWith('conv-1', send);
      expect(send).toHaveBeenCalledWith({
        type: 'copilot:stream-status',
        data: { conversationId: 'conv-1', subscribed: true },
      });
    });

    it('should send error when stream not found', () => {
      mockStreamManager.subscribe.mockReturnValue(null);

      handle({
        type: 'copilot:subscribe',
        data: { conversationId: 'nonexistent' },
      });

      expect(send).toHaveBeenCalledWith({
        type: 'copilot:stream-status',
        data: { conversationId: 'nonexistent', subscribed: false },
      });
    });
  });

  describe('copilot:unsubscribe', () => {
    it('should call stored unsubscribe function', async () => {
      // First subscribe
      handle({
        type: 'copilot:send',
        data: { conversationId: 'conv-1', prompt: 'Hello' },
      });

      await vi.waitFor(() => {
        expect(mockStreamManager.subscribe).toHaveBeenCalled();
      });

      // Then unsubscribe
      handle({
        type: 'copilot:unsubscribe',
        data: { conversationId: 'conv-1' },
      });

      expect(mockStreamManager._unsubFn).toHaveBeenCalled();
    });
  });

  // === 6.3 Status ===
  describe('copilot:status', () => {
    it('should return active stream IDs', () => {
      mockStreamManager.getActiveStreamIds.mockReturnValue(['conv-1', 'conv-2']);

      handle({ type: 'copilot:status' });

      expect(send).toHaveBeenCalledWith({
        type: 'copilot:active-streams',
        data: { streamIds: ['conv-1', 'conv-2'] },
      });
    });

    it('should return empty array when no active streams', () => {
      handle({ type: 'copilot:status' });

      expect(send).toHaveBeenCalledWith({
        type: 'copilot:active-streams',
        data: { streamIds: [] },
      });
    });
  });

  // === 6.4 Abort ===
  describe('copilot:abort', () => {
    it('should call streamManager.abortStream with conversationId', async () => {
      handle({
        type: 'copilot:abort',
        data: { conversationId: 'conv-1' },
      });

      await vi.waitFor(() => {
        expect(mockStreamManager.abortStream).toHaveBeenCalledWith('conv-1');
      });
    });

    it('should fallback to last active conversationId when not provided', async () => {
      // First send to set the active conversation
      handle({
        type: 'copilot:send',
        data: { conversationId: 'conv-1', prompt: 'Hello' },
      });

      await vi.waitFor(() => {
        expect(mockStreamManager.startStream).toHaveBeenCalled();
      });

      // Abort without conversationId
      handle({ type: 'copilot:abort' });

      await vi.waitFor(() => {
        expect(mockStreamManager.abortStream).toHaveBeenCalledWith('conv-1');
      });
    });
  });

  // === 6.5 onDisconnect ===
  describe('onDisconnect', () => {
    it('should clean up all subscriptions but not stop streams', async () => {
      // Subscribe to a stream
      handle({
        type: 'copilot:send',
        data: { conversationId: 'conv-1', prompt: 'Hello' },
      });

      await vi.waitFor(() => {
        expect(mockStreamManager.subscribe).toHaveBeenCalled();
      });

      // Disconnect
      handlerObj.onDisconnect!(send);

      // Should have called unsubscribe
      expect(mockStreamManager._unsubFn).toHaveBeenCalled();
      // Should NOT have called abortStream (streams continue in background)
      expect(mockStreamManager.abortStream).not.toHaveBeenCalled();
    });

    it('should handle disconnect with no active subscriptions', () => {
      expect(() => handlerObj.onDisconnect!(send)).not.toThrow();
    });
  });

  // === Plan mode ===
  describe('plan mode', () => {
    it('should forward mode from copilot:send to streamManager.startStream', async () => {
      handle({
        type: 'copilot:send',
        data: { conversationId: 'conv-1', prompt: 'Hello', mode: 'plan' },
      });

      await vi.waitFor(() => {
        expect(mockStreamManager.startStream).toHaveBeenCalledWith(
          'conv-1',
          expect.objectContaining({ mode: 'plan' }),
        );
      });
    });

    it('should forward act mode from copilot:send', async () => {
      handle({
        type: 'copilot:send',
        data: { conversationId: 'conv-1', prompt: 'Hello', mode: 'act' },
      });

      await vi.waitFor(() => {
        expect(mockStreamManager.startStream).toHaveBeenCalledWith(
          'conv-1',
          expect.objectContaining({ mode: 'act' }),
        );
      });
    });

    it('should not include mode when not provided in copilot:send', async () => {
      handle({
        type: 'copilot:send',
        data: { conversationId: 'conv-1', prompt: 'Hello' },
      });

      await vi.waitFor(() => {
        expect(mockStreamManager.startStream).toHaveBeenCalled();
        const opts = mockStreamManager.startStream.mock.calls[0][1];
        expect(opts.mode).toBeUndefined();
      });
    });

    it('should handle copilot:set_mode and call streamManager.setMode', () => {
      handle({
        type: 'copilot:set_mode',
        data: { conversationId: 'conv-1', mode: 'plan' },
      });

      expect(mockStreamManager.setMode).toHaveBeenCalledWith('conv-1', 'plan');
    });

    it('should send error for copilot:set_mode without conversationId', () => {
      handle({
        type: 'copilot:set_mode',
        data: { mode: 'plan' },
      });

      expect(send).toHaveBeenCalledWith({
        type: 'copilot:error',
        data: { message: 'conversationId is required' },
      });
      expect(mockStreamManager.setMode).not.toHaveBeenCalled();
    });

    it('should send error for copilot:set_mode without mode', () => {
      handle({
        type: 'copilot:set_mode',
        data: { conversationId: 'conv-1' },
      });

      expect(send).toHaveBeenCalledWith({
        type: 'copilot:error',
        data: { message: 'mode is required' },
      });
      expect(mockStreamManager.setMode).not.toHaveBeenCalled();
    });
  });

  // === User input response ===
  describe('copilot:user_input_response', () => {
    it('should call streamManager.handleUserInputResponse with correct args', () => {
      handle({
        type: 'copilot:user_input_response',
        data: { conversationId: 'conv-1', requestId: 'req-1', answer: 'Option A', wasFreeform: false },
      });

      expect(mockStreamManager.handleUserInputResponse).toHaveBeenCalledWith(
        'conv-1',
        'req-1',
        'Option A',
        false,
      );
    });

    it('should support freeform responses', () => {
      handle({
        type: 'copilot:user_input_response',
        data: { conversationId: 'conv-1', requestId: 'req-2', answer: 'My custom text', wasFreeform: true },
      });

      expect(mockStreamManager.handleUserInputResponse).toHaveBeenCalledWith(
        'conv-1',
        'req-2',
        'My custom text',
        true,
      );
    });

    it('should send error when conversationId is missing', () => {
      handle({
        type: 'copilot:user_input_response',
        data: { requestId: 'req-1', answer: 'A' },
      });

      expect(send).toHaveBeenCalledWith({
        type: 'copilot:error',
        data: { message: 'conversationId is required' },
      });
      expect(mockStreamManager.handleUserInputResponse).not.toHaveBeenCalled();
    });

    it('should send error when requestId is missing', () => {
      handle({
        type: 'copilot:user_input_response',
        data: { conversationId: 'conv-1', answer: 'A' },
      });

      expect(send).toHaveBeenCalledWith({
        type: 'copilot:error',
        data: { message: 'requestId is required' },
      });
      expect(mockStreamManager.handleUserInputResponse).not.toHaveBeenCalled();
    });

    it('should send error when answer is missing', () => {
      handle({
        type: 'copilot:user_input_response',
        data: { conversationId: 'conv-1', requestId: 'req-1' },
      });

      expect(send).toHaveBeenCalledWith({
        type: 'copilot:error',
        data: { message: 'answer is required' },
      });
      expect(mockStreamManager.handleUserInputResponse).not.toHaveBeenCalled();
    });
  });

  // === Handler shape ===
  describe('handler shape', () => {
    it('should return WsHandlerObject with onMessage and onDisconnect', () => {
      expect(typeof handlerObj.onMessage).toBe('function');
      expect(typeof handlerObj.onDisconnect).toBe('function');
    });

    it('should send error for unknown copilot sub-type', () => {
      handle({ type: 'copilot:unknown' });

      expect(send).toHaveBeenCalledWith({
        type: 'error',
        data: { message: 'Unknown copilot action: copilot:unknown' },
      });
    });
  });
});
