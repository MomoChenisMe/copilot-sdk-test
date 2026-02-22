import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('registerServiceWorker', () => {
  const originalNavigator = global.navigator;
  let registerMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    registerMock = vi.fn().mockResolvedValue({ scope: '/' });
    vi.stubGlobal('navigator', {
      ...originalNavigator,
      serviceWorker: { register: registerMock },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('should register sw.js when serviceWorker is supported', async () => {
    const { registerServiceWorker } = await import('../sw-register');
    await registerServiceWorker();
    expect(registerMock).toHaveBeenCalledWith('/sw.js');
  });

  it('should silently skip when serviceWorker is not supported', async () => {
    vi.stubGlobal('navigator', {});
    const { registerServiceWorker } = await import('../sw-register');
    // Should not throw
    await registerServiceWorker();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('should not throw when registration fails', async () => {
    registerMock.mockRejectedValue(new Error('Registration failed'));
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { registerServiceWorker } = await import('../sw-register');
    // Should not throw
    await registerServiceWorker();
    expect(consoleSpy).toHaveBeenCalledWith(
      'SW registration failed:',
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });
});
