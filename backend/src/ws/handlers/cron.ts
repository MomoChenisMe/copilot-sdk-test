import type { WsMessage, SendFn, WsHandlerObject } from '../types.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('ws-cron-handler');

export interface CronWsHandler extends WsHandlerObject {
  broadcast: (msg: WsMessage) => void;
}

export function createCronHandler(): CronWsHandler {
  const subscribers = new Set<SendFn>();

  return {
    onMessage(message: WsMessage, send: SendFn) {
      if (message.type === 'cron:subscribe') {
        subscribers.add(send);
        log.debug('Client subscribed to cron notifications');
      } else if (message.type === 'cron:unsubscribe') {
        subscribers.delete(send);
        log.debug('Client unsubscribed from cron notifications');
      }
    },

    onDisconnect(send: SendFn) {
      subscribers.delete(send);
    },

    broadcast(msg: WsMessage) {
      for (const send of subscribers) {
        try {
          send(msg);
        } catch (err) {
          log.error({ err }, 'Failed to broadcast cron message');
          subscribers.delete(send);
        }
      }
    },
  };
}
