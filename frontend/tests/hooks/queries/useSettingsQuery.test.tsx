import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '../../../src/test-utils/query-wrapper';

const mockSettingsGet = vi.fn();

vi.mock('../../../src/lib/settings-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/lib/settings-api')>();
  return {
    ...actual,
    settingsApi: {
      ...actual.settingsApi,
      get: (...args: unknown[]) => mockSettingsGet(...args),
      patch: vi.fn().mockResolvedValue({}),
    },
  };
});

import { useSettingsQuery } from '../../../src/hooks/queries/useSettingsQuery';

describe('useSettingsQuery', () => {
  const mockSettings = {
    theme: 'dark',
    language: 'en',
    lastSelectedModel: 'gpt-4o',
    disabledSkills: [],
    llmLanguage: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSettingsGet.mockResolvedValue(mockSettings);
  });

  it('fetches settings on mount', async () => {
    const { result } = renderHook(() => useSettingsQuery(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockSettingsGet).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockSettings);
  });

  it('returns undefined while loading', () => {
    mockSettingsGet.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useSettingsQuery(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('handles error state gracefully', async () => {
    mockSettingsGet.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useSettingsQuery(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });
});
