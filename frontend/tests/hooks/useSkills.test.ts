import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSkills } from '../../src/hooks/useSkills';
import { useAppStore } from '../../src/store';

// Mock the skills API
vi.mock('../../src/lib/prompts-api', () => ({
  skillsApi: {
    list: vi.fn(),
  },
}));

import { skillsApi } from '../../src/lib/prompts-api';

describe('useSkills', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({ skills: [], skillsLoaded: false });
  });

  it('fetches skills on mount and stores in store', async () => {
    const mockSkills = [
      { name: 'code-review', description: 'Review code', content: '...', builtin: false },
      { name: 'brainstorm', description: 'Brainstorm ideas', content: '...', builtin: true },
    ];
    vi.mocked(skillsApi.list).mockResolvedValueOnce({ skills: mockSkills });

    renderHook(() => useSkills());

    await waitFor(() => {
      const state = useAppStore.getState();
      expect(state.skills).toEqual(mockSkills);
      expect(state.skillsLoaded).toBe(true);
    });

    expect(skillsApi.list).toHaveBeenCalledTimes(1);
  });

  it('handles fetch failure gracefully', async () => {
    vi.mocked(skillsApi.list).mockRejectedValueOnce(new Error('Network error'));

    renderHook(() => useSkills());

    await waitFor(() => {
      const state = useAppStore.getState();
      expect(state.skillsLoaded).toBe(true); // still marks as loaded to prevent infinite retries
      expect(state.skills).toEqual([]);
    });
  });

  it('does not refetch if skills already loaded', async () => {
    useAppStore.setState({
      skills: [{ name: 'existing', description: 'Existing', content: '...', builtin: false }],
      skillsLoaded: true,
    });

    renderHook(() => useSkills());

    // Should not call the API again
    expect(skillsApi.list).not.toHaveBeenCalled();
  });
});
