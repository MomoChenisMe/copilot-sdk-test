import { useState, useEffect, useCallback } from 'react';
import { pushApi } from '../lib/push-api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const isSupported =
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof PushManager !== 'undefined';

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  );

  // Check existing subscription on mount
  useEffect(() => {
    if (!isSupported) return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    });
  }, [isSupported]);

  const requestSubscription = useCallback(async () => {
    if (!isSupported) return;

    // Request notification permission if needed
    if (Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') return;
    } else if (Notification.permission === 'denied') {
      setPermission('denied');
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    const { publicKey } = await pushApi.getVapidPublicKey();

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await pushApi.subscribe(subscription.toJSON());
    setIsSubscribed(true);
  }, [isSupported]);

  const cancelSubscription = useCallback(async () => {
    if (!isSupported) return;

    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await pushApi.unsubscribe(endpoint);
    }
    setIsSubscribed(false);
  }, [isSupported]);

  return {
    isSupported,
    isSubscribed,
    permission,
    requestSubscription,
    cancelSubscription,
  };
}
