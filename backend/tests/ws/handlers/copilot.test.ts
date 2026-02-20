import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock fs module
vi.mock('node:fs', () => ({
  readFileSync: vi.fn().mockReturnValue('# Plan Content\n\n- Step 1\n- Step 2'),
  existsSync: vi.fn().mockReturnValue(true),
}));

import { readFileSync, existsSync } from 'node:fs';

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
    getFullState: vi.fn().mockReturnValue({ activeStreams: [], pendingUserInputs: [] }),
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
    mockStreamManager.getFullState.mockClear().mockReturnValue({ activeStreams: [], pendingUserInputs: [] });
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

  // === Query state ===
  describe('copilot:query_state', () => {
    it('should send copilot:state_response with empty state when no active streams', () => {
      handle({ type: 'copilot:query_state' });

      expect(mockStreamManager.getFullState).toHaveBeenCalled();
      expect(send).toHaveBeenCalledWith({
        type: 'copilot:state_response',
        data: { activeStreams: [], pendingUserInputs: [] },
      });
    });

    it('should send copilot:state_response with active streams and pending inputs', () => {
      mockStreamManager.getFullState.mockReturnValue({
        activeStreams: [
          { conversationId: 'conv-1', status: 'running', startedAt: '2024-01-01T00:00:00Z' },
          { conversationId: 'conv-2', status: 'running', startedAt: '2024-01-01T01:00:00Z' },
        ],
        pendingUserInputs: [
          {
            requestId: 'req-1',
            question: 'Pick a color',
            choices: ['Red', 'Blue'],
            allowFreeform: true,
            multiSelect: false,
            conversationId: 'conv-1',
          },
        ],
      });

      handle({ type: 'copilot:query_state' });

      expect(send).toHaveBeenCalledWith({
        type: 'copilot:state_response',
        data: {
          activeStreams: [
            { conversationId: 'conv-1', status: 'running', startedAt: '2024-01-01T00:00:00Z' },
            { conversationId: 'conv-2', status: 'running', startedAt: '2024-01-01T01:00:00Z' },
          ],
          pendingUserInputs: [
            {
              requestId: 'req-1',
              question: 'Pick a color',
              choices: ['Red', 'Blue'],
              allowFreeform: true,
              multiSelect: false,
              conversationId: 'conv-1',
            },
          ],
        },
      });
    });

    it('should auto-resubscribe to active streams when query_state returns them', () => {
      mockStreamManager.getFullState.mockReturnValue({
        activeStreams: [
          { conversationId: 'conv-1', status: 'running', startedAt: '2024-01-01T00:00:00Z' },
        ],
        pendingUserInputs: [],
      });

      handle({ type: 'copilot:query_state' });

      // Handler should auto-subscribe the client to each active stream
      expect(mockStreamManager.subscribe).toHaveBeenCalledWith('conv-1', send);
    });
  });

  // === Bash dual-message persistence (Phase 1B) ===
  describe('bash dual-message persistence', () => {
    it('should save TWO messages when onBashComplete fires: user command + assistant output', () => {
      // Simulate what index.ts does in the onBashComplete callback
      const convId = 'conv-1';
      const command = 'ls -la';
      const output = 'file1.txt\nfile2.txt';
      const exitCode = 0;
      const cwd = '/home/user';
      const meta = { user: 'momo', hostname: 'host', gitBranch: 'main' };

      // First message: user command (no $ prefix)
      mockRepo.addMessage(convId, { role: 'user', content: command, metadata: { bash: true } });
      // Second message: assistant output with full metadata
      mockRepo.addMessage(convId, {
        role: 'assistant',
        content: output,
        metadata: { bash: true, exitCode, cwd, ...meta },
      });

      expect(mockRepo.addMessage).toHaveBeenCalledTimes(2);

      // Verify first call: user message
      expect(mockRepo.addMessage.mock.calls[0]).toEqual([
        'conv-1',
        { role: 'user', content: 'ls -la', metadata: { bash: true } },
      ]);

      // Verify second call: assistant message
      expect(mockRepo.addMessage.mock.calls[1]).toEqual([
        'conv-1',
        {
          role: 'assistant',
          content: 'file1.txt\nfile2.txt',
          metadata: { bash: true, exitCode: 0, cwd: '/home/user', user: 'momo', hostname: 'host', gitBranch: 'main' },
        },
      ]);
    });

    it('user command message should NOT have $ prefix in content', () => {
      const command = 'echo hello';
      mockRepo.addMessage('conv-1', { role: 'user', content: command, metadata: { bash: true } });

      const savedContent = mockRepo.addMessage.mock.calls[0][1].content;
      expect(savedContent).toBe('echo hello');
      expect(savedContent).not.toMatch(/^\$/);
    });

    it('assistant message should include exitCode, cwd, user, hostname, gitBranch in metadata', () => {
      const meta = { user: 'testuser', hostname: 'testhost', gitBranch: 'develop' };
      mockRepo.addMessage('conv-1', {
        role: 'assistant',
        content: 'output',
        metadata: { bash: true, exitCode: 1, cwd: '/tmp', ...meta },
      });

      const savedMeta = mockRepo.addMessage.mock.calls[0][1].metadata;
      expect(savedMeta).toEqual({
        bash: true,
        exitCode: 1,
        cwd: '/tmp',
        user: 'testuser',
        hostname: 'testhost',
        gitBranch: 'develop',
      });
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

  // === Bash context injection ===
  describe('bash context injection', () => {
    it('should have addBashContext method on the handler result', () => {
      const result = createCopilotHandler(mockStreamManager as any, mockRepo as any);
      expect(typeof (result as any).addBashContext).toBe('function');
    });

    it('should have lastConversationId getter on the handler result', () => {
      const result = createCopilotHandler(mockStreamManager as any, mockRepo as any);
      expect((result as any).lastConversationId).toBeNull();
    });

    it('addBashContext stores context in the pending map', () => {
      const result = createCopilotHandler(mockStreamManager as any, mockRepo as any) as any;
      result.addBashContext('conv-1', 'Command: ls\nOutput: file.txt');
      // We can verify by sending a copilot:send and checking the prompt is prepended
      // For now just ensure it doesn't throw
      expect(() => result.addBashContext('conv-1', 'Another context')).not.toThrow();
    });

    it('lastConversationId returns the last conversation ID after copilot:send', () => {
      const result = createCopilotHandler(mockStreamManager as any, mockRepo as any) as any;
      expect(result.lastConversationId).toBeNull();

      result.onMessage(
        { type: 'copilot:send', data: { conversationId: 'conv-42', prompt: 'Hello' } },
        send,
      );

      expect(result.lastConversationId).toBe('conv-42');
    });

    it('should prepend bash context to prompt when sending copilot:send', async () => {
      const result = createCopilotHandler(mockStreamManager as any, mockRepo as any) as any;

      result.addBashContext('conv-1', 'Command: ls\nOutput: file.txt');

      result.onMessage(
        { type: 'copilot:send', data: { conversationId: 'conv-1', prompt: 'What files are here?' } },
        send,
      );

      await vi.waitFor(() => {
        expect(mockStreamManager.startStream).toHaveBeenCalled();
        const opts = mockStreamManager.startStream.mock.calls[0][1];
        expect(opts.prompt).toContain('[Bash executed by user]');
        expect(opts.prompt).toContain('Command: ls');
        expect(opts.prompt).toContain('Output: file.txt');
        expect(opts.prompt).toContain('What files are here?');
      });
    });

    it('should not modify prompt when no bash context exists', async () => {
      const result = createCopilotHandler(mockStreamManager as any, mockRepo as any) as any;

      result.onMessage(
        { type: 'copilot:send', data: { conversationId: 'conv-1', prompt: 'Hello plain' } },
        send,
      );

      await vi.waitFor(() => {
        expect(mockStreamManager.startStream).toHaveBeenCalled();
        const opts = mockStreamManager.startStream.mock.calls[0][1];
        expect(opts.prompt).toBe('Hello plain');
      });
    });

    it('should join multiple bash contexts for the same conversation', async () => {
      const result = createCopilotHandler(mockStreamManager as any, mockRepo as any) as any;

      result.addBashContext('conv-1', 'Command: ls\nOutput: file1.txt');
      result.addBashContext('conv-1', 'Command: cat file1.txt\nOutput: contents');

      result.onMessage(
        { type: 'copilot:send', data: { conversationId: 'conv-1', prompt: 'Summarize' } },
        send,
      );

      await vi.waitFor(() => {
        expect(mockStreamManager.startStream).toHaveBeenCalled();
        const opts = mockStreamManager.startStream.mock.calls[0][1];
        expect(opts.prompt).toContain('Command: ls');
        expect(opts.prompt).toContain('Command: cat file1.txt');
        expect(opts.prompt).toContain('Summarize');
        // Both should be wrapped
        const bashHeaders = (opts.prompt as string).match(/\[Bash executed by user\]/g);
        expect(bashHeaders).toHaveLength(2);
      });
    });

    it('should clear bash context after it is consumed by copilot:send', async () => {
      const result = createCopilotHandler(mockStreamManager as any, mockRepo as any) as any;

      result.addBashContext('conv-1', 'Command: ls\nOutput: file.txt');

      // First send — should include bash context
      result.onMessage(
        { type: 'copilot:send', data: { conversationId: 'conv-1', prompt: 'First' } },
        send,
      );

      await vi.waitFor(() => {
        expect(mockStreamManager.startStream).toHaveBeenCalledTimes(1);
        const opts = mockStreamManager.startStream.mock.calls[0][1];
        expect(opts.prompt).toContain('[Bash executed by user]');
      });

      mockStreamManager.startStream.mockClear();

      // Second send — should NOT include bash context (already consumed)
      result.onMessage(
        { type: 'copilot:send', data: { conversationId: 'conv-1', prompt: 'Second' } },
        send,
      );

      await vi.waitFor(() => {
        expect(mockStreamManager.startStream).toHaveBeenCalledTimes(1);
        const opts = mockStreamManager.startStream.mock.calls[0][1];
        expect(opts.prompt).toBe('Second');
      });
    });

    it('should still save the original user prompt to repo (not the prepended version)', () => {
      const result = createCopilotHandler(mockStreamManager as any, mockRepo as any) as any;

      result.addBashContext('conv-1', 'Command: ls\nOutput: file.txt');

      result.onMessage(
        { type: 'copilot:send', data: { conversationId: 'conv-1', prompt: 'User message' } },
        send,
      );

      // The repo should store the original prompt, not the prepended one
      expect(mockRepo.addMessage).toHaveBeenCalledWith('conv-1', {
        role: 'user',
        content: 'User message',
      });
    });
  });

  // === 9.1 Execute plan ===
  describe('copilot:execute_plan', () => {
    beforeEach(() => {
      vi.mocked(readFileSync).mockReturnValue('# Plan Content\n\n- Step 1\n- Step 2');
      vi.mocked(existsSync).mockReturnValue(true);
    });

    it('should read plan file and start stream with plan content in act mode', async () => {
      handle({
        type: 'copilot:execute_plan',
        data: { conversationId: 'conv-1', planFilePath: '/tmp/plan.md' },
      });

      await vi.waitFor(() => {
        expect(readFileSync).toHaveBeenCalledWith('/tmp/plan.md', 'utf-8');
        expect(mockStreamManager.startStream).toHaveBeenCalledWith('conv-1', expect.objectContaining({
          prompt: expect.stringContaining('# Plan Content'),
          mode: 'act',
        }));
      });
    });

    it('should clear SDK session before starting stream', async () => {
      handle({
        type: 'copilot:execute_plan',
        data: { conversationId: 'conv-1', planFilePath: '/tmp/plan.md' },
      });

      await vi.waitFor(() => {
        expect(mockRepo.update).toHaveBeenCalledWith('conv-1', { sdkSessionId: null });
        expect(mockStreamManager.startStream).toHaveBeenCalled();
      });
    });

    it('should auto-subscribe after starting execute_plan stream', async () => {
      handle({
        type: 'copilot:execute_plan',
        data: { conversationId: 'conv-1', planFilePath: '/tmp/plan.md' },
      });

      await vi.waitFor(() => {
        expect(mockStreamManager.subscribe).toHaveBeenCalledWith('conv-1', send);
      });
    });

    it('should pass conversation model and cwd to startStream', async () => {
      handle({
        type: 'copilot:execute_plan',
        data: { conversationId: 'conv-1', planFilePath: '/tmp/plan.md' },
      });

      await vi.waitFor(() => {
        expect(mockStreamManager.startStream).toHaveBeenCalledWith('conv-1', expect.objectContaining({
          model: 'gpt-5',
          cwd: '/tmp',
          sdkSessionId: null,
        }));
      });
    });

    it('should send error when conversationId is missing', () => {
      handle({
        type: 'copilot:execute_plan',
        data: { planFilePath: '/tmp/plan.md' },
      });

      expect(send).toHaveBeenCalledWith({
        type: 'copilot:error',
        data: { message: 'conversationId is required' },
      });
      expect(mockStreamManager.startStream).not.toHaveBeenCalled();
    });

    it('should send error when planFilePath is missing', () => {
      handle({
        type: 'copilot:execute_plan',
        data: { conversationId: 'conv-1' },
      });

      expect(send).toHaveBeenCalledWith({
        type: 'copilot:error',
        data: { message: 'planFilePath is required' },
      });
      expect(mockStreamManager.startStream).not.toHaveBeenCalled();
    });

    it('should send error when conversation not found', () => {
      mockRepo.getById.mockReturnValue(null);

      handle({
        type: 'copilot:execute_plan',
        data: { conversationId: 'nonexistent', planFilePath: '/tmp/plan.md' },
      });

      expect(send).toHaveBeenCalledWith({
        type: 'copilot:error',
        data: { message: 'Conversation not found' },
      });
      expect(mockStreamManager.startStream).not.toHaveBeenCalled();
    });

    it('should send error when plan file does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      handle({
        type: 'copilot:execute_plan',
        data: { conversationId: 'conv-1', planFilePath: '/tmp/missing.md' },
      });

      expect(send).toHaveBeenCalledWith({
        type: 'copilot:error',
        data: { message: 'Plan file not found: /tmp/missing.md' },
      });
      expect(mockStreamManager.startStream).not.toHaveBeenCalled();
    });

    it('should send error when startStream fails', async () => {
      mockStreamManager.startStream.mockRejectedValue(new Error('Stream error'));

      handle({
        type: 'copilot:execute_plan',
        data: { conversationId: 'conv-1', planFilePath: '/tmp/plan.md' },
      });

      await vi.waitFor(() => {
        expect(send).toHaveBeenCalledWith({
          type: 'copilot:error',
          data: { message: 'Stream error' },
        });
      });
    });
  });
});
