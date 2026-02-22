/**
 * Non-blocking Service Worker registration.
 * Silently skips if browser doesn't support Service Workers.
 */
export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch (err) {
    console.warn('SW registration failed:', err);
  }
}
