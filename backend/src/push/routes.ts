import { Router } from 'express';
import type { PushStore } from './push-store.js';
import type { PushService } from './push-service.js';

export function createPushRoutes(
  pushStore: PushStore,
  pushService: PushService,
  vapidPublicKey: string,
): Router {
  const router = Router();

  // GET /vapid-public-key — client needs this to subscribe
  router.get('/vapid-public-key', (_req, res) => {
    res.json({ publicKey: vapidPublicKey });
  });

  // POST /subscribe — save push subscription
  router.post('/subscribe', (req, res) => {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ error: 'Missing endpoint or keys (p256dh, auth)' });
      return;
    }
    pushStore.upsert({ endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } });
    res.status(201).json({ ok: true });
  });

  // POST /unsubscribe — remove push subscription
  router.post('/unsubscribe', (req, res) => {
    const { endpoint } = req.body;
    if (!endpoint) {
      res.status(400).json({ error: 'Missing endpoint' });
      return;
    }
    pushStore.deleteByEndpoint(endpoint);
    res.json({ ok: true });
  });

  // POST /test — send a test push notification
  router.post('/test', async (_req, res) => {
    await pushService.sendToAll({
      title: 'CodeForge',
      body: 'Test notification — push is working!',
      tag: 'test',
      forceShow: true,
      data: { url: '/', type: 'test' },
    });
    res.json({ ok: true });
  });

  return router;
}
