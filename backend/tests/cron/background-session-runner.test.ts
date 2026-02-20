import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackgroundSessionRunner } from '../../src/cron/background-session-runner.js';
import type { BackgroundRunOptions, BackgroundExecutionResult } from '../../src/cron/background-session-runner.js';

// Helper to create a mock session with controllable event emitter
function createMockSession() {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();

  const session = {
    sessionId: 'test-session-1',
    send: vi.fn().mockResolvedValue('response-text'),
    abort: vi.fn().mockResolvedValue(undefined),
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
      return () => {
        listeners.get(event)?.delete(handler);
      };
    }),
  };

  function emit(event: string, data?: any) {
    const handlers = listeners.get(event);
    if (handlers) {
      for (const h of handlers) h(data ? { data } : undefined);
    }
  }

  return { session, emit, listeners };
}

function createMockSessionManager(session: any) {
  return {
    createSession: vi.fn().mockResolvedValue(session),
  };
}

describe('BackgroundSessionRunner', () => {
  let mockSession: ReturnType<typeof createMockSession>;
  let mockSessionManager: ReturnType<typeof createMockSessionManager>;
  let runner: BackgroundSessionRunner;

  beforeEach(() => {
    mockSession = createMockSession();
    mockSessionManager = createMockSessionManager(mockSession.session);
    runner = new BackgroundSessionRunner(mockSessionManager as any);
  });

  describe('successful execution', () => {
    it('should create session, send prompt, and collect results', async () => {
      const options: BackgroundRunOptions = {
        prompt: 'check disk usage',
        model: 'gpt-4o',
        workingDirectory: '/tmp',
      };

      // Schedule events to fire after send() is called
      mockSession.session.send.mockImplementation(async () => {
        // Simulate assistant sending content
        mockSession.emit('assistant.message_delta', { messageId: 'm1', deltaContent: 'Disk ' });
        mockSession.emit('assistant.message_delta', { messageId: 'm1', deltaContent: 'is fine.' });
        mockSession.emit('assistant.message', { messageId: 'm1', content: 'Disk is fine.' });
        mockSession.emit('assistant.usage', { inputTokens: 100, outputTokens: 50, cacheReadTokens: 10, cacheWriteTokens: 5 });
        mockSession.emit('session.idle');
        return 'Disk is fine.';
      });

      const result = await runner.run(options);

      expect(mockSessionManager.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
          workingDirectory: '/tmp',
        }),
      );
      expect(mockSession.session.send).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: 'check disk usage' }),
      );
      expect(result.contentSegments).toContain('Disk is fine.');
      expect(result.usage).toEqual(
        expect.objectContaining({ inputTokens: 100, outputTokens: 50 }),
      );
      expect(result.error).toBeUndefined();
    });

    it('should pass tools and skill options to createSession', async () => {
      const tools = [{ name: 'test-tool' }];
      const options: BackgroundRunOptions = {
        prompt: 'hello',
        model: 'gpt-4o',
        workingDirectory: '/tmp',
        tools,
        skillDirectories: ['/skills'],
        disabledSkills: ['skill-a'],
      };

      mockSession.session.send.mockImplementation(async () => {
        mockSession.emit('session.idle');
        return '';
      });

      await runner.run(options);

      expect(mockSessionManager.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          tools,
          skillDirectories: ['/skills'],
          disabledSkills: ['skill-a'],
        }),
      );
    });
  });

  describe('tool call collection', () => {
    it('should collect tool execution records', async () => {
      mockSession.session.send.mockImplementation(async () => {
        mockSession.emit('tool.execution_start', { toolCallId: 't1', toolName: 'bash', arguments: { command: 'ls' } });
        mockSession.emit('tool.execution_complete', { toolCallId: 't1', success: true, result: 'file.txt' });
        mockSession.emit('tool.execution_start', { toolCallId: 't2', toolName: 'read', arguments: { path: '/x' } });
        mockSession.emit('tool.execution_complete', { toolCallId: 't2', success: false, error: 'not found' });
        mockSession.emit('session.idle');
        return 'done';
      });

      const result = await runner.run({
        prompt: 'test',
        model: 'gpt-4o',
        workingDirectory: '/tmp',
      });

      expect(result.toolRecords).toHaveLength(2);
      expect(result.toolRecords[0]).toEqual(expect.objectContaining({
        toolCallId: 't1',
        toolName: 'bash',
        status: 'success',
      }));
      expect(result.toolRecords[1]).toEqual(expect.objectContaining({
        toolCallId: 't2',
        toolName: 'read',
        status: 'error',
        error: 'not found',
      }));
    });
  });

  describe('reasoning collection', () => {
    it('should accumulate reasoning deltas', async () => {
      mockSession.session.send.mockImplementation(async () => {
        mockSession.emit('assistant.reasoning_delta', { reasoningId: 'r1', deltaContent: 'I think ' });
        mockSession.emit('assistant.reasoning_delta', { reasoningId: 'r1', deltaContent: 'we should...' });
        mockSession.emit('assistant.reasoning', { reasoningId: 'r1', content: 'I think we should...' });
        mockSession.emit('session.idle');
        return 'result';
      });

      const result = await runner.run({
        prompt: 'think about it',
        model: 'gpt-4o',
        workingDirectory: '/tmp',
      });

      expect(result.reasoningText).toContain('I think ');
      expect(result.reasoningText).toContain('we should...');
    });
  });

  describe('turn segments', () => {
    it('should build turn segments from messages and tools', async () => {
      mockSession.session.send.mockImplementation(async () => {
        mockSession.emit('assistant.message', { messageId: 'm1', content: 'Let me check' });
        mockSession.emit('tool.execution_start', { toolCallId: 't1', toolName: 'bash', arguments: { command: 'df' } });
        mockSession.emit('tool.execution_complete', { toolCallId: 't1', success: true, result: '50% used' });
        mockSession.emit('assistant.message', { messageId: 'm2', content: 'Disk is 50% used' });
        mockSession.emit('session.idle');
        return 'Disk is 50% used';
      });

      const result = await runner.run({
        prompt: 'check disk',
        model: 'gpt-4o',
        workingDirectory: '/tmp',
      });

      expect(result.turnSegments.length).toBeGreaterThanOrEqual(2);
      // Should have at least a text segment and tool segment
      const types = result.turnSegments.map((s: any) => s.type);
      expect(types).toContain('text');
      expect(types).toContain('tool');
    });
  });

  describe('timeout', () => {
    it('should timeout and abort if session.idle never fires', async () => {
      // send() resolves immediately with a turn ID, but session.idle never fires
      mockSession.session.send.mockResolvedValue('turn-id-123');

      const result = await runner.run({
        prompt: 'hang forever',
        model: 'gpt-4o',
        workingDirectory: '/tmp',
        timeoutMs: 200,
      });

      expect(result.error).toBeDefined();
      expect(result.error).toContain('timeout');
      expect(mockSession.session.abort).toHaveBeenCalled();
    }, 10000);
  });

  describe('session creation failure', () => {
    it('should return error when session creation fails', async () => {
      mockSessionManager.createSession.mockRejectedValue(new Error('Auth failed'));

      const result = await runner.run({
        prompt: 'test',
        model: 'gpt-4o',
        workingDirectory: '/tmp',
      });

      expect(result.error).toBe('Auth failed');
      expect(result.turnSegments).toEqual([]);
      expect(result.toolRecords).toEqual([]);
    });
  });

  describe('session error event', () => {
    it('should capture session errors', async () => {
      mockSession.session.send.mockImplementation(async () => {
        mockSession.emit('session.error', { errorType: 'rate_limit', message: 'Too many requests' });
        mockSession.emit('session.idle');
        return '';
      });

      const result = await runner.run({
        prompt: 'test',
        model: 'gpt-4o',
        workingDirectory: '/tmp',
      });

      // The error should be captured but the session may still complete
      // since idle is emitted after error
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Too many requests');
    });
  });

  describe('auto-approve permissions', () => {
    it('should pass autoApprovePermission to session creation', async () => {
      mockSession.session.send.mockImplementation(async () => {
        mockSession.emit('session.idle');
        return '';
      });

      await runner.run({
        prompt: 'test',
        model: 'gpt-4o',
        workingDirectory: '/tmp',
      });

      const callArgs = mockSessionManager.createSession.mock.calls[0][0];
      // Should have onPermissionRequest set
      expect(callArgs.onPermissionRequest).toBeDefined();
      // The permission handler should auto-approve
      const result = callArgs.onPermissionRequest({ kind: 'bash' }, { sessionId: 's1' });
      expect(result).toEqual({ kind: 'approved' });
    });

    it('should NOT set onUserInputRequest (background does not support interaction)', async () => {
      mockSession.session.send.mockImplementation(async () => {
        mockSession.emit('session.idle');
        return '';
      });

      await runner.run({
        prompt: 'test',
        model: 'gpt-4o',
        workingDirectory: '/tmp',
      });

      const callArgs = mockSessionManager.createSession.mock.calls[0][0];
      expect(callArgs.onUserInputRequest).toBeUndefined();
    });
  });
});
