import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createPushRoutes } from '../routes.js';
import type { PushStore } from '../push-store.js';
import type { PushService } from '../push-service.js';

function createMockPushStore(): PushStore {
  return {
    upsert: vi.fn(),
    getAll: vi.fn().mockReturnValue([]),
    deleteByEndpoint: vi.fn(),
  } as unknown as PushStore;
}

function createMockPushService(): PushService {
  return {
    sendToAll: vi.fn().mockResolvedValue(undefined),
    shouldNotify: vi.fn().mockReturnValue(true),
  } as unknown as PushService;
}

describe('Push Routes', () => {
  let app: express.Express;
  let pushStore: PushStore;
  let pushService: PushService;
  const vapidPublicKey = 'test-vapid-public-key-base64url';

  beforeEach(() => {
    pushStore = createMockPushStore();
    pushService = createMockPushService();
    app = express();
    app.use(express.json());
    app.use('/api/push', createPushRoutes(pushStore, pushService, vapidPublicKey));
  });

  describe('GET /vapid-public-key', () => {
    it('should return the VAPID public key', async () => {
      const res = await request(app).get('/api/push/vapid-public-key');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ publicKey: vapidPublicKey });
    });
  });

  describe('POST /subscribe', () => {
    it('should save subscription and return 201', async () => {
      const sub = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
      };
      const res = await request(app).post('/api/push/subscribe').send(sub);
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ ok: true });
      expect(pushStore.upsert).toHaveBeenCalledWith(sub);
    });

    it('should return 400 when endpoint is missing', async () => {
      const res = await request(app).post('/api/push/subscribe').send({ keys: {} });
      expect(res.status).toBe(400);
    });

    it('should return 400 when keys are missing', async () => {
      const res = await request(app)
        .post('/api/push/subscribe')
        .send({ endpoint: 'https://example.com' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /unsubscribe', () => {
    it('should delete subscription by endpoint', async () => {
      const res = await request(app)
        .post('/api/push/unsubscribe')
        .send({ endpoint: 'https://fcm.googleapis.com/fcm/send/test' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      expect(pushStore.deleteByEndpoint).toHaveBeenCalledWith(
        'https://fcm.googleapis.com/fcm/send/test',
      );
    });

    it('should return 400 when endpoint is missing', async () => {
      const res = await request(app).post('/api/push/unsubscribe').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /test', () => {
    it('should send a test notification', async () => {
      const res = await request(app).post('/api/push/test');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      expect(pushService.sendToAll).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.any(String),
          body: expect.any(String),
        }),
      );
    });
  });
});
