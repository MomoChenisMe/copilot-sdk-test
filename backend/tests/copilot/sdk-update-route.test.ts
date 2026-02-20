import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';

const mockChecker = {
  checkForUpdate: vi.fn(),
  performUpdate: vi.fn(),
  getChangelog: vi.fn(),
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
    it('should return version info', async () => {
      mockChecker.checkForUpdate.mockResolvedValue({
        currentVersion: '0.1.23',
        latestVersion: '0.2.0',
        updateAvailable: true,
      });

      const res = await fetch(`http://localhost:${port}/api/copilot/sdk-version`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({
        currentVersion: '0.1.23',
        latestVersion: '0.2.0',
        updateAvailable: true,
      });
    });

    it('should return 500 on error', async () => {
      mockChecker.checkForUpdate.mockRejectedValue(new Error('fail'));

      const res = await fetch(`http://localhost:${port}/api/copilot/sdk-version`);
      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/copilot/sdk-changelog', () => {
    it('should return changelog for valid from/to params', async () => {
      mockChecker.getChangelog.mockResolvedValue('## v0.2.0\nNew features');

      const res = await fetch(`http://localhost:${port}/api/copilot/sdk-changelog?from=0.1.23&to=0.2.0`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ changelog: '## v0.2.0\nNew features' });
      expect(mockChecker.getChangelog).toHaveBeenCalledWith('0.1.23', '0.2.0');
    });

    it('should return null changelog when unavailable', async () => {
      mockChecker.getChangelog.mockResolvedValue(null);

      const res = await fetch(`http://localhost:${port}/api/copilot/sdk-changelog?from=0.1.23&to=0.2.0`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ changelog: null });
    });

    it('should return 400 when missing query params', async () => {
      const res = await fetch(`http://localhost:${port}/api/copilot/sdk-changelog`);
      expect(res.status).toBe(400);
    });

    it('should return 500 on error', async () => {
      mockChecker.getChangelog.mockRejectedValue(new Error('fail'));

      const res = await fetch(`http://localhost:${port}/api/copilot/sdk-changelog?from=0.1.23&to=0.2.0`);
      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/copilot/sdk-update', () => {
    it('should return success on update', async () => {
      mockChecker.performUpdate.mockResolvedValue({ success: true });

      const res = await fetch(`http://localhost:${port}/api/copilot/sdk-update`, {
        method: 'POST',
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ success: true });
    });

    it('should return error details on failure', async () => {
      mockChecker.performUpdate.mockResolvedValue({ success: false, error: 'npm failed' });

      const res = await fetch(`http://localhost:${port}/api/copilot/sdk-update`, {
        method: 'POST',
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ success: false, error: 'npm failed' });
    });
  });
});
