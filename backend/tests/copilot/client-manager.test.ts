import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock CopilotClient
const { mockClient, MockCopilotClient } = vi.hoisted(() => {
  const _mockClient = {
    start: vi.fn(),
    stop: vi.fn().mockResolvedValue([]),
    listModels: vi.fn().mockResolvedValue([
      { id: 'gpt-5', name: 'GPT-5', capabilities: {} },
      { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5', capabilities: {} },
    ]),
    getState: vi.fn().mockReturnValue('connected'),
    getAuthStatus: vi.fn().mockResolvedValue({
      isAuthenticated: true,
      authType: 'gh-cli',
      host: 'github.com',
      login: 'testuser',
    }),
    on: vi.fn().mockReturnValue(() => {}),
    reset() {
      this.start.mockClear().mockResolvedValue(undefined);
      this.stop.mockClear().mockResolvedValue([]);
      this.listModels.mockClear().mockResolvedValue([
        { id: 'gpt-5', name: 'GPT-5', capabilities: {} },
        { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5', capabilities: {} },
      ]);
      this.getState.mockClear().mockReturnValue('connected');
      this.getAuthStatus.mockClear().mockResolvedValue({
        isAuthenticated: true,
        authType: 'gh-cli',
        host: 'github.com',
        login: 'testuser',
      });
      this.on.mockClear().mockReturnValue(() => {});
    },
  };
  const _MockCopilotClient = vi.fn(() => _mockClient);
  return { mockClient: _mockClient, MockCopilotClient: _MockCopilotClient };
});

vi.mock('@github/copilot-sdk', () => ({
  CopilotClient: MockCopilotClient,
}));

import { ClientManager } from '../../src/copilot/client-manager.js';

describe('ClientManager', () => {
  let manager: ClientManager;

  beforeEach(() => {
    mockClient.reset();
    MockCopilotClient.mockClear();
    manager = new ClientManager({});
  });

  describe('getClient', () => {
    it('should create and start CopilotClient on first call', async () => {
      const client = await manager.getClient();

      expect(client).toBe(mockClient);
      expect(MockCopilotClient).toHaveBeenCalledOnce();
      expect(mockClient.start).toHaveBeenCalledOnce();
    });

    it('should return same client on subsequent calls', async () => {
      const client1 = await manager.getClient();
      const client2 = await manager.getClient();

      expect(client1).toBe(client2);
      expect(MockCopilotClient).toHaveBeenCalledOnce();
      expect(mockClient.start).toHaveBeenCalledOnce();
    });

    it('should create CopilotClient without githubToken when not configured', async () => {
      const mgr = new ClientManager({});
      await mgr.getClient();

      expect(MockCopilotClient).toHaveBeenCalledWith();
    });

    it('should create CopilotClient with githubToken when configured', async () => {
      const mgr = new ClientManager({ githubToken: 'gho_abc123' });
      await mgr.getClient();

      expect(MockCopilotClient).toHaveBeenCalledWith({ githubToken: 'gho_abc123' });
    });
  });

  describe('stop', () => {
    it('should stop the client', async () => {
      await manager.getClient();
      await manager.stop();

      expect(mockClient.stop).toHaveBeenCalledOnce();
    });

    it('should be safe to call without starting', async () => {
      await expect(manager.stop()).resolves.not.toThrow();
    });

    it('should allow getClient after stop', async () => {
      await manager.getClient();
      await manager.stop();

      MockCopilotClient.mockClear();
      mockClient.reset();

      const client = await manager.getClient();
      expect(client).toBe(mockClient);
      expect(MockCopilotClient).toHaveBeenCalledOnce();
    });
  });

  describe('isClientStarted', () => {
    it('should return false before getClient is called', () => {
      expect(manager.isClientStarted()).toBe(false);
    });

    it('should return true after getClient is called', async () => {
      await manager.getClient();
      expect(manager.isClientStarted()).toBe(true);
    });

    it('should return false after stop is called', async () => {
      await manager.getClient();
      await manager.stop();
      expect(manager.isClientStarted()).toBe(false);
    });
  });

  describe('getAuthStatus', () => {
    it('should return auth status from SDK client when client is started', async () => {
      await manager.getClient(); // start client first
      const status = await manager.getAuthStatus();

      expect(mockClient.getAuthStatus).toHaveBeenCalledOnce();
      expect(status).toEqual({
        isAuthenticated: true,
        authType: 'gh-cli',
        host: 'github.com',
        login: 'testuser',
      });
    });

    it('should NOT auto-start client when checking auth status', async () => {
      await manager.getAuthStatus();

      expect(mockClient.start).not.toHaveBeenCalled();
    });

    it('should return inferred env status when client not started and has githubToken', async () => {
      const mgr = new ClientManager({ githubToken: 'gho_abc123' });
      const status = await mgr.getAuthStatus();

      expect(MockCopilotClient).not.toHaveBeenCalled();
      expect(status).toEqual({
        isAuthenticated: true,
        authType: 'env',
      });
    });

    it('should return not-authenticated when client not started and no token', async () => {
      const mgr = new ClientManager({});
      const status = await mgr.getAuthStatus();

      expect(MockCopilotClient).not.toHaveBeenCalled();
      expect(status).toEqual({
        isAuthenticated: false,
        authType: 'none',
      });
    });
  });

  describe('setGithubToken', () => {
    it('should stop existing client and use new token on next getClient', async () => {
      // First: start with no token
      await manager.getClient();
      expect(MockCopilotClient).toHaveBeenCalledWith();

      // Set new token
      await manager.setGithubToken('gho_new_token');
      expect(mockClient.stop).toHaveBeenCalledOnce();

      // Clear mocks to track next call
      MockCopilotClient.mockClear();
      mockClient.reset();

      // Next getClient should use new token
      await manager.getClient();
      expect(MockCopilotClient).toHaveBeenCalledWith({ githubToken: 'gho_new_token' });
    });

    it('should work even if no client was started yet', async () => {
      await manager.setGithubToken('gho_fresh');

      MockCopilotClient.mockClear();
      await manager.getClient();
      expect(MockCopilotClient).toHaveBeenCalledWith({ githubToken: 'gho_fresh' });
    });
  });

  describe('listModels', () => {
    it('should return models from the SDK', async () => {
      const models = await manager.listModels();

      expect(models).toHaveLength(2);
      expect(models[0].id).toBe('gpt-5');
      expect(models[1].id).toBe('claude-sonnet-4.5');
    });

    it('should auto-start client if not started', async () => {
      await manager.listModels();

      expect(mockClient.start).toHaveBeenCalledOnce();
      expect(mockClient.listModels).toHaveBeenCalledOnce();
    });
  });
});
