import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useAppStore } from '../../../src/store/index';

// Mock Markdown component
vi.mock('../../../src/components/shared/Markdown', () => ({
  Markdown: ({ content }: { content: string }) => <div data-testid="markdown-render">{content}</div>,
}));

// Mock prompts-api — factories create bare vi.fn(); defaults set in beforeEach
vi.mock('../../../src/lib/prompts-api', () => ({
  promptsApi: {
    getProfile: vi.fn(),
    putProfile: vi.fn(),
    getAgent: vi.fn(),
    putAgent: vi.fn(),
    getOpenspecSdd: vi.fn(),
    putOpenspecSdd: vi.fn(),
    getSystemPrompt: vi.fn(),
    putSystemPrompt: vi.fn(),
    resetSystemPrompt: vi.fn(),
    getAutopilotPrompt: vi.fn(),
    putAutopilotPrompt: vi.fn(),
    resetAutopilotPrompt: vi.fn(),
    getActPrompt: vi.fn(),
    putActPrompt: vi.fn(),
    resetActPrompt: vi.fn(),
    getPlanPrompt: vi.fn(),
    putPlanPrompt: vi.fn(),
    resetPlanPrompt: vi.fn(),
  },
  memoryApi: {
    getPreferences: vi.fn(),
    putPreferences: vi.fn(),
  },
  skillsApi: {
    list: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock configApi and memoryApi
vi.mock('../../../src/lib/api', () => ({
  apiGet: vi.fn(),
  configApi: {
    get: vi.fn(),
    getBraveApiKey: vi.fn(),
    putBraveApiKey: vi.fn(),
    getOpenspecSdd: vi.fn(),
    putOpenspecSdd: vi.fn(),
  },
  memoryApi: {
    getMain: vi.fn(),
    putMain: vi.fn(),
    listDailyLogs: vi.fn(),
    searchMemory: vi.fn(),
    getConfig: vi.fn(),
    putConfig: vi.fn(),
    getStats: vi.fn(),
    compactMemory: vi.fn(),
  },
}));

// Mock settingsApi to prevent it from consuming apiGet mocks internally
vi.mock('../../../src/lib/settings-api', () => ({
  settingsApi: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockUseModelsQuery = vi.fn().mockReturnValue({ data: [], isLoading: false, error: null });
vi.mock('../../../src/hooks/queries/useModelsQuery', () => ({
  useModelsQuery: (...args: unknown[]) => mockUseModelsQuery(...args),
}));

import { createWrapper } from '../../../src/test-utils/query-wrapper';
import { apiGet, configApi, memoryApi as autoMemoryApi } from '../../../src/lib/api';
import { promptsApi, skillsApi } from '../../../src/lib/prompts-api';
import { settingsApi } from '../../../src/lib/settings-api';
import { SettingsPanel } from '../../../src/components/settings/SettingsPanel';

/** Re-establish all mock default implementations (called in beforeEach after clearAllMocks) */
function setupMockDefaults() {
  // prompts-api
  (promptsApi.getProfile as ReturnType<typeof vi.fn>).mockResolvedValue({ content: '# Profile content' });
  (promptsApi.putProfile as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
  (promptsApi.getAgent as ReturnType<typeof vi.fn>).mockResolvedValue({ content: '# Agent content' });
  (promptsApi.putAgent as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
  (promptsApi.getOpenspecSdd as ReturnType<typeof vi.fn>).mockResolvedValue({ content: '# OpenSpec SDD content' });
  (promptsApi.putOpenspecSdd as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
  (promptsApi.getSystemPrompt as ReturnType<typeof vi.fn>).mockResolvedValue({ content: '# System Prompt' });
  (promptsApi.putSystemPrompt as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
  (promptsApi.resetSystemPrompt as ReturnType<typeof vi.fn>).mockResolvedValue({ content: '# Default System Prompt' });
  (promptsApi.getAutopilotPrompt as ReturnType<typeof vi.fn>).mockResolvedValue({ content: '# Autopilot Prompt' });
  (promptsApi.putAutopilotPrompt as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
  (promptsApi.resetAutopilotPrompt as ReturnType<typeof vi.fn>).mockResolvedValue({ content: '# Default Autopilot Prompt' });
  (promptsApi.getPlanPrompt as ReturnType<typeof vi.fn>).mockResolvedValue({ content: '# Plan Prompt' });
  (promptsApi.putPlanPrompt as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
  (promptsApi.resetPlanPrompt as ReturnType<typeof vi.fn>).mockResolvedValue({ content: '# Default Plan Prompt' });

  // skillsApi
  (skillsApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
    skills: [
      { name: 'tdd-workflow', description: 'Test-driven development', content: '# TDD Workflow', builtin: true },
      { name: 'code-review', description: 'Review code for quality', content: '# Code Review Skill', builtin: false },
      { name: 'debugging', description: 'Help debug issues', content: '# Debugging Skill', builtin: false },
    ],
  });
  (skillsApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({ name: 'code-review', description: 'Review code for quality', content: '# Code Review Skill', builtin: false });
  (skillsApi.put as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
  (skillsApi.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

  // configApi + memoryApi (from lib/api)
  (apiGet as ReturnType<typeof vi.fn>).mockResolvedValue({ currentVersion: '0.1.0' });

  (configApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({ defaultCwd: '/home' });
  (configApi.getBraveApiKey as ReturnType<typeof vi.fn>).mockResolvedValue({ hasKey: false, maskedKey: '' });
  (configApi.putBraveApiKey as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
  (configApi.getOpenspecSdd as ReturnType<typeof vi.fn>).mockResolvedValue({ enabled: false });
  (configApi.putOpenspecSdd as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

  (autoMemoryApi.getMain as ReturnType<typeof vi.fn>).mockResolvedValue({ content: '- User prefers TypeScript' });
  (autoMemoryApi.putMain as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
  (autoMemoryApi.listDailyLogs as ReturnType<typeof vi.fn>).mockResolvedValue({ dates: ['2026-02-17'] });
  (autoMemoryApi.searchMemory as ReturnType<typeof vi.fn>).mockResolvedValue({ results: [{ content: 'TypeScript fact', category: 'general', source: 'MEMORY.md' }] });
  (autoMemoryApi.getConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
    enabled: true, autoExtract: true, flushThreshold: 0.75, extractIntervalSeconds: 60, minNewMessages: 4,
    llmGatingEnabled: false, llmGatingModel: 'gpt-4o-mini',
    llmExtractionEnabled: false, llmExtractionModel: 'gpt-4o-mini', llmExtractionMaxMessages: 20,
    llmCompactionEnabled: false, llmCompactionModel: 'gpt-4o-mini', llmCompactionFactThreshold: 30,
  });
  (autoMemoryApi.putConfig as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
  (autoMemoryApi.getStats as ReturnType<typeof vi.fn>).mockResolvedValue({ totalFacts: 5, dailyLogCount: 2 });
  (autoMemoryApi.compactMemory as ReturnType<typeof vi.fn>).mockResolvedValue({ beforeCount: 10, afterCount: 5 });

  // settingsApi
  (settingsApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({});
  (settingsApi.patch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
}

const QueryWrapper = createWrapper();

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
    setupMockDefaults();
    mockUseModelsQuery.mockReturnValue({ data: [], isLoading: false, error: null });
  });

  // === Structure ===
  describe('structure', () => {
    it('should render when open is true', () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      expect(screen.getByTestId('settings-panel')).toBeTruthy();
    });

    it('should not render when open is false', () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} open={false} /></QueryWrapper>);
      expect(screen.queryByTestId('settings-panel')).toBeNull();
    });

    it('should render all category tabs using i18n keys (no presets)', () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      // Tab names should come from t('settings.tabs.*') — en.json values
      expect(screen.getByRole('tab', { name: /general/i })).toBeTruthy();
      expect(screen.getByRole('tab', { name: /system prompt/i })).toBeTruthy();
      expect(screen.getByRole('tab', { name: /profile/i })).toBeTruthy();
      expect(screen.getByRole('tab', { name: /openspec/i })).toBeTruthy();
      expect(screen.queryByRole('tab', { name: /presets/i })).toBeNull();
      expect(screen.getByRole('tab', { name: /memory/i })).toBeTruthy();
      expect(screen.getByRole('tab', { name: /skills/i })).toBeTruthy();
      expect(screen.getByRole('tab', { name: /websearch/i })).toBeTruthy();
      expect(screen.getByRole('tab', { name: /mcp/i })).toBeTruthy();
    });

    it('should default to System Prompt tab', () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      const systemPromptTab = screen.getByRole('tab', { name: /system prompt/i });
      expect(systemPromptTab.getAttribute('aria-selected')).toBe('true');
    });

    it('should render panel title using i18n key', () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      // Title should be t('settings.title') = "Settings"
      expect(screen.getByText('Settings')).toBeTruthy();
    });

    it('should call onClose when back button is clicked', () => {
      const onClose = vi.fn();
      render(<QueryWrapper><SettingsPanel {...defaultProps} onClose={onClose} /></QueryWrapper>);
      fireEvent.click(screen.getByTestId('settings-back-button'));
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('should call onClose when Escape key is pressed', () => {
      const onClose = vi.fn();
      render(<QueryWrapper><SettingsPanel {...defaultProps} onClose={onClose} /></QueryWrapper>);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('should render full-page overlay with fixed positioning', () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      const panel = screen.getByTestId('settings-panel');
      expect(panel.className).toContain('fixed');
      expect(panel.className).toContain('inset-0');
    });

    it('should render left sidebar navigation', () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      expect(screen.getByTestId('settings-sidebar')).toBeTruthy();
    });
  });

  // === i18n ===
  describe('i18n', () => {
    it('should use translated text for Save buttons (not hardcoded)', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      // Click Profile tab to see Save button
      fireEvent.click(screen.getByRole('tab', { name: /profile/i }));
      await waitFor(() => {
        // Save button should show t('settings.save') = "Save"
        expect(screen.getByTestId('save-profile')).toBeTruthy();
        expect(screen.getByTestId('save-profile').textContent).toBe('Save');
      });
    });

    it('should show translated toast on save success', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
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

      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
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
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      // During initial load, t('settings.loading') = "Loading..."
      fireEvent.click(screen.getByRole('tab', { name: /profile/i }));
      expect(screen.getByText('Loading...')).toBeTruthy();
    });

    it('should show translated Memory section with Auto Memory', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));

      await waitFor(() => {
        // Only auto-memory and LLM intelligence remain
        expect(screen.getByTestId('auto-memory-section')).toBeTruthy();
        expect(screen.getByTestId('llm-gating-toggle')).toBeTruthy();
      });
    });
  });

  // === General Tab ===
  describe('General tab', () => {
    it('should render language toggle button showing current language', () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} language="en" /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /general/i }));
      expect(screen.getByTestId('language-toggle')).toBeTruthy();
      expect(screen.getByTestId('language-toggle').textContent).toContain('English');
    });

    it('should call onLanguageToggle when language button is clicked', () => {
      const onLanguageToggle = vi.fn();
      render(<QueryWrapper><SettingsPanel {...defaultProps} onLanguageToggle={onLanguageToggle} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /general/i }));
      fireEvent.click(screen.getByTestId('language-toggle'));
      expect(onLanguageToggle).toHaveBeenCalledOnce();
    });

    it('should render logout button', () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /general/i }));
      expect(screen.getByTestId('logout-button')).toBeTruthy();
    });

    it('should call onLogout when logout button is clicked', () => {
      const onLogout = vi.fn();
      render(<QueryWrapper><SettingsPanel {...defaultProps} onLogout={onLogout} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /general/i }));
      fireEvent.click(screen.getByTestId('logout-button'));
      expect(onLogout).toHaveBeenCalledOnce();
    });

    it('should display zh-TW label when language is zh-TW', () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} language="zh-TW" /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /general/i }));
      expect(screen.getByTestId('language-toggle').textContent).toContain('繁體中文');
    });
  });


  // === SDK Version display (General tab) ===
  describe('SDK version display (General tab)', () => {
    it('should display SDK version when available', async () => {
      (apiGet as ReturnType<typeof vi.fn>).mockResolvedValue({ currentVersion: '1.2.3' });
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /general/i }));
      await waitFor(() => {
        expect(screen.getByTestId('sdk-version').textContent).toBe('v1.2.3');
      });
    });

    it('should display fallback text when version is null', async () => {
      (apiGet as ReturnType<typeof vi.fn>).mockResolvedValue({ currentVersion: null });
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /general/i }));
      await waitFor(() => {
        expect(screen.getByTestId('sdk-version').textContent).toBe('Unknown');
      });
    });

    it('should not crash when API call fails', async () => {
      (apiGet as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /general/i }));
      // Should show fallback, not crash
      await waitFor(() => {
        expect(screen.getByTestId('sdk-version')).toBeTruthy();
      });
    });
  });

  // === System Prompt Tab ===
  describe('System Prompt tab', () => {
    it('should load and display system prompt content', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      // System Prompt is the default tab
      await waitFor(() => {
        expect(screen.getByDisplayValue('# System Prompt')).toBeTruthy();
      });
    });

    it('should save system prompt content on save button click', async () => {
      const { promptsApi } = await import('../../../src/lib/prompts-api');
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);

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
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);

      await waitFor(() => {
        expect(screen.getByDisplayValue('# System Prompt')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('save-system-prompt'));

      await waitFor(() => {
        expect(screen.getByText('Saved')).toBeTruthy();
      });
    });

    it('should render Reset to Default button', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);

      await waitFor(() => {
        expect(screen.getByTestId('reset-system-prompt')).toBeTruthy();
      });

      expect(screen.getByTestId('reset-system-prompt').textContent).toBe('Reset to Default');
    });

    it('should open ConfirmDialog when reset is clicked and execute reset on confirm', async () => {
      const { promptsApi } = await import('../../../src/lib/prompts-api');
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);

      await waitFor(() => {
        expect(screen.getByTestId('reset-system-prompt')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('reset-system-prompt'));

      // ConfirmDialog should be visible with Confirm button
      const confirmBtn = screen.getByText(/Confirm|確認/i);
      expect(confirmBtn).toBeTruthy();

      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(promptsApi.resetSystemPrompt).toHaveBeenCalled();
      });
    });

    it('should NOT reset system prompt when ConfirmDialog is cancelled', async () => {
      const { promptsApi } = await import('../../../src/lib/prompts-api');
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);

      await waitFor(() => {
        expect(screen.getByTestId('reset-system-prompt')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('reset-system-prompt'));

      const cancelBtn = screen.getByText(/Cancel|取消/i);
      fireEvent.click(cancelBtn);

      expect(promptsApi.resetSystemPrompt).not.toHaveBeenCalled();
    });

    it('should NOT use window.confirm for system prompt reset', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm');
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);

      await waitFor(() => {
        expect(screen.getByTestId('reset-system-prompt')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('reset-system-prompt'));
      expect(confirmSpy).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    });

    // --- Autopilot Mode Prompt section ---
    it('should display Autopilot Mode Prompt section with heading and textarea', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      await waitFor(() => {
        expect(screen.getByTestId('autopilot-mode-heading')).toBeTruthy();
        expect(screen.getByTestId('autopilot-prompt-textarea')).toBeTruthy();
      });
      expect(screen.getByTestId('autopilot-mode-heading').textContent).toBe('Autopilot Mode Prompt');
    });

    it('should load autopilot prompt content', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      await waitFor(() => {
        expect(screen.getByDisplayValue('# Autopilot Prompt')).toBeTruthy();
      });
    });

    it('should save autopilot prompt on save button click', async () => {
      const { promptsApi } = await import('../../../src/lib/prompts-api');
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);

      await waitFor(() => {
        expect(screen.getByDisplayValue('# Autopilot Prompt')).toBeTruthy();
      });

      const textarea = screen.getByDisplayValue('# Autopilot Prompt');
      fireEvent.change(textarea, { target: { value: 'Updated autopilot prompt' } });

      fireEvent.click(screen.getByTestId('save-autopilot-prompt'));

      await waitFor(() => {
        expect(promptsApi.putAutopilotPrompt).toHaveBeenCalledWith('Updated autopilot prompt');
      });
    });

    it('should reset autopilot prompt when confirmed', async () => {
      const { promptsApi } = await import('../../../src/lib/prompts-api');
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);

      await waitFor(() => {
        expect(screen.getByTestId('reset-autopilot-prompt')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('reset-autopilot-prompt'));

      // ConfirmDialog should appear
      const confirmBtn = screen.getAllByText(/Confirm|確認/i);
      fireEvent.click(confirmBtn[confirmBtn.length - 1]);

      await waitFor(() => {
        expect(promptsApi.resetAutopilotPrompt).toHaveBeenCalled();
      });
    });

    // --- Plan Mode Prompt section ---
    it('should display Plan Mode Prompt section with heading and textarea', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      await waitFor(() => {
        expect(screen.getByTestId('plan-mode-heading')).toBeTruthy();
        expect(screen.getByTestId('plan-prompt-textarea')).toBeTruthy();
      });
      expect(screen.getByTestId('plan-mode-heading').textContent).toBe('Plan Mode Prompt');
    });

    it('should load plan prompt content', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      await waitFor(() => {
        expect(screen.getByDisplayValue('# Plan Prompt')).toBeTruthy();
      });
    });

    it('should save plan prompt on save button click', async () => {
      const { promptsApi } = await import('../../../src/lib/prompts-api');
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);

      await waitFor(() => {
        expect(screen.getByDisplayValue('# Plan Prompt')).toBeTruthy();
      });

      const textarea = screen.getByDisplayValue('# Plan Prompt');
      fireEvent.change(textarea, { target: { value: 'Updated plan prompt' } });

      fireEvent.click(screen.getByTestId('save-plan-prompt'));

      await waitFor(() => {
        expect(promptsApi.putPlanPrompt).toHaveBeenCalledWith('Updated plan prompt');
      });
    });

    it('should reset plan prompt when confirmed', async () => {
      const { promptsApi } = await import('../../../src/lib/prompts-api');
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);

      await waitFor(() => {
        expect(screen.getByTestId('reset-plan-prompt')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('reset-plan-prompt'));

      // ConfirmDialog should appear
      const confirmBtn = screen.getAllByText(/Confirm|確認/i);
      fireEvent.click(confirmBtn[confirmBtn.length - 1]);

      await waitFor(() => {
        expect(promptsApi.resetPlanPrompt).toHaveBeenCalled();
      });
    });
  });

  // === Profile Tab ===
  describe('Profile tab', () => {
    it('should load and display profile content', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /profile/i }));
      await waitFor(() => {
        expect(screen.getByDisplayValue('# Profile content')).toBeTruthy();
      });
    });

    it('should save profile content on save button click', async () => {
      const { promptsApi } = await import('../../../src/lib/prompts-api');
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
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

  // === OpenSpec Tab ===
  describe('OpenSpec tab', () => {
    it('should render OpenSpec SDD toggle when tab is clicked', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /openspec/i }));

      await waitFor(() => {
        expect(screen.getByTestId('openspec-sdd-toggle')).toBeTruthy();
      });
    });

    it('should show OpenSpec SDD toggle as OFF by default', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /openspec/i }));

      await waitFor(() => {
        const toggle = screen.getByTestId('openspec-sdd-toggle');
        expect(toggle.getAttribute('aria-checked')).toBe('false');
      });
    });

    it('should call configApi.putOpenspecSdd when toggle is clicked', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /openspec/i }));

      await waitFor(() => {
        expect(screen.getByTestId('openspec-sdd-toggle')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('openspec-sdd-toggle'));

      await waitFor(() => {
        expect(configApi.putOpenspecSdd).toHaveBeenCalledWith(true);
      });
    });

    it('should show OpenSpec SDD textarea when toggle is enabled', async () => {
      (configApi.getOpenspecSdd as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ enabled: true });

      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /openspec/i }));

      await waitFor(() => {
        expect(screen.getByTestId('openspec-sdd-textarea')).toBeTruthy();
      });
    });

    it('should NOT show OpenSpec SDD textarea when toggle is disabled', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /openspec/i }));

      await waitFor(() => {
        expect(screen.getByTestId('openspec-sdd-toggle')).toBeTruthy();
      });

      expect(screen.queryByTestId('openspec-sdd-textarea')).toBeNull();
    });

    it('should call batchSetSkillsDisabled(names, false) when toggle is turned ON', async () => {
      const { skillsApi } = await import('../../../src/lib/prompts-api');
      (skillsApi.list as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        skills: [
          { name: 'openspec-explore', description: '', content: '', builtin: true },
          { name: 'openspec-workflow', description: '', content: '', builtin: true },
          { name: 'other-skill', description: '', content: '', builtin: false },
        ],
      });
      // Start disabled
      (configApi.getOpenspecSdd as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ enabled: false });

      const batchSpy = vi.spyOn(useAppStore.getState(), 'batchSetSkillsDisabled');

      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /openspec/i }));

      await waitFor(() => {
        expect(screen.getByTestId('openspec-sdd-toggle')).toBeTruthy();
      });

      // Initial sync should disable openspec skills
      expect(batchSpy).toHaveBeenCalledWith(
        expect.arrayContaining(['openspec-explore', 'openspec-workflow']),
        true,
      );

      // Now toggle ON
      fireEvent.click(screen.getByTestId('openspec-sdd-toggle'));

      await waitFor(() => {
        expect(configApi.putOpenspecSdd).toHaveBeenCalledWith(true);
      });

      // Should enable openspec skills
      expect(batchSpy).toHaveBeenCalledWith(
        expect.arrayContaining(['openspec-explore', 'openspec-workflow']),
        false,
      );

      batchSpy.mockRestore();
    });

    it('should call batchSetSkillsDisabled(names, true) when toggle is turned OFF', async () => {
      const { skillsApi } = await import('../../../src/lib/prompts-api');
      (skillsApi.list as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        skills: [
          { name: 'openspec-explore', description: '', content: '', builtin: true },
          { name: 'other-skill', description: '', content: '', builtin: false },
        ],
      });
      // Start enabled
      (configApi.getOpenspecSdd as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ enabled: true });

      const batchSpy = vi.spyOn(useAppStore.getState(), 'batchSetSkillsDisabled');

      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /openspec/i }));

      await waitFor(() => {
        expect(screen.getByTestId('openspec-sdd-toggle')).toBeTruthy();
      });

      // Now toggle OFF
      fireEvent.click(screen.getByTestId('openspec-sdd-toggle'));

      await waitFor(() => {
        expect(configApi.putOpenspecSdd).toHaveBeenCalledWith(false);
      });

      // Should disable openspec skills
      expect(batchSpy).toHaveBeenCalledWith(
        expect.arrayContaining(['openspec-explore']),
        true,
      );

      batchSpy.mockRestore();
    });

    it('should sync global store settings.openspecEnabled when toggle is clicked', async () => {
      (configApi.getOpenspecSdd as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ enabled: false });

      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /openspec/i }));

      await waitFor(() => {
        expect(screen.getByTestId('openspec-sdd-toggle')).toBeTruthy();
      });

      // Toggle ON
      fireEvent.click(screen.getByTestId('openspec-sdd-toggle'));

      await waitFor(() => {
        expect(configApi.putOpenspecSdd).toHaveBeenCalledWith(true);
      });

      // Global store should be updated
      expect(useAppStore.getState().openspecEnabled).toBe(true);
    });

    it('should save OpenSpec SDD content when save button is clicked', async () => {
      const { promptsApi } = await import('../../../src/lib/prompts-api');
      (configApi.getOpenspecSdd as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ enabled: true });

      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /openspec/i }));

      await waitFor(() => {
        expect(screen.getByTestId('openspec-sdd-textarea')).toBeTruthy();
      });

      fireEvent.change(screen.getByTestId('openspec-sdd-textarea'), {
        target: { value: 'Updated OpenSpec content' },
      });

      fireEvent.click(screen.getByTestId('save-openspec-sdd'));

      await waitFor(() => {
        expect(promptsApi.putOpenspecSdd).toHaveBeenCalledWith('Updated OpenSpec content');
      });
    });
  });

  // === Skills Tab ===
  describe('Skills tab', () => {
    beforeEach(() => {
      useAppStore.setState({ disabledSkills: ['debugging'] });
    });

    it('should list skills with names and descriptions', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
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
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /skills/i }));
      await waitFor(() => {
        const toggle = screen.getByTestId('skill-toggle-code-review');
        expect(toggle.getAttribute('aria-checked')).toBe('true');
      });
    });

    it('should show toggle as disabled for skills in disabledSkills', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /skills/i }));
      await waitFor(() => {
        const toggle = screen.getByTestId('skill-toggle-debugging');
        expect(toggle.getAttribute('aria-checked')).toBe('false');
      });
    });


    it('should expand skill for editing with description and content', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
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
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
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
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
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


    it('should show empty state with install section when no skills exist', async () => {
      const { skillsApi } = await import('../../../src/lib/prompts-api');
      (skillsApi.list as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ skills: [] });

      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /skills/i }));
      await waitFor(() => {
        expect(screen.getByText('No skills yet. Create one to get started.')).toBeTruthy();
        expect(screen.getByTestId('skill-install-section')).toBeTruthy();
      });
    });

    // --- Builtin / User skill sections ---

    it('should show system skills section with System badge', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /skills/i }));
      await waitFor(() => {
        expect(screen.getByTestId('system-skills-section')).toBeTruthy();
        expect(screen.getByTestId('user-skills-section')).toBeTruthy();
      });
    });

    it('should NOT show edit/delete buttons for builtin skills', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
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
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
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
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /skills/i }));
      await waitFor(() => {
        const toggle = screen.getByTestId('skill-toggle-code-review');
        expect(toggle.className).toContain('bg-accent');
      });
    });

    it('should render neutral toggle for disabled skill', async () => {
      useAppStore.setState({ disabledSkills: ['code-review'] });
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
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
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /websearch/i }));
      await waitFor(() => {
        expect(screen.getByTestId('brave-api-key-input')).toBeTruthy();
      });
    });
  });

  describe('LLM Memory Intelligence (Memory tab)', () => {
    it('should show LLM quality gate toggle in Memory tab', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));
      await waitFor(() => {
        expect(screen.getByTestId('llm-gating-toggle')).toBeTruthy();
      });
    });

    it('should show LLM extraction toggle in Memory tab', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));
      await waitFor(() => {
        expect(screen.getByTestId('llm-extraction-toggle')).toBeTruthy();
      });
    });

    it('should show LLM compaction toggle in Memory tab', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));
      await waitFor(() => {
        expect(screen.getByTestId('llm-compaction-toggle')).toBeTruthy();
      });
    });

    it('should show compact button in Memory tab', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));
      await waitFor(() => {
        expect(screen.getByTestId('compact-memory-button')).toBeTruthy();
      });
    });

    it('should toggle LLM gating and update config', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
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
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
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
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));
      await waitFor(() => {
        expect(screen.getByTestId('llm-gating-model')).toBeTruthy();
      });
    });

    it('should NOT show model selector when LLM gating is disabled', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));
      await waitFor(() => {
        expect(screen.getByTestId('llm-gating-toggle')).toBeTruthy();
      });
      expect(screen.queryByTestId('llm-gating-model')).toBeNull();
    });

    it('should update config when model is changed', async () => {
      // Set up models via useModelsQuery mock
      mockUseModelsQuery.mockReturnValue({
        data: [{ id: 'gpt-4o-mini', name: 'GPT-4o Mini' }, { id: 'gpt-4o', name: 'GPT-4o' }],
        isLoading: false,
        error: null,
      });

      (autoMemoryApi.getConfig as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        enabled: true, autoExtract: true, flushThreshold: 0.75, extractIntervalSeconds: 60, minNewMessages: 4,
        llmGatingEnabled: true, llmGatingModel: 'gpt-4o-mini',
        llmExtractionEnabled: false, llmExtractionModel: 'gpt-4o-mini', llmExtractionMaxMessages: 20,
        llmCompactionEnabled: false, llmCompactionModel: 'gpt-4o-mini', llmCompactionFactThreshold: 30,
      });
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
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
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));
      await waitFor(() => {
        expect(screen.getByTestId('llm-gating-model')).toBeTruthy();
        expect(screen.getByTestId('llm-extraction-model')).toBeTruthy();
        expect(screen.getByTestId('llm-compaction-model')).toBeTruthy();
      });
    });
  });

  // === LLM Language Section ===
  describe('LLM Language Section (General tab)', () => {
    it('should render LLM language dropdown in General tab', () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /general/i }));
      expect(screen.getByText(/LLM Response Language|LLM 回應語言/i)).toBeTruthy();
    });

    it('should show custom input when "Custom..." is selected', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /general/i }));

      // Open the CustomSelect dropdown by clicking on it
      const dropdownBtn = screen.getByText(/Same as UI language|與介面語言相同/i);
      fireEvent.click(dropdownBtn);

      // Now click the "Custom..." option in the dropdown
      const customOption = screen.getByText(/Custom\.\.\.|自訂\.\.\./i);
      fireEvent.click(customOption);

      // After selecting custom, a text input should appear
      await waitFor(() => {
        const input = screen.getByPlaceholderText(/Bahasa Indonesia/i);
        expect(input).toBeTruthy();
      });
    });

    it('should update llmLanguage when typing in custom input', async () => {
      // Pre-set a custom value so input shows (customMode initializes to true)
      useAppStore.setState({ llmLanguage: 'Bahasa Indonesia' });

      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /general/i }));

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/Bahasa Indonesia/i);
        expect(input).toBeTruthy();
      });

      const input = screen.getByPlaceholderText(/Bahasa Indonesia/i);
      fireEvent.change(input, { target: { value: 'Tiếng Việt' } });

      // llmLanguage should now be 'Tiếng Việt'
      expect(useAppStore.getState().llmLanguage).toBe('Tiếng Việt');
    });

    it('should show custom input when llmLanguage is a non-predefined value', () => {
      useAppStore.setState({ llmLanguage: 'Français custom' });

      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /general/i }));

      // Custom input should be visible because 'Français custom' is not a predefined option
      const input = screen.getByPlaceholderText(/Bahasa Indonesia/i);
      expect(input).toBeTruthy();
      expect((input as HTMLInputElement).value).toBe('Français custom');
    });

    it('should hide custom input when switching from custom to predefined', async () => {
      useAppStore.setState({ llmLanguage: 'Some custom lang' });

      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /general/i }));

      // Custom input should initially be visible
      expect(screen.getByPlaceholderText(/Bahasa Indonesia/i)).toBeTruthy();

      // Open dropdown and select a predefined language
      const dropdownBtn = screen.getByText(/Custom\.\.\.|自訂\.\.\./i);
      fireEvent.click(dropdownBtn);
      // Use getAllByText and pick the one inside the dropdown options
      const englishOptions = screen.getAllByText('English');
      const dropdownOption = englishOptions.find((el) => el.closest('.absolute'));
      fireEvent.click(dropdownOption || englishOptions[englishOptions.length - 1]);

      // Custom input should disappear
      expect(screen.queryByPlaceholderText(/Bahasa Indonesia/i)).toBeNull();
      expect(useAppStore.getState().llmLanguage).toBe('en');
    });
  });

  describe('Auto Memory (Memory tab)', () => {
    it('should show auto-memory section in Memory tab', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));
      await waitFor(() => {
        expect(screen.getByTestId('auto-memory-section')).toBeTruthy();
      });
    });

    it('should display MEMORY.md content in editor', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));
      await waitFor(() => {
        expect(screen.getByTestId('auto-memory-editor')).toBeTruthy();
        expect((screen.getByTestId('auto-memory-editor') as HTMLTextAreaElement).value).toBe('- User prefers TypeScript');
      });
    });

    it('should save MEMORY.md on save button click', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
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
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));
      await waitFor(() => {
        expect(screen.getByTestId('auto-extract-toggle')).toBeTruthy();
      });
    });

    it('should show memory stats', async () => {
      render(<QueryWrapper><SettingsPanel {...defaultProps} /></QueryWrapper>);
      fireEvent.click(screen.getByRole('tab', { name: /memory/i }));
      await waitFor(() => {
        expect(screen.getByTestId('memory-stats')).toBeTruthy();
        expect(screen.getByTestId('memory-stats').textContent).toContain('5');
      });
    });
  });
});
