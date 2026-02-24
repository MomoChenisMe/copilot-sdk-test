import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '../../../src/test-utils/query-wrapper';

const mockSkillsList = vi.fn();

vi.mock('../../../src/lib/prompts-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/lib/prompts-api')>();
  return {
    ...actual,
    skillsApi: {
      ...actual.skillsApi,
      list: (...args: unknown[]) => mockSkillsList(...args),
    },
  };
});

import { useSkillsQuery } from '../../../src/hooks/queries/useSkillsQuery';

describe('useSkillsQuery', () => {
  const mockSkills = [
    { name: 'tdd-workflow', description: 'Test-driven development', content: '# TDD', builtin: true },
    { name: 'code-review', description: 'Review code', content: '# Review', builtin: false },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockSkillsList.mockResolvedValue({ skills: mockSkills });
  });

  it('fetches skills on mount', async () => {
    const { result } = renderHook(() => useSkillsQuery(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockSkillsList).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockSkills);
  });

  it('returns empty array while loading', () => {
    mockSkillsList.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useSkillsQuery(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('handles error state', async () => {
    mockSkillsList.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useSkillsQuery(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('extracts skills array from response', async () => {
    const { result } = renderHook(() => useSkillsQuery(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should return skills array, not the wrapper { skills: [...] }
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].name).toBe('tdd-workflow');
  });
});
