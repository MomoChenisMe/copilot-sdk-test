import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '../../../src/test-utils/query-wrapper';
import { useModelsQuery } from '../../../src/hooks/queries/useModelsQuery';
import { useAppStore } from '../../../src/store';

vi.mock('../../../src/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/lib/api')>();
  return {
    ...actual,
    apiGet: vi.fn(),
    apiPatch: vi.fn().mockResolvedValue({}),
  };
});

vi.mock('../../../src/lib/settings-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/lib/settings-api')>();
  return {
    ...actual,
    settingsApi: {
      ...actual.settingsApi,
      patch: vi.fn().mockResolvedValue({}),
    },
  };
});

import { apiGet } from '../../../src/lib/api';

const mockApiGet = vi.mocked(apiGet);

describe('useModelsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({ lastSelectedModel: null });
  });

  it('fetches models on mount', async () => {
    const models = [
      { id: 'gpt-4o', name: 'GPT-4o', premiumMultiplier: 1 },
      { id: 'claude-sonnet', name: 'Claude Sonnet', premiumMultiplier: 0.5 },
    ];
    mockApiGet.mockResolvedValue(models);

    const { result } = renderHook(() => useModelsQuery(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(models);
    expect(mockApiGet).toHaveBeenCalledWith('/api/copilot/models');
  });

  it('returns error state on failure', async () => {
    mockApiGet.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useModelsQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  it('validates lastSelectedModel exists in fetched list', async () => {
    useAppStore.setState({ lastSelectedModel: 'deleted-model' });

    const models = [
      { id: 'gpt-4o', name: 'GPT-4o', premiumMultiplier: 1 },
    ];
    mockApiGet.mockResolvedValue(models);

    renderHook(() => useModelsQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(useAppStore.getState().lastSelectedModel).toBe('gpt-4o');
    });
  });

  it('keeps lastSelectedModel if it exists in fetched list', async () => {
    useAppStore.setState({ lastSelectedModel: 'gpt-4o' });

    const models = [
      { id: 'gpt-4o', name: 'GPT-4o', premiumMultiplier: 1 },
      { id: 'claude-sonnet', name: 'Claude Sonnet', premiumMultiplier: 0.5 },
    ];
    mockApiGet.mockResolvedValue(models);

    renderHook(() => useModelsQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(useAppStore.getState().lastSelectedModel).toBe('gpt-4o');
    });
  });
});
