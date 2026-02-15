import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock prompts-api
vi.mock('../../../src/lib/prompts-api', () => ({
  promptsApi: {
    getProfile: vi.fn().mockResolvedValue({ content: '# Profile content' }),
    putProfile: vi.fn().mockResolvedValue({ ok: true }),
    getAgent: vi.fn().mockResolvedValue({ content: '# Agent content' }),
    putAgent: vi.fn().mockResolvedValue({ ok: true }),
    listPresets: vi.fn().mockResolvedValue({
      presets: [
        { name: 'code-review', content: '# Code Review' },
        { name: 'devops', content: '# DevOps' },
      ],
    }),
    putPreset: vi.fn().mockResolvedValue({ ok: true }),
    deletePreset: vi.fn().mockResolvedValue({ ok: true }),
  },
  memoryApi: {
    getPreferences: vi.fn().mockResolvedValue({ content: '# Prefs' }),
    putPreferences: vi.fn().mockResolvedValue({ ok: true }),
    listProjects: vi.fn().mockResolvedValue({ items: [{ name: 'proj-1', content: '# Proj' }] }),
    putProject: vi.fn().mockResolvedValue({ ok: true }),
    deleteProject: vi.fn().mockResolvedValue({ ok: true }),
    listSolutions: vi.fn().mockResolvedValue({ items: [{ name: 'sol-1', content: '# Sol' }] }),
    putSolution: vi.fn().mockResolvedValue({ ok: true }),
    deleteSolution: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

import { SettingsPanel } from '../../../src/components/settings/SettingsPanel';

describe('SettingsPanel', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    activePresets: ['code-review'] as string[],
    onTogglePreset: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // === Structure ===
  describe('structure', () => {
    it('should render when open is true', () => {
      render(<SettingsPanel {...defaultProps} />);
      expect(screen.getByTestId('settings-panel')).toBeTruthy();
    });

    it('should not render when open is false', () => {
      render(<SettingsPanel {...defaultProps} open={false} />);
      expect(screen.queryByTestId('settings-panel')).toBeNull();
    });

    it('should render tab buttons for Profile, Agent, Presets, and Memory', () => {
      render(<SettingsPanel {...defaultProps} />);
      expect(screen.getByRole('tab', { name: /profile/i })).toBeTruthy();
      expect(screen.getByRole('tab', { name: /agent/i })).toBeTruthy();
      expect(screen.getByRole('tab', { name: /presets/i })).toBeTruthy();
      expect(screen.getByRole('tab', { name: /memory/i })).toBeTruthy();
    });

    it('should default to Profile tab', () => {
      render(<SettingsPanel {...defaultProps} />);
      const profileTab = screen.getByRole('tab', { name: /profile/i });
      expect(profileTab.getAttribute('aria-selected')).toBe('true');
    });

    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<SettingsPanel {...defaultProps} onClose={onClose} />);
      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('should call onClose when overlay backdrop is clicked', () => {
      const onClose = vi.fn();
      render(<SettingsPanel {...defaultProps} onClose={onClose} />);
      fireEvent.click(screen.getByTestId('settings-overlay'));
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  // === Profile Tab ===
  describe('Profile tab', () => {
    it('should load and display profile content', async () => {
      render(<SettingsPanel {...defaultProps} />);
      await waitFor(() => {
        expect(screen.getByDisplayValue('# Profile content')).toBeTruthy();
      });
    });

    it('should save profile content on save button click', async () => {
      const { promptsApi } = await import('../../../src/lib/prompts-api');
      render(<SettingsPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('# Profile content')).toBeTruthy();
      });

      const textarea = screen.getByDisplayValue('# Profile content');
      fireEvent.change(textarea, { target: { value: 'Updated profile' } });

      const saveBtn = screen.getByTestId('save-profile');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(promptsApi.putProfile).toHaveBeenCalledWith('Updated profile');
      });
    });
  });

  // === Agent Tab ===
  describe('Agent tab', () => {
    it('should load and display agent content when tab is clicked', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /agent/i }));

      await waitFor(() => {
        expect(screen.getByDisplayValue('# Agent content')).toBeTruthy();
      });
    });
  });

  // === Presets Tab ===
  describe('Presets tab', () => {
    it('should list presets with toggle switches', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /presets/i }));

      await waitFor(() => {
        expect(screen.getByText('code-review')).toBeTruthy();
        expect(screen.getByText('devops')).toBeTruthy();
      });
    });

    it('should show toggle as active for presets in activePresets', async () => {
      render(<SettingsPanel {...defaultProps} activePresets={['code-review']} />);
      fireEvent.click(screen.getByRole('tab', { name: /presets/i }));

      await waitFor(() => {
        const toggle = screen.getByTestId('preset-toggle-code-review');
        expect(toggle.getAttribute('aria-checked')).toBe('true');
      });
    });

    it('should call onTogglePreset when toggle is clicked', async () => {
      const onTogglePreset = vi.fn();
      render(<SettingsPanel {...defaultProps} onTogglePreset={onTogglePreset} />);
      fireEvent.click(screen.getByRole('tab', { name: /presets/i }));

      await waitFor(() => {
        expect(screen.getByTestId('preset-toggle-devops')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('preset-toggle-devops'));
      expect(onTogglePreset).toHaveBeenCalledWith('devops');
    });

    it('should expand preset for editing when clicked', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /presets/i }));

      await waitFor(() => {
        expect(screen.getByText('code-review')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('preset-expand-code-review'));

      await waitFor(() => {
        expect(screen.getByDisplayValue('# Code Review')).toBeTruthy();
      });
    });
  });
});
