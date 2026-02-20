import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Must use vi.hoisted so mockSkillsApi is available inside hoisted vi.mock factories
const { mockSkillsApi } = vi.hoisted(() => ({
  mockSkillsApi: {
    list: vi.fn().mockResolvedValue({
      skills: [
        { name: 'tdd-workflow', description: 'Test-driven development', content: '# TDD Workflow', builtin: true },
        { name: 'code-review', description: 'Review code for quality', content: '# Code Review Skill', builtin: false },
      ],
    }),
    get: vi.fn().mockResolvedValue({ name: 'code-review', description: 'Review', content: '# Code Review', builtin: false }),
    put: vi.fn().mockResolvedValue({ ok: true }),
    delete: vi.fn().mockResolvedValue({ ok: true }),
    upload: vi.fn().mockResolvedValue({ ok: true, name: 'uploaded-skill', description: 'Uploaded' }),
    installFromUrl: vi.fn().mockResolvedValue({ ok: true, name: 'url-skill', description: 'From URL' }),
  },
}));

// Mock Markdown component
vi.mock('../../../src/components/shared/Markdown', () => ({
  Markdown: ({ content }: { content: string }) => <div data-testid="markdown-render">{content}</div>,
}));

// Mock prompts-api
vi.mock('../../../src/lib/prompts-api', () => ({
  promptsApi: {
    getProfile: vi.fn().mockResolvedValue({ content: '' }),
    putProfile: vi.fn().mockResolvedValue({ ok: true }),
    getAgent: vi.fn().mockResolvedValue({ content: '' }),
    putAgent: vi.fn().mockResolvedValue({ ok: true }),
    listPresets: vi.fn().mockResolvedValue({ presets: [] }),
    putPreset: vi.fn().mockResolvedValue({ ok: true }),
    deletePreset: vi.fn().mockResolvedValue({ ok: true }),
    getSystemPrompt: vi.fn().mockResolvedValue({ content: '' }),
    putSystemPrompt: vi.fn().mockResolvedValue({ ok: true }),
    resetSystemPrompt: vi.fn().mockResolvedValue({ content: '' }),
  },
  memoryApi: {
    getPreferences: vi.fn().mockResolvedValue({ content: '' }),
    putPreferences: vi.fn().mockResolvedValue({ ok: true }),
    listProjects: vi.fn().mockResolvedValue({ items: [] }),
    putProject: vi.fn().mockResolvedValue({ ok: true }),
    deleteProject: vi.fn().mockResolvedValue({ ok: true }),
    listSolutions: vi.fn().mockResolvedValue({ items: [] }),
    putSolution: vi.fn().mockResolvedValue({ ok: true }),
    deleteSolution: vi.fn().mockResolvedValue({ ok: true }),
  },
  skillsApi: mockSkillsApi,
}));

// Mock configApi and memoryApi from api
vi.mock('../../../src/lib/api', () => ({
  apiGet: vi.fn().mockResolvedValue({ currentVersion: '0.1.0' }),
  configApi: {
    get: vi.fn().mockResolvedValue({ defaultCwd: '/home' }),
    getBraveApiKey: vi.fn().mockResolvedValue({ hasKey: false, maskedKey: '' }),
    putBraveApiKey: vi.fn().mockResolvedValue({ ok: true }),
  },
  memoryApi: {
    getMain: vi.fn().mockResolvedValue({ content: '' }),
    putMain: vi.fn().mockResolvedValue({ ok: true }),
    listDailyLogs: vi.fn().mockResolvedValue({ dates: [] }),
    searchMemory: vi.fn().mockResolvedValue({ results: [] }),
    getConfig: vi.fn().mockResolvedValue({
      enabled: false, autoExtract: false, flushThreshold: 0.75, extractIntervalSeconds: 60, minNewMessages: 4,
      llmGatingEnabled: false, llmGatingModel: 'gpt-4o-mini',
      llmExtractionEnabled: false, llmExtractionModel: 'gpt-4o-mini', llmExtractionMaxMessages: 20,
      llmCompactionEnabled: false, llmCompactionModel: 'gpt-4o-mini', llmCompactionFactThreshold: 30,
    }),
    putConfig: vi.fn().mockResolvedValue({ ok: true }),
    getStats: vi.fn().mockResolvedValue({ totalFacts: 0, dailyLogCount: 0 }),
    compactMemory: vi.fn().mockResolvedValue({ message: 'skipped' }),
  },
}));

import { SettingsPanel } from '../../../src/components/settings/SettingsPanel';

describe('SkillsTab — Upload/URL/AI UI', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    activePresets: [] as string[],
    onTogglePreset: vi.fn(),
    onLanguageToggle: vi.fn(),
    language: 'en',
    onLogout: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Re-setup the list mock to return skills after install
    mockSkillsApi.list.mockResolvedValue({
      skills: [
        { name: 'tdd-workflow', description: 'Test-driven development', content: '# TDD Workflow', builtin: true },
        { name: 'code-review', description: 'Review code for quality', content: '# Code Review Skill', builtin: false },
      ],
    });
  });

  async function navigateToSkillsTab() {
    render(<SettingsPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('tab', { name: /skills/i }));
    await waitFor(() => {
      expect(screen.getByTestId('skill-install-section')).toBeTruthy();
    });
  }

  describe('Upload ZIP area', () => {
    it('should render drop zone for ZIP upload', async () => {
      await navigateToSkillsTab();
      expect(screen.getByTestId('skill-upload-drop')).toBeTruthy();
      expect(screen.getByTestId('skill-upload-input')).toBeTruthy();
    });

    it('should show upload text', async () => {
      await navigateToSkillsTab();
      const dropZone = screen.getByTestId('skill-upload-drop');
      expect(dropZone.textContent).toContain('Drop ZIP file here');
    });

    it('should handle file input change', async () => {
      await navigateToSkillsTab();
      const input = screen.getByTestId('skill-upload-input') as HTMLInputElement;
      const file = new File(['test'], 'skill.zip', { type: 'application/zip' });
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockSkillsApi.upload).toHaveBeenCalledWith(file);
      });
    });
  });

  describe('URL install', () => {
    it('should render URL input and install button', async () => {
      await navigateToSkillsTab();
      expect(screen.getByTestId('skill-url-input')).toBeTruthy();
      expect(screen.getByTestId('skill-url-install')).toBeTruthy();
    });

    it('should show placeholder text', async () => {
      await navigateToSkillsTab();
      const input = screen.getByTestId('skill-url-input') as HTMLInputElement;
      expect(input.placeholder).toContain('GitHub URL');
    });

    it('should call installFromUrl when button clicked', async () => {
      await navigateToSkillsTab();
      const input = screen.getByTestId('skill-url-input');
      fireEvent.change(input, { target: { value: 'https://github.com/user/repo/tree/main/skill' } });
      fireEvent.click(screen.getByTestId('skill-url-install'));

      await waitFor(() => {
        expect(mockSkillsApi.installFromUrl).toHaveBeenCalledWith('https://github.com/user/repo/tree/main/skill');
      });
    });

    it('should disable install button when URL is empty', async () => {
      await navigateToSkillsTab();
      const btn = screen.getByTestId('skill-url-install') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });
  });

  describe('AI create button', () => {
    it('should render AI create button', async () => {
      await navigateToSkillsTab();
      expect(screen.getByTestId('skill-ai-create')).toBeTruthy();
    });

    it('should show AI create text', async () => {
      await navigateToSkillsTab();
      const btn = screen.getByTestId('skill-ai-create');
      expect(btn.textContent).toContain('Create with AI');
    });

    it('should close settings when AI create is clicked', async () => {
      const onClose = vi.fn();
      render(<SettingsPanel {...defaultProps} onClose={onClose} />);
      fireEvent.click(screen.getByRole('tab', { name: /skills/i }));

      await waitFor(() => {
        expect(screen.getByTestId('skill-ai-create')).toBeTruthy();
      });

      fireEvent.click(screen.getByTestId('skill-ai-create'));
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('should dispatch skills:ai-create event', async () => {
      const handler = vi.fn();
      window.addEventListener('skills:ai-create', handler);

      await navigateToSkillsTab();
      fireEvent.click(screen.getByTestId('skill-ai-create'));

      expect(handler).toHaveBeenCalledOnce();
      window.removeEventListener('skills:ai-create', handler);
    });
  });

  describe('install success/error toast', () => {
    it('should show success toast after upload', async () => {
      await navigateToSkillsTab();
      const input = screen.getByTestId('skill-upload-input') as HTMLInputElement;
      const file = new File(['test'], 'skill.zip', { type: 'application/zip' });
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId('skill-toast')).toBeTruthy();
        expect(screen.getByTestId('skill-toast').textContent).toContain('Skill installed successfully');
      });
    });

    it('should show error toast on upload failure', async () => {
      mockSkillsApi.upload.mockRejectedValueOnce(new Error('No SKILL.md found'));

      await navigateToSkillsTab();
      const input = screen.getByTestId('skill-upload-input') as HTMLInputElement;
      const file = new File(['test'], 'bad.zip', { type: 'application/zip' });
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByTestId('skill-toast')).toBeTruthy();
        expect(screen.getByTestId('skill-toast').textContent).toContain('No SKILL.md found');
      });
    });
  });
});
