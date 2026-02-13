import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.hoisted(() => vi.fn());
vi.stubGlobal('fetch', mockFetch);

import { startDeviceFlow, pollDeviceFlow } from '../../src/copilot/device-flow.js';

describe('device-flow', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('startDeviceFlow', () => {
    it('should POST to GitHub device/code endpoint and return parsed response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            device_code: 'dc_abc123',
            user_code: 'ABCD-1234',
            verification_uri: 'https://github.com/login/device',
            expires_in: 900,
            interval: 5,
          }),
      });

      const result = await startDeviceFlow('Iv1.clientid');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://github.com/login/device/code',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Accept: 'application/json',
          }),
        }),
      );

      expect(result).toEqual({
        deviceCode: 'dc_abc123',
        userCode: 'ABCD-1234',
        verificationUri: 'https://github.com/login/device',
        expiresIn: 900,
        interval: 5,
      });
    });

    it('should throw when GitHub API returns error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
      });

      await expect(startDeviceFlow('bad-client-id')).rejects.toThrow(
        'Failed to start device flow',
      );
    });
  });

  describe('pollDeviceFlow', () => {
    it('should poll until access_token is returned', async () => {
      // First call: authorization_pending
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ error: 'authorization_pending' }),
      });
      // Second call: success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'gho_token123',
            token_type: 'bearer',
            scope: 'copilot',
          }),
      });

      const token = await pollDeviceFlow('Iv1.clientid', 'dc_abc123', {
        intervalMs: 10,
        timeoutMs: 5000,
      });

      expect(token).toBe('gho_token123');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should throw on timeout', async () => {
      // Always return pending
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ error: 'authorization_pending' }),
      });

      await expect(
        pollDeviceFlow('Iv1.clientid', 'dc_abc123', {
          intervalMs: 10,
          timeoutMs: 50,
        }),
      ).rejects.toThrow('Device flow timed out');
    });

    it('should throw when user denies authorization', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ error: 'access_denied' }),
      });

      await expect(
        pollDeviceFlow('Iv1.clientid', 'dc_abc123', {
          intervalMs: 10,
          timeoutMs: 5000,
        }),
      ).rejects.toThrow('Authorization denied by user');
    });

    it('should handle slow_down by continuing to poll', async () => {
      vi.useFakeTimers();

      // First: slow_down
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ error: 'slow_down' }),
      });
      // Second: success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'gho_after_slowdown',
            token_type: 'bearer',
          }),
      });

      const promise = pollDeviceFlow('Iv1.clientid', 'dc_abc123', {
        intervalMs: 100,
        timeoutMs: 60000,
      });

      // Advance through slow_down sleep (100 + 5000 = 5100ms)
      await vi.advanceTimersByTimeAsync(6000);

      const token = await promise;
      expect(token).toBe('gho_after_slowdown');
      expect(mockFetch).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });
});
