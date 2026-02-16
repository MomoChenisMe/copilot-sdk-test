import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock CopilotClient and session
const { mockSession, mockClient, MockCopilotClient } = vi.hoisted(() => {
  const _mockSession = {
    sessionId: 'sdk-session-123',
    send: vi.fn().mockResolvedValue('msg-1'),
    abort: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
    on: vi.fn().mockReturnValue(() => {}),
  };

  const _mockClient = {
    createSession: vi.fn().mockResolvedValue(_mockSession),
    resumeSession: vi.fn().mockResolvedValue(_mockSession),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue([]),
    listModels: vi.fn().mockResolvedValue([]),
    getState: vi.fn().mockReturnValue('connected'),
    on: vi.fn().mockReturnValue(() => {}),
  };

  const _MockCopilotClient = vi.fn(() => _mockClient);
  return { mockSession: _mockSession, mockClient: _mockClient, MockCopilotClient: _MockCopilotClient };
});

vi.mock('@github/copilot-sdk', () => ({
  CopilotClient: MockCopilotClient,
}));

import { SessionManager } from '../../src/copilot/session-manager.js';
import { ClientManager } from '../../src/copilot/client-manager.js';

describe('SessionManager', () => {
  let clientManager: ClientManager;
  let sessionManager: SessionManager;

  beforeEach(() => {
    mockSession.send.mockClear().mockResolvedValue('msg-1');
    mockSession.abort.mockClear().mockResolvedValue(undefined);
    mockSession.destroy.mockClear().mockResolvedValue(undefined);
    mockSession.on.mockClear().mockReturnValue(() => {});
    mockClient.createSession.mockClear().mockResolvedValue(mockSession);
    mockClient.resumeSession.mockClear().mockResolvedValue(mockSession);
    mockClient.start.mockClear().mockResolvedValue(undefined);
    MockCopilotClient.mockClear();

    clientManager = new ClientManager();
    sessionManager = new SessionManager(clientManager);
  });

  describe('createSession', () => {
    it('should create a new SDK session', async () => {
      const session = await sessionManager.createSession({
        model: 'gpt-5',
        workingDirectory: '/home/user',
      });

      expect(session.sessionId).toBe('sdk-session-123');
      expect(mockClient.createSession).toHaveBeenCalledOnce();

      const config = mockClient.createSession.mock.calls[0][0];
      expect(config.model).toBe('gpt-5');
      expect(config.workingDirectory).toBe('/home/user');
      expect(config.infiniteSessions).toEqual({ enabled: true });
    });

    it('should pass systemMessage when provided', async () => {
      await sessionManager.createSession({
        model: 'gpt-5',
        workingDirectory: '/home/user',
        systemMessage: { mode: 'append', content: 'Custom system prompt' },
      });

      const config = mockClient.createSession.mock.calls[0][0];
      expect(config.systemMessage).toEqual({ mode: 'append', content: 'Custom system prompt' });
    });

    it('should not include systemMessage when not provided', async () => {
      await sessionManager.createSession({
        model: 'gpt-5',
        workingDirectory: '/home/user',
      });

      const config = mockClient.createSession.mock.calls[0][0];
      expect(config.systemMessage).toBeUndefined();
    });

    it('should set onPermissionRequest to auto-approve', async () => {
      await sessionManager.createSession({
        model: 'gpt-5',
        workingDirectory: '/tmp',
      });

      const config = mockClient.createSession.mock.calls[0][0];
      expect(typeof config.onPermissionRequest).toBe('function');

      // Verify auto-approve
      const result = config.onPermissionRequest({ kind: 'shell' }, { sessionId: 's-1' });
      expect(result).toEqual({ kind: 'approved' });
    });
  });

  describe('resumeSession', () => {
    it('should resume an existing SDK session', async () => {
      const session = await sessionManager.resumeSession('sdk-session-123');

      expect(session.sessionId).toBe('sdk-session-123');
      expect(mockClient.resumeSession).toHaveBeenCalledWith('sdk-session-123', expect.any(Object));
    });

    it('should pass systemMessage when provided', async () => {
      await sessionManager.resumeSession('sdk-session-123', {
        systemMessage: { mode: 'append', content: 'Resume prompt' },
      });

      const resumeConfig = mockClient.resumeSession.mock.calls[0][1];
      expect(resumeConfig.systemMessage).toEqual({ mode: 'append', content: 'Resume prompt' });
    });
  });

  describe('sendMessage', () => {
    it('should send a message to a session', async () => {
      const session = await sessionManager.createSession({
        model: 'gpt-5',
        workingDirectory: '/tmp',
      });

      const msgId = await sessionManager.sendMessage(session, 'Hello AI');

      expect(msgId).toBe('msg-1');
      expect(mockSession.send).toHaveBeenCalledWith({ prompt: 'Hello AI' });
    });
  });

  describe('abortMessage', () => {
    it('should abort the current message', async () => {
      const session = await sessionManager.createSession({
        model: 'gpt-5',
        workingDirectory: '/tmp',
      });

      await sessionManager.abortMessage(session);

      expect(mockSession.abort).toHaveBeenCalledOnce();
    });
  });

  describe('skill config', () => {
    it('should pass skillDirectories to session config', async () => {
      await sessionManager.createSession({
        model: 'gpt-5',
        workingDirectory: '/tmp',
        skillDirectories: ['/data/skills/my-skill', '/data/skills/other-skill'],
      });

      const config = mockClient.createSession.mock.calls[0][0];
      expect(config.skillDirectories).toEqual(['/data/skills/my-skill', '/data/skills/other-skill']);
    });

    it('should pass disabledSkills to session config', async () => {
      await sessionManager.createSession({
        model: 'gpt-5',
        workingDirectory: '/tmp',
        disabledSkills: ['deprecated-skill'],
      });

      const config = mockClient.createSession.mock.calls[0][0];
      expect(config.disabledSkills).toEqual(['deprecated-skill']);
    });

    it('should not include skillDirectories when not provided', async () => {
      await sessionManager.createSession({
        model: 'gpt-5',
        workingDirectory: '/tmp',
      });

      const config = mockClient.createSession.mock.calls[0][0];
      expect(config.skillDirectories).toBeUndefined();
      expect(config.disabledSkills).toBeUndefined();
    });
  });

  describe('tools config', () => {
    const fakeTool = {
      name: 'test_tool',
      description: 'A test tool',
      handler: async () => ({ ok: true }),
    };

    it('should pass tools to session config on createSession', async () => {
      await sessionManager.createSession({
        model: 'gpt-5',
        workingDirectory: '/tmp',
        tools: [fakeTool],
      });

      const config = mockClient.createSession.mock.calls[0][0];
      expect(config.tools).toEqual([fakeTool]);
    });

    it('should pass tools to resume config on resumeSession', async () => {
      await sessionManager.resumeSession('sdk-session-123', {
        tools: [fakeTool],
      });

      const resumeConfig = mockClient.resumeSession.mock.calls[0][1];
      expect(resumeConfig.tools).toEqual([fakeTool]);
    });

    it('should not include tools when not provided', async () => {
      await sessionManager.createSession({
        model: 'gpt-5',
        workingDirectory: '/tmp',
      });

      const config = mockClient.createSession.mock.calls[0][0];
      expect(config.tools).toBeUndefined();
    });

    it('should pass tools through getOrCreateSession (create path)', async () => {
      await sessionManager.getOrCreateSession({
        sdkSessionId: null,
        model: 'gpt-5',
        workingDirectory: '/tmp',
        tools: [fakeTool],
      });

      const config = mockClient.createSession.mock.calls[0][0];
      expect(config.tools).toEqual([fakeTool]);
    });

    it('should pass tools through getOrCreateSession (resume path)', async () => {
      await sessionManager.getOrCreateSession({
        sdkSessionId: 'existing-session',
        model: 'gpt-5',
        workingDirectory: '/tmp',
        tools: [fakeTool],
      });

      const resumeConfig = mockClient.resumeSession.mock.calls[0][1];
      expect(resumeConfig.tools).toEqual([fakeTool]);
    });
  });

  describe('getOrCreateSession', () => {
    it('should create session when no sdkSessionId exists', async () => {
      const session = await sessionManager.getOrCreateSession({
        sdkSessionId: null,
        model: 'gpt-5',
        workingDirectory: '/tmp',
      });

      expect(session.sessionId).toBe('sdk-session-123');
      expect(mockClient.createSession).toHaveBeenCalledOnce();
    });

    it('should resume session when sdkSessionId exists', async () => {
      const session = await sessionManager.getOrCreateSession({
        sdkSessionId: 'existing-session',
        model: 'gpt-5',
        workingDirectory: '/tmp',
      });

      expect(mockClient.resumeSession).toHaveBeenCalledWith('existing-session', expect.any(Object));
    });
  });
});
