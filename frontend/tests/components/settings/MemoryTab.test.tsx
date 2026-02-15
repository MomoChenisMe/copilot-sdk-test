import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { mockMemoryApi } = vi.hoisted(() => {
  const _mockMemoryApi = {
    getPreferences: vi.fn().mockResolvedValue({ content: '# My Preferences' }),
    putPreferences: vi.fn().mockResolvedValue({ ok: true }),
    listProjects: vi.fn().mockResolvedValue({
      items: [
        { name: 'proj-alpha', content: '# Alpha project notes' },
        { name: 'proj-beta', content: '# Beta project notes' },
      ],
    }),
    putProject: vi.fn().mockResolvedValue({ ok: true }),
    deleteProject: vi.fn().mockResolvedValue({ ok: true }),
    listSolutions: vi.fn().mockResolvedValue({
      items: [
        { name: 'fix-cache', content: '# Cache fix steps' },
      ],
    }),
    putSolution: vi.fn().mockResolvedValue({ ok: true }),
    deleteSolution: vi.fn().mockResolvedValue({ ok: true }),
  };
  return { mockMemoryApi: _mockMemoryApi };
});

vi.mock('../../../src/lib/prompts-api', () => ({
  promptsApi: {
    getProfile: vi.fn().mockResolvedValue({ content: '' }),
    putProfile: vi.fn().mockResolvedValue({ ok: true }),
    getAgent: vi.fn().mockResolvedValue({ content: '' }),
    putAgent: vi.fn().mockResolvedValue({ ok: true }),
    listPresets: vi.fn().mockResolvedValue({ presets: [] }),
    putPreset: vi.fn().mockResolvedValue({ ok: true }),
    deletePreset: vi.fn().mockResolvedValue({ ok: true }),
  },
  memoryApi: mockMemoryApi,
}));

import { SettingsPanel } from '../../../src/components/settings/SettingsPanel';

describe('SettingsPanel - Memory Tab', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    activePresets: [] as string[],
    onTogglePreset: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMemoryApi.getPreferences.mockResolvedValue({ content: '# My Preferences' });
    mockMemoryApi.listProjects.mockResolvedValue({
      items: [
        { name: 'proj-alpha', content: '# Alpha project notes' },
        { name: 'proj-beta', content: '# Beta project notes' },
      ],
    });
    mockMemoryApi.listSolutions.mockResolvedValue({
      items: [{ name: 'fix-cache', content: '# Cache fix steps' }],
    });
  });

  async function openMemoryTab() {
    render(<SettingsPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('tab', { name: /memory/i }));
    await waitFor(() => {
      expect(screen.getByText('Preferences')).toBeTruthy();
    });
  }

  // === Structure ===
  it('should show Preferences, Projects, Solutions sections', async () => {
    await openMemoryTab();
    expect(screen.getByText('Preferences')).toBeTruthy();
    expect(screen.getByText('Projects')).toBeTruthy();
    expect(screen.getByText('Solutions')).toBeTruthy();
  });

  // === Preferences ===
  it('should load and display preferences content', async () => {
    await openMemoryTab();
    await waitFor(() => {
      expect(screen.getByTestId('memory-preferences')).toBeTruthy();
    });
  });

  it('should save preferences on save button click', async () => {
    await openMemoryTab();
    await waitFor(() => {
      expect(screen.getByTestId('save-preferences')).toBeTruthy();
    });

    const textarea = screen.getByTestId('memory-preferences');
    fireEvent.change(textarea, { target: { value: 'Updated prefs' } });
    fireEvent.click(screen.getByTestId('save-preferences'));

    await waitFor(() => {
      expect(mockMemoryApi.putPreferences).toHaveBeenCalledWith('Updated prefs');
    });
  });

  // === Projects ===
  it('should list projects', async () => {
    await openMemoryTab();
    expect(screen.getByText('proj-alpha')).toBeTruthy();
    expect(screen.getByText('proj-beta')).toBeTruthy();
  });

  it('should expand project for editing', async () => {
    await openMemoryTab();
    fireEvent.click(screen.getByTestId('project-expand-proj-alpha'));
    await waitFor(() => {
      expect(screen.getByDisplayValue('# Alpha project notes')).toBeTruthy();
    });
  });

  // === Solutions ===
  it('should list solutions', async () => {
    await openMemoryTab();
    expect(screen.getByText('fix-cache')).toBeTruthy();
  });

  // === Delete confirmation ===
  it('should show delete confirmation dialog when clicking delete on a project', async () => {
    await openMemoryTab();
    fireEvent.click(screen.getByTestId('project-delete-proj-alpha'));

    await waitFor(() => {
      expect(screen.getByTestId('delete-confirm-dialog')).toBeTruthy();
      expect(screen.getByText('確定要刪除此項目嗎？')).toBeTruthy();
    });
  });

  it('should call deleteProject after confirming deletion', async () => {
    await openMemoryTab();
    fireEvent.click(screen.getByTestId('project-delete-proj-alpha'));

    await waitFor(() => {
      expect(screen.getByTestId('delete-confirm')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('delete-confirm'));

    await waitFor(() => {
      expect(mockMemoryApi.deleteProject).toHaveBeenCalledWith('proj-alpha');
    });
  });

  it('should dismiss delete dialog on cancel', async () => {
    await openMemoryTab();
    fireEvent.click(screen.getByTestId('project-delete-proj-alpha'));

    await waitFor(() => {
      expect(screen.getByTestId('delete-cancel')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('delete-cancel'));

    await waitFor(() => {
      expect(screen.queryByTestId('delete-confirm-dialog')).toBeNull();
    });
    expect(mockMemoryApi.deleteProject).not.toHaveBeenCalled();
  });

  it('should show delete confirmation for solutions', async () => {
    await openMemoryTab();
    fireEvent.click(screen.getByTestId('solution-delete-fix-cache'));

    await waitFor(() => {
      expect(screen.getByTestId('delete-confirm-dialog')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('delete-confirm'));

    await waitFor(() => {
      expect(mockMemoryApi.deleteSolution).toHaveBeenCalledWith('fix-cache');
    });
  });
});
