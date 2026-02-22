import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PushService, type PushPayload } from '../push-service.js';
import type { PushStore, PushSubscriptionRecord } from '../push-store.js';
import type { SettingsStore } from '../../settings/settings-store.js';

// Mock web-push
vi.mock('web-push', () => ({
  default: {
    sendNotification: vi.fn().mockResolvedValue({}),
  },
}));

import webpush from 'web-push';

function createMockStore(subs: PushSubscriptionRecord[] = []): PushStore {
  return {
    getAll: vi.fn().mockReturnValue(subs),
    upsert: vi.fn(),
    deleteByEndpoint: vi.fn(),
  } as unknown as PushStore;
}

function createMockSettings(
  settings: Record<string, unknown> = {},
): SettingsStore {
  return {
    read: vi.fn().mockReturnValue(settings),
    write: vi.fn(),
    patch: vi.fn(),
  } as unknown as SettingsStore;
}

const testSub: PushSubscriptionRecord = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/test',
  keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
};

describe('PushService', () => {
  let pushStore: PushStore;
  let settingsStore: SettingsStore;
  let service: PushService;

  beforeEach(() => {
    vi.clearAllMocks();
    pushStore = createMockStore([testSub]);
    settingsStore = createMockSettings({
      pushNotifications: { enabled: true, cronEnabled: true, streamEnabled: true },
    });
    service = new PushService(pushStore, settingsStore);
  });

  describe('sendToAll', () => {
    it('should send push to all subscriptions', async () => {
      const payload: PushPayload = {
        title: 'Test',
        body: 'Hello world',
        tag: 'test-tag',
        data: { url: '/', type: 'cron' },
      };

      await service.sendToAll(payload);

      expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
      expect(webpush.sendNotification).toHaveBeenCalledWith(
        {
          endpoint: testSub.endpoint,
          keys: testSub.keys,
        },
        JSON.stringify(payload),
      );
    });

    it('should remove expired subscriptions (410)', async () => {
      const error = new Error('Gone') as any;
      error.statusCode = 410;
      vi.mocked(webpush.sendNotification).mockRejectedValueOnce(error);

      await service.sendToAll({ title: 'Test', body: 'Hello' });

      expect(pushStore.deleteByEndpoint).toHaveBeenCalledWith(testSub.endpoint);
    });

    it('should not throw on other push errors', async () => {
      vi.mocked(webpush.sendNotification).mockRejectedValueOnce(
        new Error('Network error'),
      );

      // Should not throw
      await expect(
        service.sendToAll({ title: 'Test', body: 'Hello' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('shouldNotify', () => {
    it('should return true when push is enabled and type is enabled', () => {
      expect(service.shouldNotify('cron')).toBe(true);
      expect(service.shouldNotify('stream')).toBe(true);
    });

    it('should return false when push is disabled globally', () => {
      settingsStore = createMockSettings({
        pushNotifications: { enabled: false, cronEnabled: true },
      });
      service = new PushService(pushStore, settingsStore);
      expect(service.shouldNotify('cron')).toBe(false);
    });

    it('should return false when specific type is disabled', () => {
      settingsStore = createMockSettings({
        pushNotifications: { enabled: true, cronEnabled: false, streamEnabled: true },
      });
      service = new PushService(pushStore, settingsStore);
      expect(service.shouldNotify('cron')).toBe(false);
      expect(service.shouldNotify('stream')).toBe(true);
    });

    it('should return false when pushNotifications settings missing', () => {
      settingsStore = createMockSettings({});
      service = new PushService(pushStore, settingsStore);
      expect(service.shouldNotify('cron')).toBe(false);
    });
  });
});
