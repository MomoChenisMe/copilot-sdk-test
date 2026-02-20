import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import type { WsMessage } from '../lib/ws-types';

interface UseCronNotificationsOptions {
  subscribe: (listener: (msg: WsMessage) => void) => () => void;
  send: (msg: WsMessage) => void;
}

export function useCronNotifications({ subscribe, send }: UseCronNotificationsOptions) {
  const { t } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    // Subscribe to cron notifications on the server
    send({ type: 'cron:subscribe', data: {} });

    const unsub = subscribe((msg) => {
      const translate = tRef.current;
      if (msg.type === 'cron:job_completed') {
        const data = msg.data as { jobName?: string; historyId?: string };
        const store = useAppStore.getState();
        store.addToast({
          type: 'success',
          title: translate('cron.toast.completed'),
          message: data.jobName || '',
        });
        store.setCronBadge(store.cronUnreadCount + 1, store.cronFailedCount);
        store.triggerCronRefresh();
      } else if (msg.type === 'cron:job_failed') {
        const data = msg.data as { jobName?: string; historyId?: string };
        const store = useAppStore.getState();
        store.addToast({
          type: 'error',
          title: translate('cron.toast.failed'),
          message: data.jobName || '',
        });
        store.setCronBadge(store.cronUnreadCount, store.cronFailedCount + 1);
        store.triggerCronRefresh();
      }
    });

    return () => {
      unsub();
      send({ type: 'cron:unsubscribe', data: {} });
    };
  }, [subscribe, send]);
}
