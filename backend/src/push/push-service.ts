import webpush from 'web-push';
import type { PushStore } from './push-store.js';
import type { SettingsStore } from '../settings/settings-store.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('push');

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  forceShow?: boolean;
  data?: Record<string, unknown>;
}

export class PushService {
  constructor(
    private pushStore: PushStore,
    private settingsStore: SettingsStore,
  ) {}

  async sendToAll(payload: PushPayload): Promise<void> {
    const subs = this.pushStore.getAll();
    const body = JSON.stringify(payload);

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            body,
          );
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            this.pushStore.deleteByEndpoint(sub.endpoint);
          } else {
            log.error(`Push failed: ${err.message || err}`);
          }
        }
      }),
    );
  }

  shouldNotify(type: 'cron' | 'stream'): boolean {
    const settings = this.settingsStore.read();
    const push = (settings as any).pushNotifications;
    if (!push?.enabled) return false;

    if (type === 'cron') return !!push.cronEnabled;
    if (type === 'stream') return !!push.streamEnabled;
    return false;
  }
}
