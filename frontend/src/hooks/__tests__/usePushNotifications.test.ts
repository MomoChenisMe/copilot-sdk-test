// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePushNotifications } from '../usePushNotifications';

// Mock push-api
vi.mock('../../lib/push-api', () => ({
  pushApi: {
    getVapidPublicKey: vi.fn().mockResolvedValue({ publicKey: 'test-vapid-key' }),
    subscribe: vi.fn().mockResolvedValue({ ok: true }),
    unsubscribe: vi.fn().mockResolvedValue({ ok: true }),
    test: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

import { pushApi } from '../../lib/push-api';

const mockSubscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/test',
  toJSON: () => ({
    endpoint: 'https://fcm.googleapis.com/fcm/send/test',
    keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
  }),
  unsubscribe: vi.fn().mockResolvedValue(true),
} as unknown as PushSubscription;

describe('usePushNotifications', () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should report unsupported when serviceWorker or PushManager missing', () => {
    vi.stubGlobal('navigator', {});
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.isSupported).toBe(false);
  });

  it('should report supported when serviceWorker and PushManager available', () => {
    const mockSW = {
      ready: Promise.resolve({
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue(null),
        },
      }),
    };
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      serviceWorker: mockSW,
    });
    vi.stubGlobal('PushManager', class {});

    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.isSupported).toBe(true);
  });

  it('should detect existing subscription on mount', async () => {
    const mockReg = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(mockSubscription),
        subscribe: vi.fn(),
      },
    };
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      serviceWorker: { ready: Promise.resolve(mockReg) },
    });
    vi.stubGlobal('PushManager', class {});

    const { result } = renderHook(() => usePushNotifications());

    // Wait for useEffect to run
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.isSubscribed).toBe(true);
  });

  it('should subscribe when requestSubscription is called', async () => {
    const mockReg = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(null),
        subscribe: vi.fn().mockResolvedValue(mockSubscription),
      },
    };
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      serviceWorker: { ready: Promise.resolve(mockReg) },
    });
    vi.stubGlobal('PushManager', class {});
    vi.stubGlobal('Notification', { permission: 'granted' });

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    await act(async () => {
      await result.current.requestSubscription();
    });

    expect(mockReg.pushManager.subscribe).toHaveBeenCalled();
    expect(pushApi.subscribe).toHaveBeenCalled();
    expect(result.current.isSubscribed).toBe(true);
  });

  it('should unsubscribe when cancelSubscription is called', async () => {
    const mockReg = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(mockSubscription),
        subscribe: vi.fn(),
      },
    };
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      serviceWorker: { ready: Promise.resolve(mockReg) },
    });
    vi.stubGlobal('PushManager', class {});

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.isSubscribed).toBe(true);

    await act(async () => {
      await result.current.cancelSubscription();
    });

    expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    expect(pushApi.unsubscribe).toHaveBeenCalled();
    expect(result.current.isSubscribed).toBe(false);
  });
});
