import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';

const mockChecker = {
  getInstalledVersion: vi.fn(),
};

vi.mock('../../src/copilot/sdk-update.js', () => ({
  SdkUpdateChecker: vi.fn(() => mockChecker),
}));

import { createSdkUpdateRoute } from '../../src/copilot/sdk-update-route.js';

describe('SDK Update REST API', () => {
  let server: Server;
  let port: number;

  beforeEach(async () => {
    vi.clearAllMocks();
    const app = express();
    app.use(express.json());
    app.use('/api/copilot', createSdkUpdateRoute());
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        port = (server.address() as any).port;
        resolve();
      });
    });
  });

  afterEach(() => {
    server?.close();
  });

  describe('GET /api/copilot/sdk-version', () => {
    it('should return current version only', async () => {
      mockChecker.getInstalledVersion.mockReturnValue('0.1.25');

      const res = await fetch(`http://localhost:${port}/api/copilot/sdk-version`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ currentVersion: '0.1.25' });
    });

    it('should return null when SDK not found', async () => {
      mockChecker.getInstalledVersion.mockReturnValue(null);

      const res = await fetch(`http://localhost:${port}/api/copilot/sdk-version`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ currentVersion: null });
    });

    it('should return 500 on error', async () => {
      mockChecker.getInstalledVersion.mockImplementation(() => { throw new Error('fail'); });

      const res = await fetch(`http://localhost:${port}/api/copilot/sdk-version`);
      expect(res.status).toBe(500);
    });
  });

  describe('removed endpoints', () => {
    it('GET /api/copilot/sdk-changelog should return 404', async () => {
      const res = await fetch(`http://localhost:${port}/api/copilot/sdk-changelog?from=0.1.23&to=0.2.0`);
      expect(res.status).toBe(404);
    });

    it('POST /api/copilot/sdk-update should return 404', async () => {
      const res = await fetch(`http://localhost:${port}/api/copilot/sdk-update`, { method: 'POST' });
      expect(res.status).toBe(404);
    });
  });
});
