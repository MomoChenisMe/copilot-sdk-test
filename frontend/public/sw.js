// CodeForge Service Worker — Push Notifications

// Install: skip waiting to activate immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Activate: claim all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push: display notification (only when app is not focused, unless forceShow)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const payload = event.data.json();

        // Skip notification if any client window is focused (avoid duplicate with in-app toast)
        // Exception: forceShow bypasses this check (used by test notifications)
        if (!payload.forceShow && clientList.some((c) => c.focused)) return;

        return self.registration.showNotification(payload.title || 'CodeForge', {
          body: payload.body || '',
          icon: payload.icon || '/icons/icon-192.png',
          badge: payload.badge || '/icons/icon-192.png',
          tag: payload.tag || 'codeforge-notification',
          data: payload.data || {},
          vibrate: [200, 100, 200],
        });
      }),
  );
});

// Notification click: focus existing window or open new one
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlPath = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing CodeForge window
        for (const client of clientList) {
          if (new URL(client.url).origin === self.location.origin) {
            client.focus();
            client.postMessage({
              type: 'notification-click',
              data: event.notification.data,
            });
            return;
          }
        }
        // No existing window — open new one
        return self.clients.openWindow(urlPath);
      }),
  );
});

// Fetch: pass-through (no caching — CodeForge requires VPS connection)
self.addEventListener('fetch', () => {
  // Intentionally empty — let all requests pass through to network
});
