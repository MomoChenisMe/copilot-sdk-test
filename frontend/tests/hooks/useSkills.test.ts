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

// Mock the copilot API
vi.mock('../../src/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/api')>();
  return {
    ...actual,
    copilotApi: {
      listCommands: vi.fn(),
    },
  };
});

import { skillsApi } from '../../src/lib/prompts-api';
import { copilotApi } from '../../src/lib/api';

describe('useSkills', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({ skills: [], skillsLoaded: false, sdkCommands: [], sdkCommandsLoaded: false });
    // Provide default resolved mocks so both effects can run without error
    vi.mocked(skillsApi.list).mockResolvedValue({ skills: [] });
    vi.mocked(copilotApi.listCommands).mockResolvedValue([]);
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

  it('fetches SDK commands on mount and stores in store', async () => {
    const mockSkills = [{ name: 'a', description: 'A', content: '...', builtin: false }];
    vi.mocked(skillsApi.list).mockResolvedValueOnce({ skills: mockSkills });

    const mockCmds = [
      { name: 'explain', description: 'Explain code' },
      { name: 'fix', description: 'Fix code' },
    ];
    vi.mocked(copilotApi.listCommands).mockResolvedValueOnce(mockCmds);

    renderHook(() => useSkills());

    await waitFor(() => {
      const state = useAppStore.getState();
      expect(state.sdkCommands).toEqual(mockCmds);
      expect(state.sdkCommandsLoaded).toBe(true);
    });

    expect(copilotApi.listCommands).toHaveBeenCalledTimes(1);
  });

  it('handles SDK commands fetch failure gracefully', async () => {
    const mockSkills = [{ name: 'a', description: 'A', content: '...', builtin: false }];
    vi.mocked(skillsApi.list).mockResolvedValueOnce({ skills: mockSkills });
    vi.mocked(copilotApi.listCommands).mockRejectedValueOnce(new Error('fail'));

    renderHook(() => useSkills());

    await waitFor(() => {
      const state = useAppStore.getState();
      expect(state.sdkCommandsLoaded).toBe(true);
      expect(state.sdkCommands).toEqual([]);
    });
  });

  it('does not refetch SDK commands if already loaded', async () => {
    useAppStore.setState({ sdkCommands: [{ name: 'x', description: 'X' }], sdkCommandsLoaded: true });
    vi.mocked(skillsApi.list).mockResolvedValueOnce({ skills: [] });

    renderHook(() => useSkills());

    expect(copilotApi.listCommands).not.toHaveBeenCalled();
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
