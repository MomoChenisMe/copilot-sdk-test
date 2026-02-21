import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { mockAutoMemoryApi } = vi.hoisted(() => {
  const _mockAutoMemoryApi = {
    getMain: vi.fn().mockResolvedValue({ content: '# Auto memory content' }),
    putMain: vi.fn().mockResolvedValue({ ok: true }),
    getConfig: vi.fn().mockResolvedValue({
      enabled: true,
      autoExtract: true,
      flushThreshold: 0.75,
      extractIntervalSeconds: 60,
      minNewMessages: 4,
    }),
    putConfig: vi.fn().mockResolvedValue({ ok: true }),
    getStats: vi.fn().mockResolvedValue({ totalFacts: 5, dailyLogCount: 2 }),
    listDailyLogs: vi.fn().mockResolvedValue({ dates: [] }),
    searchMemory: vi.fn().mockResolvedValue({ results: [] }),
    compactMemory: vi.fn().mockResolvedValue({ ok: true }),
  };
  return { mockAutoMemoryApi: _mockAutoMemoryApi };
});

vi.mock('../../../src/lib/prompts-api', () => ({
  promptsApi: {
    getSystemPrompt: vi.fn().mockResolvedValue({ content: '' }),
    putSystemPrompt: vi.fn().mockResolvedValue({ ok: true }),
    resetSystemPrompt: vi.fn().mockResolvedValue({ content: '' }),
    getProfile: vi.fn().mockResolvedValue({ content: '' }),
    putProfile: vi.fn().mockResolvedValue({ ok: true }),
    getAgent: vi.fn().mockResolvedValue({ content: '' }),
    putAgent: vi.fn().mockResolvedValue({ ok: true }),
    listPresets: vi.fn().mockResolvedValue({ presets: [] }),
    putPreset: vi.fn().mockResolvedValue({ ok: true }),
    deletePreset: vi.fn().mockResolvedValue({ ok: true }),
  },
  memoryApi: {
    getPreferences: vi.fn().mockResolvedValue({ content: '' }),
    putPreferences: vi.fn().mockResolvedValue({ ok: true }),
  },
  skillsApi: {
    list: vi.fn().mockResolvedValue({ skills: [] }),
    get: vi.fn().mockResolvedValue({ name: 'test', description: '', content: '', builtin: false }),
    put: vi.fn().mockResolvedValue({ ok: true }),
    delete: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

vi.mock('../../../src/lib/api', () => ({
  configApi: {
    get: vi.fn().mockResolvedValue({ defaultCwd: '/home' }),
    getBraveApiKey: vi.fn().mockResolvedValue({ hasKey: false, maskedKey: '' }),
    putBraveApiKey: vi.fn().mockResolvedValue({ ok: true }),
  },
  memoryApi: mockAutoMemoryApi,
}));

import { SettingsPanel } from '../../../src/components/settings/SettingsPanel';

describe('SettingsPanel - Memory Tab (simplified)', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    activePresets: [] as string[],
    onTogglePreset: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAutoMemoryApi.getMain.mockResolvedValue({ content: '# Auto memory content' });
    mockAutoMemoryApi.getConfig.mockResolvedValue({
      enabled: true,
      autoExtract: true,
      flushThreshold: 0.75,
      extractIntervalSeconds: 60,
      minNewMessages: 4,
    });
    mockAutoMemoryApi.getStats.mockResolvedValue({ totalFacts: 5, dailyLogCount: 2 });
  });

  async function openMemoryTab() {
    render(<SettingsPanel {...defaultProps} />);
    fireEvent.click(screen.getByRole('tab', { name: /memory/i }));
    await waitFor(() => {
      expect(screen.getByTestId('auto-memory-section')).toBeTruthy();
    });
  }

  it('should show Auto Memory section', async () => {
    await openMemoryTab();
    expect(screen.getByTestId('auto-memory-section')).toBeTruthy();
  });

  it('should show LLM Intelligence section', async () => {
    await openMemoryTab();
    expect(screen.getByTestId('llm-intelligence-section')).toBeTruthy();
  });

  it('should not show Preferences, Projects, or Solutions sections', async () => {
    await openMemoryTab();
    expect(screen.queryByText('Preferences')).toBeNull();
    expect(screen.queryByText('Projects')).toBeNull();
    expect(screen.queryByText('Solutions')).toBeNull();
  });

  it('should load and display auto memory editor', async () => {
    await openMemoryTab();
    await waitFor(() => {
      expect(screen.getByTestId('auto-memory-editor')).toBeTruthy();
    });
  });

  it('should show auto extract toggle', async () => {
    await openMemoryTab();
    await waitFor(() => {
      expect(screen.getByTestId('auto-extract-toggle')).toBeTruthy();
    });
  });

  it('should save auto memory on save button click', async () => {
    await openMemoryTab();
    await waitFor(() => {
      expect(screen.getByTestId('save-auto-memory')).toBeTruthy();
    });

    const textarea = screen.getByTestId('auto-memory-editor');
    fireEvent.change(textarea, { target: { value: 'Updated auto memory' } });
    fireEvent.click(screen.getByTestId('save-auto-memory'));

    await waitFor(() => {
      expect(mockAutoMemoryApi.putMain).toHaveBeenCalledWith('Updated auto memory');
    });
  });

  it('should show total facts stats', async () => {
    await openMemoryTab();
    await waitFor(() => {
      expect(screen.getByText(/5/)).toBeTruthy();
    });
  });
});
