import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '../../../src/test-utils/query-wrapper';

const mockListCommands = vi.fn();

vi.mock('../../../src/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/lib/api')>();
  return {
    ...actual,
    copilotApi: {
      ...actual.copilotApi,
      listCommands: (...args: unknown[]) => mockListCommands(...args),
    },
  };
});

// Mock settingsApi to prevent side effects
vi.mock('../../../src/lib/settings-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/lib/settings-api')>();
  return {
    ...actual,
    settingsApi: { ...actual.settingsApi, patch: vi.fn().mockResolvedValue({}) },
  };
});

import { useSdkCommandsQuery } from '../../../src/hooks/queries/useSdkCommandsQuery';

describe('useSdkCommandsQuery', () => {
  const mockCommands = [
    { name: 'explain', description: 'Explain code' },
    { name: 'test', description: 'Generate tests' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockListCommands.mockResolvedValue(mockCommands);
  });

  it('fetches SDK commands on mount', async () => {
    const { result } = renderHook(() => useSdkCommandsQuery(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockListCommands).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockCommands);
  });

  it('returns undefined while loading', () => {
    mockListCommands.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useSdkCommandsQuery(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('handles error state', async () => {
    mockListCommands.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useSdkCommandsQuery(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });
});
