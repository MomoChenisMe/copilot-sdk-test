import { describe, it, expect } from 'vitest';
import { queryClient } from '../../src/lib/query-client';

describe('queryClient', () => {
  it('should be a QueryClient instance', () => {
    expect(queryClient).toBeDefined();
    expect(queryClient.getDefaultOptions).toBeDefined();
  });

  it('should have correct default query options', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(5 * 60 * 1000);
    expect(defaults.queries?.gcTime).toBe(30 * 60 * 1000);
    expect(defaults.queries?.retry).toBe(1);
    expect(defaults.queries?.refetchOnWindowFocus).toBe(true);
    expect(defaults.queries?.refetchOnReconnect).toBe(true);
  });

  it('should have correct default mutation options', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.mutations?.retry).toBe(0);
  });

  it('should return the same instance on re-import', async () => {
    const { queryClient: sameClient } = await import('../../src/lib/query-client');
    expect(sameClient).toBe(queryClient);
  });
});
