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
    on: vi.fn().mockReturnValue(() => {}),
    reset() {
      this.start.mockClear().mockResolvedValue(undefined);
      this.stop.mockClear().mockResolvedValue([]);
      this.listModels.mockClear().mockResolvedValue([
        { id: 'gpt-5', name: 'GPT-5', capabilities: {} },
        { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5', capabilities: {} },
      ]);
      this.getState.mockClear().mockReturnValue('connected');
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
    manager = new ClientManager();
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
