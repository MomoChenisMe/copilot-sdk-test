import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Test the Service Worker by evaluating its source in a mocked SW environment.
 * We mock the global SW APIs (self, clients, registration, etc.) and verify behavior.
 */

// Read the SW source
const swSource = readFileSync(
  resolve(__dirname, '../../../public/sw.js'),
  'utf-8',
);

function createMockSWEnv() {
  const listeners: Record<string, Function[]> = {};
  const mockClients: any[] = [];

  const mockRegistration = {
    showNotification: vi.fn().mockResolvedValue(undefined),
  };

  const mockSelf = {
    addEventListener: (event: string, handler: Function) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    },
    skipWaiting: vi.fn().mockResolvedValue(undefined),
    clients: {
      matchAll: vi.fn().mockResolvedValue(mockClients),
      claim: vi.fn().mockResolvedValue(undefined),
      openWindow: vi.fn().mockResolvedValue(null),
    },
    registration: mockRegistration,
    location: { origin: 'https://codeforge.example.com' },
  };

  return { mockSelf, listeners, mockClients, mockRegistration };
}

function evalSW(mockSelf: any) {
  const fn = new Function('self', mockSelf.swSource || swSource);
  // Bind self to the mock
  const wrappedSource = `
    const self = this;
    ${swSource}
  `;
  const fn2 = new Function(wrappedSource);
  fn2.call(mockSelf);
}

describe('Service Worker', () => {
  let env: ReturnType<typeof createMockSWEnv>;

  beforeEach(() => {
    env = createMockSWEnv();
    evalSW(env.mockSelf);
  });

  describe('install event', () => {
    it('should call skipWaiting on install', () => {
      const handlers = env.listeners['install'];
      expect(handlers).toBeDefined();
      expect(handlers.length).toBeGreaterThan(0);

      handlers[0]();
      expect(env.mockSelf.skipWaiting).toHaveBeenCalled();
    });
  });

  describe('activate event', () => {
    it('should call clients.claim on activate', async () => {
      const handlers = env.listeners['activate'];
      expect(handlers).toBeDefined();

      const waitUntilPromise = vi.fn();
      handlers[0]({ waitUntil: waitUntilPromise });

      expect(waitUntilPromise).toHaveBeenCalled();
      await waitUntilPromise.mock.calls[0][0];
      expect(env.mockSelf.clients.claim).toHaveBeenCalled();
    });
  });

  describe('push event', () => {
    it('should show notification when no focused client', async () => {
      const handlers = env.listeners['push'];
      expect(handlers).toBeDefined();

      env.mockSelf.clients.matchAll.mockResolvedValue([
        { focused: false, url: 'https://codeforge.example.com/' },
      ]);

      const waitUntilPromise = vi.fn();
      const pushEvent = {
        data: {
          json: () => ({
            title: 'Test',
            body: 'Hello',
            tag: 'test-tag',
            data: { url: '/cron', type: 'cron' },
          }),
        },
        waitUntil: waitUntilPromise,
      };

      handlers[0](pushEvent);
      await waitUntilPromise.mock.calls[0][0];

      expect(env.mockRegistration.showNotification).toHaveBeenCalledWith(
        'Test',
        expect.objectContaining({
          body: 'Hello',
          tag: 'test-tag',
          data: { url: '/cron', type: 'cron' },
        }),
      );
    });

    it('should show notification with forceShow even when client is focused', async () => {
      const handlers = env.listeners['push'];

      env.mockSelf.clients.matchAll.mockResolvedValue([
        { focused: true, url: 'https://codeforge.example.com/' },
      ]);

      const waitUntilPromise = vi.fn();
      const pushEvent = {
        data: {
          json: () => ({
            title: 'Test',
            body: 'Force shown',
            forceShow: true,
          }),
        },
        waitUntil: waitUntilPromise,
      };

      handlers[0](pushEvent);
      await waitUntilPromise.mock.calls[0][0];

      expect(env.mockRegistration.showNotification).toHaveBeenCalledWith(
        'Test',
        expect.objectContaining({ body: 'Force shown' }),
      );
    });

    it('should skip notification when client is focused', async () => {
      const handlers = env.listeners['push'];

      env.mockSelf.clients.matchAll.mockResolvedValue([
        { focused: true, url: 'https://codeforge.example.com/' },
      ]);

      const waitUntilPromise = vi.fn();
      const pushEvent = {
        data: {
          json: () => ({ title: 'Test', body: 'Hello' }),
        },
        waitUntil: waitUntilPromise,
      };

      handlers[0](pushEvent);
      await waitUntilPromise.mock.calls[0][0];

      expect(env.mockRegistration.showNotification).not.toHaveBeenCalled();
    });

    it('should do nothing when push data is null', () => {
      const handlers = env.listeners['push'];
      const pushEvent = { data: null, waitUntil: vi.fn() };

      // Should not throw
      handlers[0](pushEvent);
      expect(pushEvent.waitUntil).not.toHaveBeenCalled();
    });
  });

  describe('notificationclick event', () => {
    it('should focus existing window and postMessage', async () => {
      const handlers = env.listeners['notificationclick'];
      expect(handlers).toBeDefined();

      const mockClient = {
        focused: false,
        url: 'https://codeforge.example.com/some-page',
        focus: vi.fn().mockResolvedValue(undefined),
        postMessage: vi.fn(),
      };

      env.mockSelf.clients.matchAll.mockResolvedValue([mockClient]);

      const waitUntilPromise = vi.fn();
      const clickEvent = {
        notification: {
          close: vi.fn(),
          data: { url: '/cron', type: 'cron', jobId: '123' },
        },
        waitUntil: waitUntilPromise,
      };

      handlers[0](clickEvent);
      expect(clickEvent.notification.close).toHaveBeenCalled();

      await waitUntilPromise.mock.calls[0][0];
      expect(mockClient.focus).toHaveBeenCalled();
      expect(mockClient.postMessage).toHaveBeenCalledWith({
        type: 'notification-click',
        data: { url: '/cron', type: 'cron', jobId: '123' },
      });
    });

    it('should open new window when no existing client', async () => {
      const handlers = env.listeners['notificationclick'];

      env.mockSelf.clients.matchAll.mockResolvedValue([]);

      const waitUntilPromise = vi.fn();
      const clickEvent = {
        notification: {
          close: vi.fn(),
          data: { url: '/cron' },
        },
        waitUntil: waitUntilPromise,
      };

      handlers[0](clickEvent);
      await waitUntilPromise.mock.calls[0][0];

      expect(env.mockSelf.clients.openWindow).toHaveBeenCalledWith('/cron');
    });
  });
});
