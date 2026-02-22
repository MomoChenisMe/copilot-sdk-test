import { apiGet, apiPost } from './api';

export const pushApi = {
  getVapidPublicKey: () =>
    apiGet<{ publicKey: string }>('/api/push/vapid-public-key'),

  subscribe: (subscription: PushSubscriptionJSON) =>
    apiPost<{ ok: true }>('/api/push/subscribe', subscription),

  unsubscribe: (endpoint: string) =>
    apiPost<{ ok: true }>('/api/push/unsubscribe', { endpoint }),

  test: () => apiPost<{ ok: true }>('/api/push/test'),
};
