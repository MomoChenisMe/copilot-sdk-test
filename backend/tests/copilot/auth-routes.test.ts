import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createCopilotAuthRoutes } from '../../src/copilot/auth-routes.js';

// Mock device-flow module
vi.mock('../../src/copilot/device-flow.js', () => ({
  startDeviceFlow: vi.fn(),
  pollDeviceFlow: vi.fn(),
}));

import { startDeviceFlow, pollDeviceFlow } from '../../src/copilot/device-flow.js';

const mockStartDeviceFlow = vi.mocked(startDeviceFlow);
const mockPollDeviceFlow = vi.mocked(pollDeviceFlow);

function createMockClientManager(overrides = {}) {
  return {
    getClient: vi.fn(),
    stop: vi.fn(),
    listModels: vi.fn(),
    isClientStarted: vi.fn().mockReturnValue(true),
    getAuthStatus: vi.fn().mockResolvedValue({
      isAuthenticated: true,
      authType: 'gh-cli',
      login: 'testuser',
    }),
    setGithubToken: vi.fn(),
    getGithubClientId: vi.fn().mockReturnValue('Iv1.testclient'),
    ...overrides,
  };
}

function createApp(clientManager: ReturnType<typeof createMockClientManager>) {
  const app = express();
  app.use(express.json());
  app.use('/auth', createCopilotAuthRoutes(clientManager as any));
  return app;
}

describe('copilot auth-routes', () => {
  let clientManager: ReturnType<typeof createMockClientManager>;

  beforeEach(() => {
    vi.clearAllMocks();
    clientManager = createMockClientManager();
  });

  describe('GET /auth/status', () => {
    it('should return auth status from ClientManager', async () => {
      const app = createApp(clientManager);

      const res = await request(app).get('/auth/status');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        isAuthenticated: true,
        method: 'gh-cli',
        login: 'testuser',
      });
    });

    it('should return isAuthenticated false when not authenticated', async () => {
      clientManager.getAuthStatus.mockResolvedValue({
        isAuthenticated: false,
        authType: 'none',
      });
      const app = createApp(clientManager);

      const res = await request(app).get('/auth/status');

      expect(res.status).toBe(200);
      expect(res.body.isAuthenticated).toBe(false);
    });

    it('should return inferred env status when client not started with token', async () => {
      clientManager.getAuthStatus.mockResolvedValue({
        isAuthenticated: true,
        authType: 'env',
      });
      const app = createApp(clientManager);

      const res = await request(app).get('/auth/status');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        isAuthenticated: true,
        method: 'env',
      });
    });

    it('should return not-authenticated when client not started and no token', async () => {
      clientManager.getAuthStatus.mockResolvedValue({
        isAuthenticated: false,
        authType: 'none',
      });
      const app = createApp(clientManager);

      const res = await request(app).get('/auth/status');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        isAuthenticated: false,
        method: 'none',
      });
    });
  });

  describe('POST /auth/device-flow/start', () => {
    it('should start device flow and return userCode', async () => {
      mockStartDeviceFlow.mockResolvedValueOnce({
        deviceCode: 'dc_abc',
        userCode: 'ABCD-1234',
        verificationUri: 'https://github.com/login/device',
        expiresIn: 900,
        interval: 5,
      });
      const app = createApp(clientManager);

      const res = await request(app).post('/auth/device-flow/start');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        userCode: 'ABCD-1234',
        verificationUri: 'https://github.com/login/device',
        deviceCode: 'dc_abc',
        expiresIn: 900,
      });
      expect(mockStartDeviceFlow).toHaveBeenCalledWith('Iv1.testclient');
    });

    it('should return 400 when GITHUB_CLIENT_ID is not configured', async () => {
      clientManager.getGithubClientId.mockReturnValue(undefined);
      const app = createApp(clientManager);

      const res = await request(app).post('/auth/device-flow/start');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('GITHUB_CLIENT_ID not configured');
    });

    it('should return 502 when GitHub API fails', async () => {
      mockStartDeviceFlow.mockRejectedValueOnce(new Error('Failed to start device flow'));
      const app = createApp(clientManager);

      const res = await request(app).post('/auth/device-flow/start');

      expect(res.status).toBe(502);
      expect(res.body.error).toBe('Failed to start device flow');
    });
  });

  describe('POST /auth/device-flow/complete', () => {
    it('should complete device flow and set token', async () => {
      mockPollDeviceFlow.mockResolvedValueOnce('gho_new_token');
      const app = createApp(clientManager);

      const res = await request(app)
        .post('/auth/device-flow/complete')
        .send({ deviceCode: 'dc_abc' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      expect(mockPollDeviceFlow).toHaveBeenCalledWith('Iv1.testclient', 'dc_abc');
      expect(clientManager.setGithubToken).toHaveBeenCalledWith('gho_new_token');
    });

    it('should return 400 when deviceCode is missing', async () => {
      const app = createApp(clientManager);

      const res = await request(app)
        .post('/auth/device-flow/complete')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('deviceCode is required');
    });

    it('should return 400 when GITHUB_CLIENT_ID is not configured', async () => {
      clientManager.getGithubClientId.mockReturnValue(undefined);
      const app = createApp(clientManager);

      const res = await request(app)
        .post('/auth/device-flow/complete')
        .send({ deviceCode: 'dc_abc' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('GITHUB_CLIENT_ID not configured');
    });

    it('should return 403 when user denies authorization', async () => {
      mockPollDeviceFlow.mockRejectedValueOnce(new Error('Authorization denied by user'));
      const app = createApp(clientManager);

      const res = await request(app)
        .post('/auth/device-flow/complete')
        .send({ deviceCode: 'dc_abc' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Authorization denied by user');
    });

    it('should return 408 when device flow times out', async () => {
      mockPollDeviceFlow.mockRejectedValueOnce(new Error('Device flow timed out'));
      const app = createApp(clientManager);

      const res = await request(app)
        .post('/auth/device-flow/complete')
        .send({ deviceCode: 'dc_abc' });

      expect(res.status).toBe(408);
      expect(res.body.error).toBe('Device flow timed out');
    });
  });
});
