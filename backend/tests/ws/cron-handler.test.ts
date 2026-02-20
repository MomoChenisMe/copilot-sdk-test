import { describe, it, expect, vi } from 'vitest';
import { createCronHandler } from '../../src/ws/handlers/cron.js';

describe('Cron WS Handler', () => {
  describe('subscribe / unsubscribe', () => {
    it('should add subscriber on cron:subscribe', () => {
      const handler = createCronHandler();
      const send1 = vi.fn();

      handler.onMessage({ type: 'cron:subscribe' }, send1);

      // Broadcast a message — subscriber should receive it
      handler.broadcast({ type: 'cron:job_completed', data: { jobId: '1' } });
      expect(send1).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'cron:job_completed' }),
      );
    });

    it('should remove subscriber on cron:unsubscribe', () => {
      const handler = createCronHandler();
      const send1 = vi.fn();

      handler.onMessage({ type: 'cron:subscribe' }, send1);
      handler.onMessage({ type: 'cron:unsubscribe' }, send1);

      // Broadcast — should NOT reach unsubscribed send
      handler.broadcast({ type: 'cron:job_completed', data: { jobId: '1' } });
      // Only the subscribe ack was sent, no broadcast message
      const broadcastCalls = send1.mock.calls.filter(
        (c) => c[0].type === 'cron:job_completed',
      );
      expect(broadcastCalls).toHaveLength(0);
    });
  });

  describe('broadcast', () => {
    it('should broadcast to multiple subscribers', () => {
      const handler = createCronHandler();
      const send1 = vi.fn();
      const send2 = vi.fn();
      const send3 = vi.fn();

      handler.onMessage({ type: 'cron:subscribe' }, send1);
      handler.onMessage({ type: 'cron:subscribe' }, send2);
      handler.onMessage({ type: 'cron:subscribe' }, send3);

      handler.broadcast({ type: 'cron:job_failed', data: { jobId: '2', status: 'error' } });

      // Each subscriber should receive the broadcast
      for (const send of [send1, send2, send3]) {
        expect(send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'cron:job_failed',
            data: expect.objectContaining({ jobId: '2' }),
          }),
        );
      }
    });

    it('should not fail when no subscribers', () => {
      const handler = createCronHandler();
      // Should not throw
      expect(() => {
        handler.broadcast({ type: 'cron:job_completed', data: {} });
      }).not.toThrow();
    });
  });

  describe('onDisconnect', () => {
    it('should clean up subscriber on disconnect', () => {
      const handler = createCronHandler();
      const send1 = vi.fn();

      handler.onMessage({ type: 'cron:subscribe' }, send1);
      handler.onDisconnect!(send1);

      // Broadcast — should NOT reach disconnected send
      handler.broadcast({ type: 'cron:job_completed', data: { jobId: '1' } });
      const broadcastCalls = send1.mock.calls.filter(
        (c) => c[0].type === 'cron:job_completed',
      );
      expect(broadcastCalls).toHaveLength(0);
    });
  });

  describe('unknown messages', () => {
    it('should ignore non-subscribe/unsubscribe messages', () => {
      const handler = createCronHandler();
      const send = vi.fn();

      // Should not throw
      handler.onMessage({ type: 'cron:unknown_action' }, send);
    });
  });
});
