import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '../../../src/test-utils/query-wrapper';

const mockGetBraveApiKey = vi.fn();

vi.mock('../../../src/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/lib/api')>();
  return {
    ...actual,
    configApi: { ...actual.configApi, getBraveApiKey: (...args: unknown[]) => mockGetBraveApiKey(...args) },
  };
});

import { useBraveApiKeyQuery } from '../../../src/hooks/queries/useConfigQuery';

describe('useBraveApiKeyQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches brave API key status', async () => {
    mockGetBraveApiKey.mockResolvedValue({ hasKey: true, maskedKey: 'sk-***' });
    const { result } = renderHook(() => useBraveApiKeyQuery(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ hasKey: true, maskedKey: 'sk-***' });
  });

  it('handles missing key', async () => {
    mockGetBraveApiKey.mockResolvedValue({ hasKey: false, maskedKey: '' });
    const { result } = renderHook(() => useBraveApiKeyQuery(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.hasKey).toBe(false);
  });

  it('handles error state', async () => {
    mockGetBraveApiKey.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useBraveApiKeyQuery(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
