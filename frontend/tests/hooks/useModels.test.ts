import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAppStore } from '../../src/store/index';

// Mock the api module
vi.mock('../../src/lib/api', () => ({
  apiGet: vi.fn(),
}));

import { apiGet } from '../../src/lib/api';
import { useModels } from '../../src/hooks/useModels';

describe('useModels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      models: [],
      modelsLoading: false,
      modelsError: null,
    });
  });

  it('should set modelsLoading to true on mount', async () => {
    (apiGet as Mock).mockReturnValue(new Promise(() => {})); // never resolves
    renderHook(() => useModels());

    expect(useAppStore.getState().modelsLoading).toBe(true);
  });

  it('should call GET /api/copilot/models on mount', async () => {
    (apiGet as Mock).mockResolvedValue([]);
    renderHook(() => useModels());

    expect(apiGet).toHaveBeenCalledWith('/api/copilot/models');
  });

  it('should set models on successful fetch', async () => {
    const mockModels = [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' },
    ];
    (apiGet as Mock).mockResolvedValue(mockModels);
    renderHook(() => useModels());

    await waitFor(() => {
      expect(useAppStore.getState().models).toEqual(mockModels);
    });
    expect(useAppStore.getState().modelsLoading).toBe(false);
    expect(useAppStore.getState().modelsError).toBeNull();
  });

  it('should set modelsError on failed fetch', async () => {
    (apiGet as Mock).mockRejectedValue(new Error('Network error'));
    renderHook(() => useModels());

    await waitFor(() => {
      expect(useAppStore.getState().modelsError).toBe('Network error');
    });
    expect(useAppStore.getState().modelsLoading).toBe(false);
    expect(useAppStore.getState().models).toEqual([]);
  });

  it('should not refetch if models were fetched recently', async () => {
    useAppStore.setState({
      models: [{ id: 'gpt-4o', name: 'GPT-4o' }],
      modelsLastFetched: Date.now(),
    });
    renderHook(() => useModels());

    expect(apiGet).not.toHaveBeenCalled();
  });

  it('should refetch if models were fetched more than 30 minutes ago', async () => {
    const thirtyOneMinAgo = Date.now() - 31 * 60 * 1000;
    useAppStore.setState({
      models: [{ id: 'gpt-4o', name: 'GPT-4o' }],
      modelsLastFetched: thirtyOneMinAgo,
    });
    (apiGet as Mock).mockResolvedValue([
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'new-model', name: 'New Model' },
    ]);
    renderHook(() => useModels());

    expect(apiGet).toHaveBeenCalledWith('/api/copilot/models');
    await waitFor(() => {
      expect(useAppStore.getState().models).toHaveLength(2);
    });
  });

  it('should provide refreshModels function that forces re-fetch', async () => {
    useAppStore.setState({
      models: [{ id: 'gpt-4o', name: 'GPT-4o' }],
      modelsLastFetched: Date.now(),
    });
    (apiGet as Mock).mockResolvedValue([
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'claude-sonnet', name: 'Claude Sonnet' },
    ]);

    const { result } = renderHook(() => useModels());

    // Should not auto-fetch since recently fetched
    expect(apiGet).not.toHaveBeenCalled();

    // Manual refresh should force fetch
    await result.current.refreshModels();
    expect(apiGet).toHaveBeenCalledWith('/api/copilot/models');
  });
});
