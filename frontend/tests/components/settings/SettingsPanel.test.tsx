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

// Mock configApi and memoryApi
vi.mock('../../../src/lib/api', () => ({
  apiGet: vi.fn().mockResolvedValue({ currentVersion: '0.1.0', latestVersion: '0.1.0', updateAvailable: false }),
  configApi: {
    get: vi.fn().mockResolvedValue({ defaultCwd: '/home' }),
    getBraveApiKey: vi.fn().mockResolvedValue({ hasKey: false, maskedKey: '' }),
    putBraveApiKey: vi.fn().mockResolvedValue({ ok: true }),
  },
  memoryApi: {
    getMain: vi.fn().mockResolvedValue({ content: '- User prefers TypeScript' }),
    putMain: vi.fn().mockResolvedValue({ ok: true }),
    listDailyLogs: vi.fn().mockResolvedValue({ dates: ['2026-02-17'] }),
    searchMemory: vi.fn().mockResolvedValue({ results: [{ content: 'TypeScript fact', category: 'general', source: 'MEMORY.md' }] }),
    getConfig: vi.fn().mockResolvedValue({
      enabled: true, autoExtract: true, flushThreshold: 0.75, extractIntervalSeconds: 60, minNewMessages: 4,
      llmGatingEnabled: false, llmGatingModel: 'gpt-4o-mini',
      llmExtractionEnabled: false, llmExtractionModel: 'gpt-4o-mini', llmExtractionMaxMessages: 20,
      llmCompactionEnabled: false, llmCompactionModel: 'gpt-4o-mini', llmCompactionFactThreshold: 30,
    }),
    putConfig: vi.fn().mockResolvedValue({ ok: true }),
    getStats: vi.fn().mockResolvedValue({ totalFacts: 5, dailyLogCount: 2 }),
    compactMemory: vi.fn().mockResolvedValue({ beforeCount: 10, afterCount: 5 }),
  },
}));

import { configApi, memoryApi as autoMemoryApi } from '../../../src/lib/api';
import { SettingsPanel } from '../../../src/components/settings/SettingsPanel';

describe('SettingsPanel', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onLanguageToggle: vi.fn(),
    language: 'en',
    onLogout: vi.fn(),
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

    it('should render all category tabs using i18n keys (no presets)', () => {
      render(<SettingsPanel {...defaultProps} />);
      // Tab names should come from t('settings.tabs.*') — en.json values
      expect(screen.getByRole('tab', { name: /general/i })).toBeTruthy();
      expect(screen.getByRole('tab', { name: /system prompt/i })).toBeTruthy();
      expect(screen.getByRole('tab', { name: /profile/i })).toBeTruthy();
      expect(screen.getByRole('tab', { name: /agent/i })).toBeTruthy();
      expect(screen.queryByRole('tab', { name: /presets/i })).toBeNull();
      expect(screen.getByRole('tab', { name: /memory/i })).toBeTruthy();
      expect(screen.getByRole('tab', { name: /skills/i })).toBeTruthy();
      expect(screen.getByRole('tab', { name: /api keys/i })).toBeTruthy();
      expect(screen.getByRole('tab', { name: /cron jobs/i })).toBeTruthy();
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

    it('should call onClose when back button is clicked', () => {
      const onClose = vi.fn();
      render(<SettingsPanel {...defaultProps} onClose={onClose} />);
      fireEvent.click(screen.getByTestId('settings-back-button'));
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('should call onClose when Escape key is pressed', () => {
      const onClose = vi.fn();
      render(<SettingsPanel {...defaultProps} onClose={onClose} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('should render full-page overlay with fixed positioning', () => {
      render(<SettingsPanel {...defaultProps} />);
      const panel = screen.getByTestId('settings-panel');
      expect(panel.className).toContain('fixed');
      expect(panel.className).toContain('inset-0');
    });

    it('should render left sidebar navigation', () => {
      render(<SettingsPanel {...defaultProps} />);
      expect(screen.getByTestId('settings-sidebar')).toBeTruthy();
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

  // === General Tab ===
  describe('General tab', () => {
    it('should render language toggle button showing current language', () => {
      render(<SettingsPanel {...defaultProps} language="en" />);
      fireEvent.click(screen.getByRole('tab', { name: /general/i }));
      expect(screen.getByTestId('language-toggle')).toBeTruthy();
      expect(screen.getByTestId('language-toggle').textContent).toContain('English');
    });

    it('should call onLanguageToggle when language button is clicked', () => {
      const onLanguageToggle = vi.fn();
      render(<SettingsPanel {...defaultProps} onLanguageToggle={onLanguageToggle} />);
      fireEvent.click(screen.getByRole('tab', { name: /general/i }));
      fireEvent.click(screen.getByTestId('language-toggle'));
      expect(onLanguageToggle).toHaveBeenCalledOnce();
    });

    it('should render logout button', () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /general/i }));
      expect(screen.getByTestId('logout-button')).toBeTruthy();
    });

    it('should call onLogout when logout button is clicked', () => {
      const onLogout = vi.fn();
      render(<SettingsPanel {...defaultProps} onLogout={onLogout} />);
      fireEvent.click(screen.getByRole('tab', { name: /general/i }));
      fireEvent.click(screen.getByTestId('logout-button'));
      expect(onLogout).toHaveBeenCalledOnce();
    });

    it('should display zh-TW label when language is zh-TW', () => {
      render(<SettingsPanel {...defaultProps} language="zh-TW" />);
      fireEvent.click(screen.getByRole('tab', { name: /general/i }));
      expect(screen.getByTestId('language-toggle').textContent).toContain('繁體中文');
    });
  });

  // === SDK Analyze Changes ===
  describe('SDK Analyze Changes', () => {
    it('should show "Analyze Changes" button when SDK update is available', async () => {
      const { apiGet } = await import('../../../src/lib/api');
      (apiGet as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        currentVersion: '0.1.0',
        latestVersion: '0.2.0',
        updateAvailable: true,
      });

      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /general/i }));

      await waitFor(() => {
        expect(screen.getByTestId('analyze-changes-button')).toBeTruthy();
      });

      expect(screen.getByTestId('analyze-changes-button').textContent).toBe('Analyze Changes');
    });

    it('should NOT show "Analyze Changes" button when no update is available', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /general/i }));

      await waitFor(() => {
        expect(screen.getByTestId('sdk-version')).toBeTruthy();
      });

      expect(screen.queryByTestId('analyze-changes-button')).toBeNull();
    });

    it('should dispatch settings:analyzeChanges event and close settings on click', async () => {
      const { apiGet } = await import('../../../src/lib/api');
      (apiGet as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          currentVersion: '0.1.0',
          latestVersion: '0.2.0',
          updateAvailable: true,
        })
        .mockResolvedValueOnce({ changelog: '## v0.2.0\nNew features' });

      const eventSpy = vi.fn();
      document.addEventListener('settings:analyzeChanges', eventSpy);

      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /general/i }));

      await waitFor(() => {
        expect(screen.getByTestId('analyze-changes-button')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('analyze-changes-button'));

      await waitFor(() => {
        expect(eventSpy).toHaveBeenCalled();
      });

      const detail = (eventSpy.mock.calls[0][0] as CustomEvent).detail;
      expect(detail.message).toContain('v0.1.0');
      expect(detail.message).toContain('v0.2.0');

      document.removeEventListener('settings:analyzeChanges', eventSpy);
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

  // === ToggleSwitch integration (Skills) ===
  describe('ToggleSwitch integration', () => {
    it('should render green toggle for enabled skill', async () => {
      useAppStore.setState({ disabledSkills: [] });
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /skills/i }));
      await waitFor(() => {
        const toggle = screen.getByTestId('skill-toggle-code-review');
        expect(toggle.className).toContain('bg-accent');
      });
    });

    it('should render neutral toggle for disabled skill', async () => {
      useAppStore.setState({ disabledSkills: ['code-review'] });
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /skills/i }));
      await waitFor(() => {
        const toggle = screen.getByTestId('skill-toggle-code-review');
        expect(toggle.className).toContain('bg-bg-tertiary');
      });
    });
  });

  // === API Keys Tab (integration) ===
  describe('API Keys tab', () => {
    it('should render API key input when API Keys tab is clicked', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /api keys/i }));
      await waitFor(() => {
        expect(screen.getByTestId('brave-api-key-input')).toBeTruthy();
      });
    });
  });

  describe('LLM Memory Intelligence (Memory tab)', () => {
    it('should show LLM quality gate toggle in Memory tab', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));
      await waitFor(() => {
        expect(screen.getByTestId('llm-gating-toggle')).toBeTruthy();
      });
    });

    it('should show LLM extraction toggle in Memory tab', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));
      await waitFor(() => {
        expect(screen.getByTestId('llm-extraction-toggle')).toBeTruthy();
      });
    });

    it('should show LLM compaction toggle in Memory tab', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));
      await waitFor(() => {
        expect(screen.getByTestId('llm-compaction-toggle')).toBeTruthy();
      });
    });

    it('should show compact button in Memory tab', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));
      await waitFor(() => {
        expect(screen.getByTestId('compact-memory-button')).toBeTruthy();
      });
    });

    it('should toggle LLM gating and update config', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));
      await waitFor(() => {
        expect(screen.getByTestId('llm-gating-toggle')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('llm-gating-toggle'));

      await waitFor(() => {
        expect(autoMemoryApi.putConfig).toHaveBeenCalledWith(
          expect.objectContaining({ llmGatingEnabled: true }),
        );
      });
    });
  });

  describe('LLM Memory UI Enhancement (Memory tab)', () => {
    it('should show description text under each LLM toggle', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));
      await waitFor(() => {
        expect(screen.getByTestId('llm-gating-desc')).toBeTruthy();
        expect(screen.getByTestId('llm-extraction-desc')).toBeTruthy();
        expect(screen.getByTestId('llm-compaction-desc')).toBeTruthy();
      });
    });

    it('should show model selector when LLM gating is enabled', async () => {
      (autoMemoryApi.getConfig as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        enabled: true, autoExtract: true, flushThreshold: 0.75, extractIntervalSeconds: 60, minNewMessages: 4,
        llmGatingEnabled: true, llmGatingModel: 'gpt-4o-mini',
        llmExtractionEnabled: false, llmExtractionModel: 'gpt-4o-mini', llmExtractionMaxMessages: 20,
        llmCompactionEnabled: false, llmCompactionModel: 'gpt-4o-mini', llmCompactionFactThreshold: 30,
      });
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));
      await waitFor(() => {
        expect(screen.getByTestId('llm-gating-model')).toBeTruthy();
      });
    });

    it('should NOT show model selector when LLM gating is disabled', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));
      await waitFor(() => {
        expect(screen.getByTestId('llm-gating-toggle')).toBeTruthy();
      });
      expect(screen.queryByTestId('llm-gating-model')).toBeNull();
    });

    it('should update config when model is changed', async () => {
      // Set up store with models
      const { useAppStore } = await import('../../../src/store/index');
      useAppStore.setState({ models: [{ id: 'gpt-4o-mini', name: 'GPT-4o Mini' }, { id: 'gpt-4o', name: 'GPT-4o' }] });

      (autoMemoryApi.getConfig as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        enabled: true, autoExtract: true, flushThreshold: 0.75, extractIntervalSeconds: 60, minNewMessages: 4,
        llmGatingEnabled: true, llmGatingModel: 'gpt-4o-mini',
        llmExtractionEnabled: false, llmExtractionModel: 'gpt-4o-mini', llmExtractionMaxMessages: 20,
        llmCompactionEnabled: false, llmCompactionModel: 'gpt-4o-mini', llmCompactionFactThreshold: 30,
      });
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));
      await waitFor(() => {
        expect(screen.getByTestId('llm-gating-model')).toBeTruthy();
      });

      fireEvent.change(screen.getByTestId('llm-gating-model'), { target: { value: 'gpt-4o' } });

      await waitFor(() => {
        expect(autoMemoryApi.putConfig).toHaveBeenCalledWith(
          expect.objectContaining({ llmGatingModel: 'gpt-4o' }),
        );
      });
    });

    it('should show model selectors for all enabled LLM features', async () => {
      (autoMemoryApi.getConfig as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        enabled: true, autoExtract: true, flushThreshold: 0.75, extractIntervalSeconds: 60, minNewMessages: 4,
        llmGatingEnabled: true, llmGatingModel: 'gpt-4o-mini',
        llmExtractionEnabled: true, llmExtractionModel: 'gpt-4o-mini', llmExtractionMaxMessages: 20,
        llmCompactionEnabled: true, llmCompactionModel: 'gpt-4o-mini', llmCompactionFactThreshold: 30,
      });
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));
      await waitFor(() => {
        expect(screen.getByTestId('llm-gating-model')).toBeTruthy();
        expect(screen.getByTestId('llm-extraction-model')).toBeTruthy();
        expect(screen.getByTestId('llm-compaction-model')).toBeTruthy();
      });
    });
  });

  describe('Auto Memory (Memory tab)', () => {
    it('should show auto-memory section in Memory tab', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));
      await waitFor(() => {
        expect(screen.getByTestId('auto-memory-section')).toBeTruthy();
      });
    });

    it('should display MEMORY.md content in editor', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));
      await waitFor(() => {
        expect(screen.getByTestId('auto-memory-editor')).toBeTruthy();
        expect((screen.getByTestId('auto-memory-editor') as HTMLTextAreaElement).value).toBe('- User prefers TypeScript');
      });
    });

    it('should save MEMORY.md on save button click', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));
      await waitFor(() => {
        expect(screen.getByTestId('auto-memory-editor')).toBeTruthy();
      });
      fireEvent.change(screen.getByTestId('auto-memory-editor'), {
        target: { value: '- Updated memory content' },
      });
      fireEvent.click(screen.getByTestId('save-auto-memory'));
      await waitFor(() => {
        expect(autoMemoryApi.putMain).toHaveBeenCalledWith('- Updated memory content');
      });
    });

    it('should show auto-extract toggle', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));
      await waitFor(() => {
        expect(screen.getByTestId('auto-extract-toggle')).toBeTruthy();
      });
    });

    it('should show memory stats', async () => {
      render(<SettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));
      await waitFor(() => {
        expect(screen.getByTestId('memory-stats')).toBeTruthy();
        expect(screen.getByTestId('memory-stats').textContent).toContain('5');
      });
    });
  });
});
