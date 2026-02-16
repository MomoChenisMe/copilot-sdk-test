import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useAppStore } from '../../../src/store/index';

// Mock Markdown component
vi.mock('../../../src/components/shared/Markdown', () => ({
  Markdown: ({ content }: { content: string }) => <div data-testid="markdown-render">{content}</div>,
}));

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
    getSystemPrompt: vi.fn().mockResolvedValue({ content: '# System Prompt' }),
    putSystemPrompt: vi.fn().mockResolvedValue({ ok: true }),
    resetSystemPrompt: vi.fn().mockResolvedValue({ content: '# Default System Prompt' }),
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
  skillsApi: {
    list: vi.fn().mockResolvedValue({
      skills: [
        { name: 'tdd-workflow', description: 'Test-driven development', content: '# TDD Workflow', builtin: true },
        { name: 'code-review', description: 'Review code for quality', content: '# Code Review Skill', builtin: false },
        { name: 'debugging', description: 'Help debug issues', content: '# Debugging Skill', builtin: false },
      ],
    }),
    get: vi.fn().mockResolvedValue({ name: 'code-review', description: 'Review code for quality', content: '# Code Review Skill', builtin: false }),
    put: vi.fn().mockResolvedValue({ ok: true }),
    delete: vi.fn().mockResolvedValue({ ok: true }),
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

    it('should render all 6 tab buttons using i18n keys', () => {
      render(<SettingsPanel {...defaultProps} />);
      // Tab names should come from t('settings.tabs.*') — en.json values
      expect(screen.getByRole('tab', { name: /system prompt/i })).toBeTruthy();
      expect(screen.getByRole('tab', { name: /profile/i })).toBeTruthy();
      expect(screen.getByRole('tab', { name: /agent/i })).toBeTruthy();
      expect(screen.getByRole('tab', { name: /presets/i })).toBeTruthy();
      expect(screen.getByRole('tab', { name: /memory/i })).toBeTruthy();
      expect(screen.getByRole('tab', { name: /skills/i })).toBeTruthy();
    });

    it('should default to System Prompt tab', () => {
      render(<SettingsPanel {...defaultProps} />);
      const systemPromptTab = screen.getByRole('tab', { name: /system prompt/i });
      expect(systemPromptTab.getAttribute('aria-selected')).toBe('true');
    });

    it('should render panel title using i18n key', () => {
      render(<SettingsPanel {...defaultProps} />);
      // Title should be t('settings.title') = "Settings"
      expect(screen.getByText('Settings')).toBeTruthy();
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

  // === i18n ===
  describe('i18n', () => {
    it('should use translated text for Save buttons (not hardcoded)', async () => {
      render(<SettingsPanel {...defaultProps} />);
      // Click Profile tab to see Save button
      fireEvent.click(screen.getByRole('tab', { name: /profile/i }));
      await waitFor(() => {
        // Save button should show t('settings.save') = "Save"
        expect(screen.getByTestId('save-profile')).toBeTruthy();
        expect(screen.getByTestId('save-profile').textContent).toBe('Save');
      });
    });

    it('should show translated toast on save success', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /profile/i }));

      await waitFor(() => {
        expect(screen.getByDisplayValue('# Profile content')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('save-profile'));

      await waitFor(() => {
        // Toast should be t('settings.toast.saved') = "Saved"
        expect(screen.getByText('Saved')).toBeTruthy();
      });
    });

    it('should show translated toast on save failure', async () => {
      const { promptsApi } = await import('../../../src/lib/prompts-api');
      (promptsApi.putProfile as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('fail'));

      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /profile/i }));

      await waitFor(() => {
        expect(screen.getByDisplayValue('# Profile content')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('save-profile'));

      await waitFor(() => {
        // Toast should be t('settings.toast.saveFailed') = "Save failed"
        expect(screen.getByText('Save failed')).toBeTruthy();
      });
    });

    it('should show translated loading text', () => {
      render(<SettingsPanel {...defaultProps} />);
      // During initial load, t('settings.loading') = "Loading..."
      fireEvent.click(screen.getByRole('tab', { name: /profile/i }));
      expect(screen.getByText('Loading...')).toBeTruthy();
    });

    it('should show translated Memory section headers', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));

      await waitFor(() => {
        // Section headers from t('settings.memory.*')
        expect(screen.getByText('Preferences')).toBeTruthy();
        expect(screen.getByText('Projects')).toBeTruthy();
        expect(screen.getByText('Solutions')).toBeTruthy();
      });
    });

    it('should show translated delete confirmation dialog', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));

      await waitFor(() => {
        expect(screen.getByTestId('project-delete-proj-1')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('project-delete-proj-1'));

      // Delete dialog texts from t('settings.deleteDialog.*')
      expect(screen.getByText('Are you sure you want to delete this item?')).toBeTruthy();
      expect(screen.getByText('Cancel')).toBeTruthy();
      expect(screen.getByText('Delete')).toBeTruthy();
    });
  });

  // === System Prompt Tab ===
  describe('System Prompt tab', () => {
    it('should load and display system prompt content', async () => {
      render(<SettingsPanel {...defaultProps} />);
      // System Prompt is the default tab
      await waitFor(() => {
        expect(screen.getByDisplayValue('# System Prompt')).toBeTruthy();
      });
    });

    it('should save system prompt content on save button click', async () => {
      const { promptsApi } = await import('../../../src/lib/prompts-api');
      render(<SettingsPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('# System Prompt')).toBeTruthy();
      });

      const textarea = screen.getByDisplayValue('# System Prompt');
      fireEvent.change(textarea, { target: { value: 'Updated prompt' } });

      fireEvent.click(screen.getByTestId('save-system-prompt'));

      await waitFor(() => {
        expect(promptsApi.putSystemPrompt).toHaveBeenCalledWith('Updated prompt');
      });
    });

    it('should show saved toast after successful save', async () => {
      render(<SettingsPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('# System Prompt')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('save-system-prompt'));

      await waitFor(() => {
        expect(screen.getByText('Saved')).toBeTruthy();
      });
    });

    it('should render Reset to Default button', async () => {
      render(<SettingsPanel {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('reset-system-prompt')).toBeTruthy();
      });

      expect(screen.getByTestId('reset-system-prompt').textContent).toBe('Reset to Default');
    });
  });

  // === Profile Tab ===
  describe('Profile tab', () => {
    it('should load and display profile content', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /profile/i }));
      await waitFor(() => {
        expect(screen.getByDisplayValue('# Profile content')).toBeTruthy();
      });
    });

    it('should save profile content on save button click', async () => {
      const { promptsApi } = await import('../../../src/lib/prompts-api');
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /profile/i }));

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

  // === Skills Tab ===
  describe('Skills tab', () => {
    beforeEach(() => {
      useAppStore.setState({ disabledSkills: ['debugging'] });
    });

    it('should list skills with names and descriptions', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /skills/i }));
      await waitFor(() => {
        expect(screen.getByTestId('skill-expand-code-review')).toBeTruthy();
        expect(screen.getByTestId('skill-expand-debugging')).toBeTruthy();
        // Descriptions should be visible
        expect(screen.getByText('Review code for quality')).toBeTruthy();
        expect(screen.getByText('Help debug issues')).toBeTruthy();
      });
    });

    it('should show toggle as enabled for skills not in disabledSkills', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /skills/i }));
      await waitFor(() => {
        const toggle = screen.getByTestId('skill-toggle-code-review');
        expect(toggle.getAttribute('aria-checked')).toBe('true');
      });
    });

    it('should show toggle as disabled for skills in disabledSkills', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /skills/i }));
      await waitFor(() => {
        const toggle = screen.getByTestId('skill-toggle-debugging');
        expect(toggle.getAttribute('aria-checked')).toBe('false');
      });
    });

    it('should show create form with name, description, and content fields', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /skills/i }));
      await waitFor(() => {
        expect(screen.getByTestId('new-skill-button')).toBeTruthy();
      });
      fireEvent.click(screen.getByTestId('new-skill-button'));
      expect(screen.getByPlaceholderText('e.g. code-review')).toBeTruthy();
      expect(screen.getByPlaceholderText('Brief description of what this skill does...')).toBeTruthy();
      expect(screen.getByPlaceholderText('Write your SKILL.md content here...')).toBeTruthy();
    });

    it('should create a new skill with description via API', async () => {
      const { skillsApi } = await import('../../../src/lib/prompts-api');
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /skills/i }));
      await waitFor(() => {
        expect(screen.getByTestId('new-skill-button')).toBeTruthy();
      });
      fireEvent.click(screen.getByTestId('new-skill-button'));

      fireEvent.change(screen.getByPlaceholderText('e.g. code-review'), {
        target: { value: 'testing' },
      });
      fireEvent.change(screen.getByPlaceholderText('Brief description of what this skill does...'), {
        target: { value: 'Run tests for the project' },
      });
      fireEvent.change(screen.getByPlaceholderText('Write your SKILL.md content here...'), {
        target: { value: '# Testing Skill' },
      });

      fireEvent.click(screen.getByTestId('create-skill-button'));
      await waitFor(() => {
        expect(skillsApi.put).toHaveBeenCalledWith('testing', 'Run tests for the project', '# Testing Skill');
      });
    });

    it('should expand skill for editing with description and content', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /skills/i }));
      await waitFor(() => {
        expect(screen.getByTestId('skill-expand-code-review')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('skill-expand-code-review'));

      await waitFor(() => {
        expect(screen.getByDisplayValue('Review code for quality')).toBeTruthy();
        expect(screen.getByDisplayValue('# Code Review Skill')).toBeTruthy();
      });
    });

    it('should delete skill with confirmation dialog', async () => {
      const { skillsApi } = await import('../../../src/lib/prompts-api');
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /skills/i }));
      await waitFor(() => {
        expect(screen.getByTestId('skill-delete-code-review')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('skill-delete-code-review'));

      expect(screen.getByText('Are you sure you want to delete this skill?')).toBeTruthy();
      fireEvent.click(screen.getByTestId('skill-delete-confirm'));

      await waitFor(() => {
        expect(skillsApi.delete).toHaveBeenCalledWith('code-review');
      });
    });

    it('should toggle between Edit and Preview mode in expanded skill', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /skills/i }));
      await waitFor(() => {
        expect(screen.getByTestId('skill-expand-code-review')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('skill-expand-code-review'));

      await waitFor(() => {
        // Should start in Edit mode — textarea visible
        expect(screen.getByDisplayValue('# Code Review Skill')).toBeTruthy();
      });

      // Should see Edit and Preview buttons
      expect(screen.getByTestId('skill-edit-button')).toBeTruthy();
      expect(screen.getByTestId('skill-preview-button')).toBeTruthy();

      // Click Preview to switch to markdown render
      fireEvent.click(screen.getByTestId('skill-preview-button'));

      // Textarea should be gone, markdown preview should be visible
      expect(screen.queryByDisplayValue('# Code Review Skill')).toBeNull();
      expect(screen.getByTestId('skill-preview-content')).toBeTruthy();

      // Click Edit to switch back
      fireEvent.click(screen.getByTestId('skill-edit-button'));
      expect(screen.getByDisplayValue('# Code Review Skill')).toBeTruthy();
    });

    it('should prevent creation with empty name', async () => {
      const { skillsApi } = await import('../../../src/lib/prompts-api');
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /skills/i }));
      await waitFor(() => {
        expect(screen.getByTestId('new-skill-button')).toBeTruthy();
      });
      fireEvent.click(screen.getByTestId('new-skill-button'));

      // Leave name empty, try to create
      fireEvent.click(screen.getByTestId('create-skill-button'));
      expect(skillsApi.put).not.toHaveBeenCalled();
    });

    it('should show validation error for name with special characters', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /skills/i }));
      await waitFor(() => {
        expect(screen.getByTestId('new-skill-button')).toBeTruthy();
      });
      fireEvent.click(screen.getByTestId('new-skill-button'));

      // Type name with path traversal chars
      fireEvent.change(screen.getByPlaceholderText('e.g. code-review'), {
        target: { value: '../malicious' },
      });

      // Should show error message
      expect(screen.getByTestId('skill-name-error')).toBeTruthy();

      // Create button should be disabled
      expect(screen.getByTestId('create-skill-button').hasAttribute('disabled')).toBe(true);
    });

    it('should show empty state when no skills exist', async () => {
      const { skillsApi } = await import('../../../src/lib/prompts-api');
      (skillsApi.list as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ skills: [] });

      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /skills/i }));
      await waitFor(() => {
        expect(screen.getByText('No skills yet. Create one to get started.')).toBeTruthy();
      });
    });

    // --- Builtin / User skill sections ---

    it('should show system skills section with System badge', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /skills/i }));
      await waitFor(() => {
        expect(screen.getByTestId('system-skills-section')).toBeTruthy();
        expect(screen.getByTestId('user-skills-section')).toBeTruthy();
      });
    });

    it('should NOT show edit/delete buttons for builtin skills', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /skills/i }));
      await waitFor(() => {
        expect(screen.getByTestId('skill-expand-tdd-workflow')).toBeTruthy();
      });

      // Expand the builtin skill
      fireEvent.click(screen.getByTestId('skill-expand-tdd-workflow'));

      // No edit/delete buttons for builtin
      expect(screen.queryByTestId('skill-edit-tdd-workflow')).toBeNull();
      expect(screen.queryByTestId('skill-delete-tdd-workflow')).toBeNull();
    });

    it('should show toggle for builtin skills', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /skills/i }));
      await waitFor(() => {
        expect(screen.getByTestId('skill-toggle-tdd-workflow')).toBeTruthy();
      });
    });
  });
});
