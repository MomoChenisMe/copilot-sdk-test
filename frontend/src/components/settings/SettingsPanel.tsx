import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Globe, LogOut, X, Upload, Link, Sparkles } from 'lucide-react';
import { ToggleSwitch } from '../shared/ToggleSwitch';
import { promptsApi, skillsApi } from '../../lib/prompts-api';
import type { SkillItem } from '../../lib/prompts-api';
import { memoryApi as autoMemoryApi } from '../../lib/api';
import type { MemoryConfig, MemoryStats } from '../../lib/api';
import { useAppStore } from '../../store';
import type { ModelInfo } from '../../store';
import { Markdown } from '../shared/Markdown';
import { ApiKeysTab } from './ApiKeysTab';
import { McpTab } from './McpTab';
const INVALID_NAME_RE = /[.]{2}|[/\\]|\0/;

type TabId = 'general' | 'system-prompt' | 'profile' | 'openspec' | 'memory' | 'skills' | 'api-keys' | 'mcp';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  onLanguageToggle?: () => void;
  language?: string;
  onLogout?: () => void;
}

const TABS: { id: TabId; labelKey: string }[] = [
  { id: 'general', labelKey: 'settings.tabs.general' },
  { id: 'system-prompt', labelKey: 'settings.tabs.systemPrompt' },
  { id: 'profile', labelKey: 'settings.tabs.profile' },
  { id: 'openspec', labelKey: 'settings.tabs.openspec' },
  { id: 'memory', labelKey: 'settings.tabs.memory' },
  { id: 'skills', labelKey: 'settings.tabs.skills' },
  { id: 'api-keys', labelKey: 'settings.tabs.apiKeys' },
  { id: 'mcp', labelKey: 'settings.tabs.mcp' },
];

export function SettingsPanel({ open, onClose, onLanguageToggle, language, onLogout }: SettingsPanelProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('system-prompt');

  // Escape key handler
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      data-testid="settings-panel"
      className="fixed inset-0 z-50 bg-bg-primary flex flex-col"
    >
      {/* Header */}
      <div className="h-12 flex items-center gap-3 px-4 border-b border-border-subtle shrink-0">
        <button
          data-testid="settings-back-button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-secondary"
          aria-label={t('settings.back', 'Back')}
        >
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-sm font-semibold text-text-primary">{t('settings.title')}</h2>
      </div>

      {/* Mobile: horizontal tabs */}
      <div className="flex overflow-x-auto border-b border-border-subtle md:hidden">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Desktop: sidebar + content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar navigation (desktop) */}
        <nav
          data-testid="settings-sidebar"
          className="hidden md:flex w-56 shrink-0 flex-col border-r border-border-subtle py-2 overflow-y-auto"
          role="tablist"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-left px-4 py-2 text-sm transition-colors ${
                activeTab === tab.id
                  ? 'text-accent bg-accent-soft font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </nav>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            {activeTab === 'general' && (
              <GeneralTab language={language} onLanguageToggle={onLanguageToggle} onLogout={onLogout} />
            )}
            {activeTab === 'system-prompt' && <SystemPromptTab />}
            {activeTab === 'profile' && <ProfileTab />}
            {activeTab === 'openspec' && <OpenSpecTab />}
            {activeTab === 'memory' && <MemoryTab />}
            {activeTab === 'skills' && <SkillsTab onClose={onClose} />}
            {activeTab === 'api-keys' && <ApiKeysTab />}
            {activeTab === 'mcp' && <McpTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

// === General Tab ===
function GeneralTab({
  language,
  onLanguageToggle,
  onLogout,
}: {
  language?: string;
  onLanguageToggle?: () => void;
  onLogout?: () => void;
}) {
  const { t } = useTranslation();
  const displayLang = language === 'zh-TW' ? '繁體中文' : 'English';
  const [sdkVersion, setSdkVersion] = useState<string | null>(null);
  const [sdkLatestVersion, setSdkLatestVersion] = useState<string | null>(null);
  const [sdkUpdateAvailable, setSdkUpdateAvailable] = useState(false);
  const [analyzingChanges, setAnalyzingChanges] = useState(false);

  useEffect(() => {
    import('../../lib/api').then(({ apiGet }) => {
      apiGet<{ currentVersion: string | null; latestVersion: string | null; updateAvailable: boolean }>('/api/copilot/sdk-version')
        .then((r) => {
          setSdkVersion(r.currentVersion);
          setSdkLatestVersion(r.latestVersion);
          setSdkUpdateAvailable(r.updateAvailable);
        })
        .catch(() => {});
    });
  }, []);

  const handleAnalyzeChanges = useCallback(async () => {
    if (!sdkVersion || !sdkLatestVersion) return;
    setAnalyzingChanges(true);
    try {
      const { apiGet } = await import('../../lib/api');
      const { changelog } = await apiGet<{ changelog: string | null }>(
        `/api/copilot/sdk-changelog?from=${encodeURIComponent(sdkVersion)}&to=${encodeURIComponent(sdkLatestVersion)}`,
      );

      // Close settings
      useAppStore.getState().setSettingsOpen(false);

      // Build and dispatch the analyze message
      const changelogText = changelog || t('sdk.changelogUnavailable');
      const message = `SDK has been updated from v${sdkVersion} to v${sdkLatestVersion}. Here is the changelog:\n\n${changelogText}\n\nPlease analyze these changes and suggest how my backend and frontend code can be optimized.`;
      document.dispatchEvent(new CustomEvent('settings:analyzeChanges', { detail: { message } }));
    } catch {
      // Fallback: still close settings and send without changelog
      useAppStore.getState().setSettingsOpen(false);
      const message = `SDK has been updated from v${sdkVersion} to v${sdkLatestVersion}. ${t('sdk.changelogUnavailable')}. Please analyze the update and suggest how my backend and frontend code can be optimized.`;
      document.dispatchEvent(new CustomEvent('settings:analyzeChanges', { detail: { message } }));
    } finally {
      setAnalyzingChanges(false);
    }
  }, [sdkVersion, sdkLatestVersion, t]);

  return (
    <div className="flex flex-col gap-4">
      {/* SDK Version */}
      {sdkVersion && (
        <section>
          <h3 className="text-xs font-semibold text-text-secondary uppercase mb-2">Copilot SDK</h3>
          <div className="flex items-center gap-3">
            <span data-testid="sdk-version" className="text-sm text-text-primary font-mono">v{sdkVersion}</span>
            {sdkUpdateAvailable && sdkLatestVersion && (
              <button
                data-testid="analyze-changes-button"
                onClick={handleAnalyzeChanges}
                disabled={analyzingChanges}
                className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzingChanges ? '...' : t('sdk.analyzeChanges')}
              </button>
            )}
          </div>
        </section>
      )}

      {/* Language */}
      <section>
        <h3 className="text-xs font-semibold text-text-secondary uppercase mb-2">{t('settings.general.language')}</h3>
        <button
          data-testid="language-toggle"
          onClick={onLanguageToggle}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-bg-tertiary transition-colors text-sm text-text-primary"
        >
          <Globe size={16} />
          {displayLang}
        </button>
      </section>

      {/* Logout */}
      <section>
        <button
          data-testid="logout-button"
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-error/30 text-error hover:bg-error/10 transition-colors text-sm"
        >
          <LogOut size={16} />
          {t('settings.general.logout')}
        </button>
      </section>
    </div>
  );
}

// === System Prompt Tab ===
function SystemPromptTab() {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    promptsApi.getSystemPrompt().then((r) => {
      setContent(r.content);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await promptsApi.putSystemPrompt(content);
      setToast(t('settings.toast.saved'));
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast(t('settings.toast.saveFailed'));
      setTimeout(() => setToast(null), 2000);
    }
  }, [content, t]);

  const handleReset = useCallback(async () => {
    if (!window.confirm(t('settings.systemPrompt.resetConfirm'))) return;
    try {
      const result = await promptsApi.resetSystemPrompt();
      setContent(result.content);
      setToast(t('settings.toast.reset'));
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast(t('settings.toast.resetFailed'));
      setTimeout(() => setToast(null), 2000);
    }
  }, [t]);

  if (loading) return <div className="text-text-secondary text-sm">{t('settings.loading')}</div>;

  return (
    <div className="flex flex-col gap-3">
      <textarea
        data-testid="system-prompt-textarea"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full h-64 p-2 text-sm bg-bg-secondary border border-border rounded-lg resize-y font-mono text-text-primary"
      />
      <div className="flex items-center gap-2">
        <button
          data-testid="save-system-prompt"
          onClick={handleSave}
          className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90"
        >
          {t('settings.save')}
        </button>
        <button
          data-testid="reset-system-prompt"
          onClick={handleReset}
          className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-bg-tertiary text-text-secondary"
        >
          {t('settings.systemPrompt.resetToDefault')}
        </button>
        {toast && <span className="text-xs text-text-secondary">{toast}</span>}
      </div>
    </div>
  );
}

// === Profile Tab ===
function ProfileTab() {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    promptsApi.getProfile().then((r) => {
      setContent(r.content);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await promptsApi.putProfile(content);
      setToast(t('settings.toast.saved'));
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast(t('settings.toast.saveFailed'));
      setTimeout(() => setToast(null), 2000);
    }
  }, [content, t]);

  if (loading) return <div className="text-text-secondary text-sm">{t('settings.loading')}</div>;

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full h-48 p-2 text-sm bg-bg-secondary border border-border rounded-lg resize-y font-mono text-text-primary"
      />
      <div className="flex items-center gap-2">
        <button
          data-testid="save-profile"
          onClick={handleSave}
          className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90"
        >
          {t('settings.save')}
        </button>
        {toast && <span className="text-xs text-text-secondary">{toast}</span>}
      </div>
    </div>
  );
}

// === OpenSpec Tab ===
function OpenSpecTab() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [openspecEnabled, setOpenspecEnabled] = useState(false);
  const [openspecContent, setOpenspecContent] = useState('');
  const [openspecSkillNames, setOpenspecSkillNames] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      import('../../lib/api').then(({ configApi }) => configApi.getOpenspecSdd()),
      skillsApi.list(),
    ]).then(([openspecRes, skillsRes]) => {
      setOpenspecEnabled(openspecRes.enabled);
      if (openspecRes.enabled) {
        promptsApi.getOpenspecSdd().then((r) => setOpenspecContent(r.content)).catch(() => {});
      }
      const names = skillsRes.skills.filter((s: { name: string }) => s.name.startsWith('openspec-')).map((s: { name: string }) => s.name);
      setOpenspecSkillNames(names);
      useAppStore.getState().batchSetSkillsDisabled(names, !openspecRes.enabled);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleToggleOpenspec = useCallback(async () => {
    const newEnabled = !openspecEnabled;
    try {
      const { configApi } = await import('../../lib/api');
      await configApi.putOpenspecSdd(newEnabled);
      setOpenspecEnabled(newEnabled);
      if (newEnabled) {
        promptsApi.getOpenspecSdd().then((r) => setOpenspecContent(r.content)).catch(() => {});
      }
      useAppStore.getState().batchSetSkillsDisabled(openspecSkillNames, !newEnabled);
    } catch {
      setToast(t('settings.toast.saveFailed'));
      setTimeout(() => setToast(null), 2000);
    }
  }, [openspecEnabled, openspecSkillNames, t]);

  const handleSaveOpenspec = useCallback(async () => {
    try {
      await promptsApi.putOpenspecSdd(openspecContent);
      setToast(t('settings.toast.saved'));
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast(t('settings.toast.saveFailed'));
      setTimeout(() => setToast(null), 2000);
    }
  }, [openspecContent, t]);

  if (loading) return <div className="text-text-secondary text-sm">{t('settings.loading')}</div>;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-xs font-semibold text-text-secondary uppercase mb-1">{t('settings.openspec.title', 'OpenSpec SDD')}</h3>
        <p className="text-[11px] text-text-secondary/70 mb-2">{t('settings.openspec.desc', 'Enable spec-driven development workflow')}</p>
        <div className="flex items-center gap-2">
          <ToggleSwitch
            data-testid="openspec-sdd-toggle"
            checked={openspecEnabled}
            onChange={handleToggleOpenspec}
          />
          <span className="text-xs text-text-secondary">{t('settings.openspec.enabled', 'Enabled')}</span>
        </div>
      </div>

      {openspecEnabled && (
        <div className="flex flex-col gap-2">
          <textarea
            data-testid="openspec-sdd-textarea"
            value={openspecContent}
            onChange={(e) => setOpenspecContent(e.target.value)}
            className="w-full h-48 p-2 text-sm bg-bg-secondary border border-border rounded-lg resize-y font-mono text-text-primary"
          />
          <div className="flex items-center gap-2">
            <button
              data-testid="save-openspec-sdd"
              onClick={handleSaveOpenspec}
              className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90"
            >
              {t('settings.save')}
            </button>
            {toast && <span className="text-xs text-text-secondary">{toast}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// === Memory Tab (Auto Memory only) ===
function MemoryTab() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Auto-memory state
  const [autoMemContent, setAutoMemContent] = useState('');
  const [autoMemConfig, setAutoMemConfig] = useState<MemoryConfig | null>(null);
  const [autoMemStats, setAutoMemStats] = useState<MemoryStats | null>(null);

  useEffect(() => {
    Promise.all([
      autoMemoryApi.getMain(),
      autoMemoryApi.getConfig(),
      autoMemoryApi.getStats(),
    ]).then(([mainMem, memCfg, memStats]) => {
      setAutoMemContent(mainMem.content);
      setAutoMemConfig(memCfg);
      setAutoMemStats(memStats);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSaveAutoMemory = useCallback(async () => {
    try {
      await autoMemoryApi.putMain(autoMemContent);
      setToast(t('settings.toast.saved', 'Saved'));
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast(t('settings.toast.saveFailed', 'Save failed'));
      setTimeout(() => setToast(null), 2000);
    }
  }, [autoMemContent, t]);

  const handleToggleAutoExtract = useCallback(async () => {
    if (!autoMemConfig) return;
    const updated = { ...autoMemConfig, autoExtract: !autoMemConfig.autoExtract };
    try {
      await autoMemoryApi.putConfig(updated);
      setAutoMemConfig(updated);
    } catch {
      setToast(t('settings.toast.saveFailed', 'Save failed'));
      setTimeout(() => setToast(null), 2000);
    }
  }, [autoMemConfig, t]);

  const handleToggleLlmConfig = useCallback(async (key: 'llmGatingEnabled' | 'llmExtractionEnabled' | 'llmCompactionEnabled') => {
    if (!autoMemConfig) return;
    const updated = { ...autoMemConfig, [key]: !autoMemConfig[key] };
    try {
      await autoMemoryApi.putConfig(updated);
      setAutoMemConfig(updated);
    } catch {
      setToast(t('settings.toast.saveFailed', 'Save failed'));
      setTimeout(() => setToast(null), 2000);
    }
  }, [autoMemConfig, t]);

  const models = useAppStore((s) => s.models);

  const handleLlmModelChange = useCallback(async (key: 'llmGatingModel' | 'llmExtractionModel' | 'llmCompactionModel', value: string) => {
    if (!autoMemConfig) return;
    const updated = { ...autoMemConfig, [key]: value };
    try {
      await autoMemoryApi.putConfig(updated);
      setAutoMemConfig(updated);
    } catch {
      setToast(t('settings.toast.saveFailed', 'Save failed'));
      setTimeout(() => setToast(null), 2000);
    }
  }, [autoMemConfig, t]);

  const handleCompactMemory = useCallback(async () => {
    try {
      const result = await autoMemoryApi.compactMemory();
      if (result.beforeCount !== undefined) {
        setToast(`Compacted: ${result.beforeCount} → ${result.afterCount}`);
      } else {
        setToast(result.message ?? 'Compaction skipped');
      }
      const stats = await autoMemoryApi.getStats();
      setAutoMemStats(stats);
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast(t('settings.toast.saveFailed', 'Save failed'));
      setTimeout(() => setToast(null), 2000);
    }
  }, [t]);

  if (loading) return <div className="text-text-secondary text-sm">{t('settings.loading')}</div>;

  return (
    <div className="flex flex-col gap-4">
      {/* Auto Memory */}
      <section data-testid="auto-memory-section">
        <h3 className="text-xs font-semibold text-text-secondary uppercase mb-2">{t('settings.memory.autoMemory', 'Auto Memory')}</h3>
        <textarea
          data-testid="auto-memory-editor"
          value={autoMemContent}
          onChange={(e) => setAutoMemContent(e.target.value)}
          className="w-full h-32 p-2 text-sm bg-bg-secondary border border-border rounded-lg resize-y font-mono text-text-primary"
        />
        <div className="flex items-center gap-3 mt-2">
          <button
            data-testid="save-auto-memory"
            onClick={handleSaveAutoMemory}
            className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90"
          >
            {t('settings.save')}
          </button>
          <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
            <input
              data-testid="auto-extract-toggle"
              type="checkbox"
              checked={autoMemConfig?.autoExtract ?? false}
              onChange={handleToggleAutoExtract}
              className="rounded"
            />
            {t('settings.memory.autoExtract', 'Auto Extract')}
          </label>
        </div>
        {autoMemStats && (
          <div data-testid="memory-stats" className="mt-2 text-xs text-text-secondary">
            {t('settings.memory.totalFacts', 'Total facts')}: {autoMemStats.totalFacts}
          </div>
        )}
      </section>

      {/* LLM Intelligence */}
      <section data-testid="llm-intelligence-section">
        <h3 className="text-xs font-semibold text-text-secondary uppercase mb-2">{t('settings.memory.llmIntelligence', 'LLM Intelligence')}</h3>

        <div className="flex flex-col gap-3">
          {/* Quality Gate */}
          <div>
            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
              <input
                data-testid="llm-gating-toggle"
                type="checkbox"
                checked={autoMemConfig?.llmGatingEnabled ?? false}
                onChange={() => handleToggleLlmConfig('llmGatingEnabled')}
                className="rounded"
              />
              {t('settings.memory.llmGating', 'LLM Quality Gate')}
            </label>
            <p data-testid="llm-gating-desc" className="text-[11px] text-text-secondary/70 mt-0.5 ml-5">
              {t('settings.memory.llmGatingDesc')}
            </p>
            {autoMemConfig?.llmGatingEnabled && (
              <div className="mt-1 ml-5 flex items-center gap-2">
                <span className="text-[11px] text-text-secondary">{t('settings.memory.selectModel', 'Model')}:</span>
                <select
                  data-testid="llm-gating-model"
                  value={autoMemConfig?.llmGatingModel ?? 'gpt-4o-mini'}
                  onChange={(e) => handleLlmModelChange('llmGatingModel', e.target.value)}
                  className="text-xs bg-bg-secondary border border-border rounded px-1.5 py-0.5 text-text-primary"
                >
                  {models.map((m: ModelInfo) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Smart Extraction */}
          <div>
            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
              <input
                data-testid="llm-extraction-toggle"
                type="checkbox"
                checked={autoMemConfig?.llmExtractionEnabled ?? false}
                onChange={() => handleToggleLlmConfig('llmExtractionEnabled')}
                className="rounded"
              />
              {t('settings.memory.llmExtraction', 'LLM Smart Extraction')}
            </label>
            <p data-testid="llm-extraction-desc" className="text-[11px] text-text-secondary/70 mt-0.5 ml-5">
              {t('settings.memory.llmExtractionDesc')}
            </p>
            {autoMemConfig?.llmExtractionEnabled && (
              <div className="mt-1 ml-5 flex items-center gap-2">
                <span className="text-[11px] text-text-secondary">{t('settings.memory.selectModel', 'Model')}:</span>
                <select
                  data-testid="llm-extraction-model"
                  value={autoMemConfig?.llmExtractionModel ?? 'gpt-4o-mini'}
                  onChange={(e) => handleLlmModelChange('llmExtractionModel', e.target.value)}
                  className="text-xs bg-bg-secondary border border-border rounded px-1.5 py-0.5 text-text-primary"
                >
                  {models.map((m: ModelInfo) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Compaction */}
          <div>
            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
              <input
                data-testid="llm-compaction-toggle"
                type="checkbox"
                checked={autoMemConfig?.llmCompactionEnabled ?? false}
                onChange={() => handleToggleLlmConfig('llmCompactionEnabled')}
                className="rounded"
              />
              {t('settings.memory.llmCompaction', 'LLM Memory Compaction')}
            </label>
            <p data-testid="llm-compaction-desc" className="text-[11px] text-text-secondary/70 mt-0.5 ml-5">
              {t('settings.memory.llmCompactionDesc')}
            </p>
            {autoMemConfig?.llmCompactionEnabled && (
              <div className="mt-1 ml-5 flex items-center gap-2">
                <span className="text-[11px] text-text-secondary">{t('settings.memory.selectModel', 'Model')}:</span>
                <select
                  data-testid="llm-compaction-model"
                  value={autoMemConfig?.llmCompactionModel ?? 'gpt-4o-mini'}
                  onChange={(e) => handleLlmModelChange('llmCompactionModel', e.target.value)}
                  className="text-xs bg-bg-secondary border border-border rounded px-1.5 py-0.5 text-text-primary"
                >
                  {models.map((m: ModelInfo) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Manual Compact Button */}
          <button
            data-testid="compact-memory-button"
            onClick={handleCompactMemory}
            className="self-start mt-1 px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-bg-tertiary text-text-secondary"
          >
            {t('settings.memory.compactNow', 'Compact Now')}
          </button>
        </div>
      </section>

      {toast && <span className="text-xs text-text-secondary">{toast}</span>}
    </div>
  );
}

// === Skills Tab ===
function SkillsTab({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation();
  const disabledSkills = useAppStore((s) => s.disabledSkills);
  const toggleSkill = useAppStore((s) => s.toggleSkill);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newContent, setNewContent] = useState('');
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editContent, setEditContent] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Install state
  const [installUrl, setInstallUrl] = useState('');
  const [installing, setInstalling] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nameError = newName.trim() !== '' && INVALID_NAME_RE.test(newName.trim());

  useEffect(() => {
    skillsApi.list().then((r) => {
      setSkills(r.skills);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const refreshSkills = useCallback(async () => {
    try {
      const r = await skillsApi.list();
      setSkills(r.skills);
      useAppStore.getState().setSkills(r.skills);
    } catch { /* ignore */ }
  }, []);

  const handleCreate = useCallback(async () => {
    if (!newName.trim() || INVALID_NAME_RE.test(newName.trim())) return;
    try {
      await skillsApi.put(newName.trim(), newDescription, newContent);
      const newSkill = { name: newName.trim(), description: newDescription, content: newContent, builtin: false };
      setSkills((prev) => {
        const updated = [...prev, newSkill];
        useAppStore.getState().setSkills(updated);
        return updated;
      });
      setNewName('');
      setNewDescription('');
      setNewContent('');
      setShowCreate(false);
      setToast(t('settings.toast.saved'));
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast(t('settings.toast.saveFailed'));
      setTimeout(() => setToast(null), 2000);
    }
  }, [newName, newDescription, newContent, t]);

  const handleExpand = useCallback((name: string, description: string, content: string) => {
    if (expandedSkill === name) {
      setExpandedSkill(null);
    } else {
      setExpandedSkill(name);
      setEditDescription(description);
      setEditContent(content);
      setShowPreview(false);
    }
  }, [expandedSkill]);

  const handleSave = useCallback(async () => {
    if (!expandedSkill) return;
    try {
      await skillsApi.put(expandedSkill, editDescription, editContent);
      setSkills((prev) => {
        const updated = prev.map((s) => (s.name === expandedSkill ? { ...s, description: editDescription, content: editContent } : s));
        useAppStore.getState().setSkills(updated);
        return updated;
      });
      setToast(t('settings.toast.saved'));
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast(t('settings.toast.saveFailed'));
      setTimeout(() => setToast(null), 2000);
    }
  }, [expandedSkill, editDescription, editContent, t]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!confirmDelete) return;
    try {
      await skillsApi.delete(confirmDelete);
      setSkills((prev) => {
        const updated = prev.filter((s) => s.name !== confirmDelete);
        useAppStore.getState().setSkills(updated);
        return updated;
      });
      setToast(t('settings.toast.deleted'));
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast(t('settings.toast.deleteFailed'));
      setTimeout(() => setToast(null), 2000);
    }
    setConfirmDelete(null);
  }, [confirmDelete, t]);

  // --- Upload handlers ---
  const handleUploadFile = useCallback(async (file: File) => {
    setInstalling(true);
    setToast(t('settings.skills.installing'));
    try {
      await skillsApi.upload(file);
      await refreshSkills();
      setToast(t('settings.skills.installSuccess'));
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      setToast(err instanceof Error ? err.message : t('settings.skills.installError'));
      setTimeout(() => setToast(null), 3000);
    } finally {
      setInstalling(false);
    }
  }, [t, refreshSkills]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUploadFile(file);
  }, [handleUploadFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUploadFile(file);
    // Reset input so the same file can be selected again
    e.target.value = '';
  }, [handleUploadFile]);

  // --- URL install handler ---
  const handleInstallFromUrl = useCallback(async () => {
    if (!installUrl.trim()) return;
    setInstalling(true);
    setToast(t('settings.skills.installing'));
    try {
      await skillsApi.installFromUrl(installUrl.trim());
      await refreshSkills();
      setInstallUrl('');
      setToast(t('settings.skills.installSuccess'));
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      setToast(err instanceof Error ? err.message : t('settings.skills.installError'));
      setTimeout(() => setToast(null), 3000);
    } finally {
      setInstalling(false);
    }
  }, [installUrl, t, refreshSkills]);

  // --- AI create handler ---
  const handleAiCreate = useCallback(() => {
    onClose?.();
    // Dispatch a custom event that the chat can listen to for sending /skill-creator
    window.dispatchEvent(new CustomEvent('skills:ai-create'));
  }, [onClose]);

  if (loading) return <div className="text-text-secondary text-sm">{t('settings.loading')}</div>;

  const systemSkills = skills.filter((s) => s.builtin);
  const userSkills = skills.filter((s) => !s.builtin);

  if (userSkills.length === 0 && systemSkills.length === 0 && !showCreate) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm text-text-secondary mb-4">{t('settings.skills.empty')}</p>
        <button
          data-testid="new-skill-button"
          onClick={() => setShowCreate(true)}
          className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90"
        >
          {t('settings.skills.newSkill')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Install Actions */}
      <div data-testid="skill-install-section" className="flex flex-col gap-3">
        {/* Upload ZIP */}
        <div
          data-testid="skill-upload-drop"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            dragOver
              ? 'border-accent bg-accent/5'
              : 'border-border hover:border-accent/50 hover:bg-bg-tertiary'
          }`}
        >
          <Upload size={16} className="text-text-secondary" />
          <span className="text-sm text-text-secondary">{t('settings.skills.uploadDrop')}</span>
          <input
            ref={fileInputRef}
            data-testid="skill-upload-input"
            type="file"
            accept=".zip"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>

        {/* URL Install */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-bg-secondary border border-border rounded-lg">
            <Link size={14} className="text-text-secondary shrink-0" />
            <input
              data-testid="skill-url-input"
              type="text"
              value={installUrl}
              onChange={(e) => setInstallUrl(e.target.value)}
              placeholder={t('settings.skills.urlPlaceholder')}
              className="flex-1 text-sm bg-transparent text-text-primary outline-none placeholder:text-text-secondary/50"
              onKeyDown={(e) => { if (e.key === 'Enter') handleInstallFromUrl(); }}
            />
          </div>
          <button
            data-testid="skill-url-install"
            onClick={handleInstallFromUrl}
            disabled={!installUrl.trim() || installing}
            className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {installing ? t('settings.skills.installing') : t('settings.skills.installFromUrl')}
          </button>
        </div>

        {/* AI Create */}
        <button
          data-testid="skill-ai-create"
          onClick={handleAiCreate}
          className="self-start flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-bg-tertiary text-text-secondary"
        >
          <Sparkles size={14} />
          {t('settings.skills.createWithAI')}
        </button>
      </div>

      {/* System Skills Section */}
      {systemSkills.length > 0 && (
        <div data-testid="system-skills-section" className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{t('settings.skills.system')}</h3>
          {systemSkills.map((skill) => (
            <div key={skill.name} className="border border-border rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2">
                {/* Toggle switch */}
                <ToggleSwitch
                  data-testid={`skill-toggle-${skill.name}`}
                  checked={!disabledSkills.includes(skill.name)}
                  onChange={() => toggleSkill(skill.name)}
                />

                {/* Name + description + expand */}
                <button
                  data-testid={`skill-expand-${skill.name}`}
                  onClick={() => handleExpand(skill.name, skill.description, skill.content)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-text-primary hover:text-accent truncate">{skill.name}</span>
                    <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded">{t('settings.skills.systemBadge')}</span>
                  </div>
                  {skill.description && (
                    <div className="text-xs text-text-secondary truncate">{skill.description}</div>
                  )}
                </button>
              </div>

              {/* Expanded preview area (read-only for builtin) */}
              {expandedSkill === skill.name && (
                <div className="px-3 pb-3 flex flex-col gap-2 border-t border-border-subtle mt-0">
                  {skill.description && (
                    <>
                      <label className="text-xs font-medium text-text-secondary mt-2">{t('settings.skills.description')}</label>
                      <p className="text-sm text-text-primary">{skill.description}</p>
                    </>
                  )}
                  <label className="text-xs font-medium text-text-secondary">{t('settings.skills.content')}</label>
                  <div data-testid="skill-preview-content" className="w-full min-h-[8rem] p-2 bg-bg-secondary border border-border rounded-lg overflow-auto">
                    <Markdown content={skill.content} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* User Skills Section */}
      <div data-testid="user-skills-section" className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{t('settings.skills.user')}</h3>
        {userSkills.map((skill) => (
          <div key={skill.name} className="border border-border rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2">
              {/* Toggle switch */}
              <ToggleSwitch
                data-testid={`skill-toggle-${skill.name}`}
                checked={!disabledSkills.includes(skill.name)}
                onChange={() => toggleSkill(skill.name)}
              />

              {/* Name + description + expand */}
              <button
                data-testid={`skill-expand-${skill.name}`}
                onClick={() => handleExpand(skill.name, skill.description, skill.content)}
                className="flex-1 text-left min-w-0"
              >
                <div className="text-sm text-text-primary hover:text-accent truncate">{skill.name}</div>
                {skill.description && (
                  <div className="text-xs text-text-secondary truncate">{skill.description}</div>
                )}
              </button>

              {/* Delete */}
              <button
                data-testid={`skill-delete-${skill.name}`}
                onClick={() => setConfirmDelete(skill.name)}
                className="shrink-0 p-1 text-text-secondary hover:text-error"
              >
                <X size={14} />
              </button>
            </div>

            {/* Expanded edit area */}
            {expandedSkill === skill.name && (
              <div className="px-3 pb-3 flex flex-col gap-2 border-t border-border-subtle mt-0">
                <label className="text-xs font-medium text-text-secondary mt-2">{t('settings.skills.description')}</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full p-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary"
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-text-secondary">{t('settings.skills.content')}</label>
                  <div className="flex gap-1 ml-auto">
                    <button
                      data-testid="skill-edit-button"
                      onClick={() => setShowPreview(false)}
                      className={`px-2 py-0.5 text-xs rounded ${!showPreview ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                      {t('settings.skills.edit')}
                    </button>
                    <button
                      data-testid="skill-preview-button"
                      onClick={() => setShowPreview(true)}
                      className={`px-2 py-0.5 text-xs rounded ${showPreview ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                      {t('settings.skills.preview')}
                    </button>
                  </div>
                </div>
                {showPreview ? (
                  <div data-testid="skill-preview-content" className="w-full min-h-[8rem] p-2 bg-bg-secondary border border-border rounded-lg overflow-auto">
                    <Markdown content={editContent} />
                  </div>
                ) : (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-32 p-2 text-sm bg-bg-secondary border border-border rounded-lg resize-y font-mono text-text-primary"
                  />
                )}
                <button
                  data-testid="save-skill"
                  onClick={handleSave}
                  className="self-start px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90"
                >
                  {t('settings.save')}
                </button>
              </div>
            )}
          </div>
        ))}

        {/* New Skill button */}
        <button
          data-testid="new-skill-button"
          onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90 self-start"
        >
          {t('settings.skills.newSkill')}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="border border-border rounded-lg p-3 flex flex-col gap-2">
          <label className="text-xs font-medium text-text-secondary">{t('settings.skills.name')}</label>
          <input
            data-testid="new-skill-name"
            type="text"
            placeholder={t('settings.skills.namePlaceholder')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className={`w-full p-2 text-sm bg-bg-secondary border rounded-lg text-text-primary ${nameError ? 'border-error' : 'border-border'}`}
          />
          {nameError && (
            <p data-testid="skill-name-error" className="text-xs text-error">{t('settings.skills.nameInvalid')}</p>
          )}
          <label className="text-xs font-medium text-text-secondary">{t('settings.skills.description')}</label>
          <input
            data-testid="new-skill-description"
            type="text"
            placeholder={t('settings.skills.descriptionPlaceholder')}
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="w-full p-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary"
          />
          <label className="text-xs font-medium text-text-secondary">{t('settings.skills.content')}</label>
          <textarea
            data-testid="new-skill-content"
            placeholder={t('settings.skills.contentPlaceholder')}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="w-full h-32 p-2 text-sm bg-bg-secondary border border-border rounded-lg resize-y font-mono text-text-primary"
          />
          <button
            data-testid="create-skill-button"
            onClick={handleCreate}
            disabled={!newName.trim() || nameError}
            className="self-start px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('settings.skills.create')}
          </button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" data-testid="skill-delete-dialog">
          <div className="bg-bg-primary rounded-xl border border-border p-6 shadow-lg max-w-sm mx-4">
            <p className="text-sm text-text-primary mb-4">{t('settings.skills.deleteConfirm')}</p>
            <div className="flex gap-2 justify-end">
              <button
                data-testid="skill-delete-cancel"
                onClick={() => setConfirmDelete(null)}
                className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-bg-tertiary"
              >
                {t('settings.deleteDialog.cancel')}
              </button>
              <button
                data-testid="skill-delete-confirm"
                onClick={handleDeleteConfirm}
                className="px-3 py-1.5 text-xs font-medium bg-error text-white rounded-lg hover:bg-error/90"
              >
                {t('settings.deleteDialog.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <span data-testid="skill-toast" className="text-xs text-text-secondary">{toast}</span>}
    </div>
  );
}
