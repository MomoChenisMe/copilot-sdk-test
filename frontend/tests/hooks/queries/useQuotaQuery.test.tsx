import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '../../../src/test-utils/query-wrapper';

const mockApiGet = vi.fn();

vi.mock('../../../src/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/lib/api')>();
  return { ...actual, apiGet: (...args: unknown[]) => mockApiGet(...args) };
});

vi.mock('../../../src/lib/settings-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/lib/settings-api')>();
  return { ...actual, settingsApi: { ...actual.settingsApi, patch: vi.fn().mockResolvedValue({}) } };
});

import { useQuotaQuery } from '../../../src/hooks/queries/useQuotaQuery';

describe('useQuotaQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and transforms quota data', async () => {
    mockApiGet.mockResolvedValue({
      quota: { used: 10, total: 100, resetDate: '2025-02-01', unlimited: false },
    });
    const { result } = renderHook(() => useQuotaQuery(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      used: 10,
      total: 100,
      resetDate: '2025-02-01',
      unlimited: false,
    });
  });

  it('returns null when quota is absent in response', async () => {
    mockApiGet.mockResolvedValue({});
    const { result } = renderHook(() => useQuotaQuery(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
  });

  it('handles error state', async () => {
    mockApiGet.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useQuotaQuery(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
