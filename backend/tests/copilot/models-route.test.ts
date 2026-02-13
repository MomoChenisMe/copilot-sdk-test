import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';

// Mock ClientManager
const { mockClientManager } = vi.hoisted(() => {
  const _mock = {
    getClient: vi.fn().mockResolvedValue({}),
    stop: vi.fn().mockResolvedValue(undefined),
    listModels: vi.fn().mockResolvedValue([
      { id: 'gpt-5', name: 'GPT-5', capabilities: {} },
      { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5', capabilities: {} },
      { id: 'o4-mini', name: 'o4-mini', capabilities: {} },
    ]),
  };
  return { mockClientManager: _mock };
});

import { createModelsRoute } from '../../src/copilot/models-route.js';

describe('GET /api/copilot/models', () => {
  let app: express.Express;
  let server: Server;
  let baseUrl: string;

  beforeEach(() => {
    mockClientManager.listModels.mockClear().mockResolvedValue([
      { id: 'gpt-5', name: 'GPT-5', capabilities: {} },
      { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5', capabilities: {} },
      { id: 'o4-mini', name: 'o4-mini', capabilities: {} },
    ]);

    app = express();
    app.use('/api/copilot', createModelsRoute(mockClientManager as any));

    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(() => {
    server?.close();
  });

  it('should return list of models', async () => {
    const res = await fetch(`${baseUrl}/api/copilot/models`);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(3);
    expect(body[0].id).toBe('gpt-5');
    expect(body[1].id).toBe('claude-sonnet-4.5');
    expect(body[2].id).toBe('o4-mini');
  });

  it('should return 500 on SDK error', async () => {
    mockClientManager.listModels.mockRejectedValue(new Error('SDK not available'));

    const res = await fetch(`${baseUrl}/api/copilot/models`);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });
});
