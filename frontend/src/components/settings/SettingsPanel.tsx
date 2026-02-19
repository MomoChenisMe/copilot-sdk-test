import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Globe, LogOut, X } from 'lucide-react';
import { ToggleSwitch } from '../shared/ToggleSwitch';
import { promptsApi, memoryApi, skillsApi } from '../../lib/prompts-api';
import type { PresetItem, MemoryItem, SkillItem } from '../../lib/prompts-api';
import { memoryApi as autoMemoryApi } from '../../lib/api';
import type { MemoryConfig, MemoryStats } from '../../lib/api';
import { useAppStore } from '../../store';
import { Markdown } from '../shared/Markdown';
import { ApiKeysTab } from './ApiKeysTab';
import { McpTab } from './McpTab';
import { CronTab } from './CronTab';

const INVALID_NAME_RE = /[.]{2}|[/\\]|\0/;

type TabId = 'general' | 'system-prompt' | 'profile' | 'agent' | 'presets' | 'memory' | 'skills' | 'api-keys' | 'mcp' | 'cron';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  activePresets: string[];
  onTogglePreset: (name: string) => void;
  onLanguageToggle?: () => void;
  language?: string;
  onLogout?: () => void;
}

const TABS: { id: TabId; labelKey: string }[] = [
  { id: 'general', labelKey: 'settings.tabs.general' },
  { id: 'system-prompt', labelKey: 'settings.tabs.systemPrompt' },
  { id: 'profile', labelKey: 'settings.tabs.profile' },
  { id: 'agent', labelKey: 'settings.tabs.agent' },
  { id: 'presets', labelKey: 'settings.tabs.presets' },
  { id: 'memory', labelKey: 'settings.tabs.memory' },
  { id: 'skills', labelKey: 'settings.tabs.skills' },
  { id: 'api-keys', labelKey: 'settings.tabs.apiKeys' },
  { id: 'mcp', labelKey: 'settings.tabs.mcp' },
  { id: 'cron', labelKey: 'settings.tabs.cron' },
];

export function SettingsPanel({ open, onClose, activePresets, onTogglePreset, onLanguageToggle, language, onLogout }: SettingsPanelProps) {
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
            {activeTab === 'agent' && <AgentTab />}
            {activeTab === 'presets' && (
              <PresetsTab activePresets={activePresets} onTogglePreset={onTogglePreset} />
            )}
            {activeTab === 'memory' && <MemoryTab />}
            {activeTab === 'skills' && <SkillsTab />}
            {activeTab === 'api-keys' && <ApiKeysTab />}
            {activeTab === 'mcp' && <McpTab />}
            {activeTab === 'cron' && <CronTab />}
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

  useEffect(() => {
    import('../../lib/api').then(({ apiGet }) => {
      apiGet<{ currentVersion: string | null }>('/api/copilot/sdk-version')
        .then((r) => setSdkVersion(r.currentVersion))
        .catch(() => {});
    });
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* SDK Version */}
      {sdkVersion && (
        <section>
          <h3 className="text-xs font-semibold text-text-secondary uppercase mb-2">Copilot SDK</h3>
          <span data-testid="sdk-version" className="text-sm text-text-primary font-mono">v{sdkVersion}</span>
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

// === Agent Tab ===
function AgentTab() {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    promptsApi.getAgent().then((r) => {
      setContent(r.content);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await promptsApi.putAgent(content);
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
          data-testid="save-agent"
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

// === Presets Tab ===
function PresetsTab({
  activePresets,
  onTogglePreset,
}: {
  activePresets: string[];
  onTogglePreset: (name: string) => void;
}) {
  const { t } = useTranslation();
  const [presets, setPresets] = useState<PresetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPreset, setExpandedPreset] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    promptsApi.listPresets().then((r) => {
      setPresets(r.presets);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleExpand = useCallback((name: string, content: string) => {
    if (expandedPreset === name) {
      setExpandedPreset(null);
    } else {
      setExpandedPreset(name);
      setEditContent(content);
    }
  }, [expandedPreset]);

  const handleSavePreset = useCallback(async () => {
    if (!expandedPreset) return;
    try {
      await promptsApi.putPreset(expandedPreset, editContent);
      setPresets((prev) =>
        prev.map((p) => (p.name === expandedPreset ? { ...p, content: editContent } : p)),
      );
      setToast(t('settings.toast.saved'));
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast(t('settings.toast.saveFailed'));
      setTimeout(() => setToast(null), 2000);
    }
  }, [expandedPreset, editContent, t]);

  const handleDeletePreset = useCallback(async (name: string) => {
    try {
      await promptsApi.deletePreset(name);
      setPresets((prev) => prev.filter((p) => p.name !== name));
    } catch {
      setToast(t('settings.toast.deleteFailed'));
      setTimeout(() => setToast(null), 2000);
    }
  }, [t]);

  const handleExport = useCallback(async () => {
    try {
      const data = await promptsApi.exportPresets();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'presets.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setToast(t('settings.toast.saveFailed'));
      setTimeout(() => setToast(null), 2000);
    }
  }, [t]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!Array.isArray(data.presets)) throw new Error('Invalid format');
        await promptsApi.importPresets(data.presets);
        // Refresh list
        const r = await promptsApi.listPresets();
        setPresets(r.presets);
        setToast(t('settings.toast.saved'));
        setTimeout(() => setToast(null), 2000);
      } catch {
        setToast(t('settings.toast.saveFailed'));
        setTimeout(() => setToast(null), 2000);
      }
    };
    input.click();
  }, [t]);

  if (loading) return <div className="text-text-secondary text-sm">{t('settings.loading')}</div>;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 mb-2">
        <button
          data-testid="presets-export"
          onClick={handleExport}
          className="px-3 py-1.5 text-xs font-medium bg-bg-tertiary text-text-secondary rounded-lg hover:bg-bg-secondary"
        >
          Export
        </button>
        <button
          data-testid="presets-import"
          onClick={handleImport}
          className="px-3 py-1.5 text-xs font-medium bg-bg-tertiary text-text-secondary rounded-lg hover:bg-bg-secondary"
        >
          Import
        </button>
      </div>
      {presets.map((preset) => (
        <div key={preset.name} className="border border-border rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2">
            {/* Toggle switch */}
            <ToggleSwitch
              data-testid={`preset-toggle-${preset.name}`}
              checked={activePresets.includes(preset.name)}
              onChange={() => onTogglePreset(preset.name)}
            />

            {/* Name + expand */}
            <button
              data-testid={`preset-expand-${preset.name}`}
              onClick={() => handleExpand(preset.name, preset.content)}
              className="flex-1 text-left text-sm text-text-primary hover:text-accent"
            >
              {preset.name}
            </button>

            {/* Delete */}
            <button
              data-testid={`preset-delete-${preset.name}`}
              onClick={() => handleDeletePreset(preset.name)}
              className="p-1 text-text-secondary hover:text-error"
            >
              <X size={14} />
            </button>
          </div>

          {/* Expanded edit area */}
          {expandedPreset === preset.name && (
            <div className="px-3 pb-3 flex flex-col gap-2 border-t border-border-subtle">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-32 p-2 text-sm bg-bg-secondary border border-border rounded-lg resize-y font-mono text-text-primary mt-2"
              />
              <button
                onClick={handleSavePreset}
                className="self-start px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90"
              >
                {t('settings.save')}
              </button>
            </div>
          )}
        </div>
      ))}

      {toast && <span className="text-xs text-text-secondary">{toast}</span>}
    </div>
  );
}

// === Memory Tab ===
function MemoryTab() {
  const { t } = useTranslation();
  const [prefsContent, setPrefsContent] = useState('');
  const [projects, setProjects] = useState<MemoryItem[]>([]);
  const [solutions, setSolutions] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ type: string; name: string } | null>(null);

  // Auto-memory state
  const [autoMemContent, setAutoMemContent] = useState('');
  const [autoMemConfig, setAutoMemConfig] = useState<MemoryConfig | null>(null);
  const [autoMemStats, setAutoMemStats] = useState<MemoryStats | null>(null);

  useEffect(() => {
    Promise.all([
      memoryApi.getPreferences(),
      memoryApi.listProjects(),
      memoryApi.listSolutions(),
      autoMemoryApi.getMain(),
      autoMemoryApi.getConfig(),
      autoMemoryApi.getStats(),
    ]).then(([prefs, projs, sols, mainMem, memCfg, memStats]) => {
      setPrefsContent(prefs.content);
      setProjects(projs.items);
      setSolutions(sols.items);
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

  const handleSavePrefs = useCallback(async () => {
    try {
      await memoryApi.putPreferences(prefsContent);
      setToast(t('settings.toast.saved'));
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast(t('settings.toast.saveFailed'));
      setTimeout(() => setToast(null), 2000);
    }
  }, [prefsContent, t]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === 'project') {
        await memoryApi.deleteProject(confirmDelete.name);
        setProjects((prev) => prev.filter((p) => p.name !== confirmDelete.name));
      } else {
        await memoryApi.deleteSolution(confirmDelete.name);
        setSolutions((prev) => prev.filter((s) => s.name !== confirmDelete.name));
      }
      setToast(t('settings.toast.deleted'));
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast(t('settings.toast.deleteFailed'));
      setTimeout(() => setToast(null), 2000);
    }
    setConfirmDelete(null);
  }, [confirmDelete, t]);

  const handleExpand = useCallback((key: string, content: string) => {
    if (expandedItem === key) {
      setExpandedItem(null);
    } else {
      setExpandedItem(key);
      setEditContent(content);
    }
  }, [expandedItem]);

  const handleSaveItem = useCallback(async (type: string, name: string) => {
    try {
      if (type === 'project') {
        await memoryApi.putProject(name, editContent);
        setProjects((prev) => prev.map((p) => (p.name === name ? { ...p, content: editContent } : p)));
      } else {
        await memoryApi.putSolution(name, editContent);
        setSolutions((prev) => prev.map((s) => (s.name === name ? { ...s, content: editContent } : s)));
      }
      setToast(t('settings.toast.saved'));
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast(t('settings.toast.saveFailed'));
      setTimeout(() => setToast(null), 2000);
    }
  }, [editContent, t]);

  if (loading) return <div className="text-text-secondary text-sm">{t('settings.loading')}</div>;

  return (
    <div className="flex flex-col gap-4">
      {/* Preferences */}
      <section>
        <h3 className="text-xs font-semibold text-text-secondary uppercase mb-2">{t('settings.memory.preferences')}</h3>
        <textarea
          data-testid="memory-preferences"
          value={prefsContent}
          onChange={(e) => setPrefsContent(e.target.value)}
          className="w-full h-32 p-2 text-sm bg-bg-secondary border border-border rounded-lg resize-y font-mono text-text-primary"
        />
        <button
          data-testid="save-preferences"
          onClick={handleSavePrefs}
          className="mt-2 px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90"
        >
          {t('settings.save')}
        </button>
      </section>

      {/* Projects */}
      <section>
        <h3 className="text-xs font-semibold text-text-secondary uppercase mb-2">{t('settings.memory.projects')}</h3>
        {projects.map((item) => (
          <div key={item.name} className="border border-border rounded-lg mb-2 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2">
              <button
                data-testid={`project-expand-${item.name}`}
                onClick={() => handleExpand(`project:${item.name}`, item.content)}
                className="flex-1 text-left text-sm text-text-primary hover:text-accent"
              >
                {item.name}
              </button>
              <button
                data-testid={`project-delete-${item.name}`}
                onClick={() => setConfirmDelete({ type: 'project', name: item.name })}
                className="p-1 text-text-secondary hover:text-error"
              >
                <X size={14} />
              </button>
            </div>
            {expandedItem === `project:${item.name}` && (
              <div className="px-3 pb-3 flex flex-col gap-2 border-t border-border-subtle">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-32 p-2 text-sm bg-bg-secondary border border-border rounded-lg resize-y font-mono text-text-primary mt-2"
                />
                <button
                  onClick={() => handleSaveItem('project', item.name)}
                  className="self-start px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90"
                >
                  {t('settings.save')}
                </button>
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Solutions */}
      <section>
        <h3 className="text-xs font-semibold text-text-secondary uppercase mb-2">{t('settings.memory.solutions')}</h3>
        {solutions.map((item) => (
          <div key={item.name} className="border border-border rounded-lg mb-2 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2">
              <button
                data-testid={`solution-expand-${item.name}`}
                onClick={() => handleExpand(`solution:${item.name}`, item.content)}
                className="flex-1 text-left text-sm text-text-primary hover:text-accent"
              >
                {item.name}
              </button>
              <button
                data-testid={`solution-delete-${item.name}`}
                onClick={() => setConfirmDelete({ type: 'solution', name: item.name })}
                className="p-1 text-text-secondary hover:text-error"
              >
                <X size={14} />
              </button>
            </div>
            {expandedItem === `solution:${item.name}` && (
              <div className="px-3 pb-3 flex flex-col gap-2 border-t border-border-subtle">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-32 p-2 text-sm bg-bg-secondary border border-border rounded-lg resize-y font-mono text-text-primary mt-2"
                />
                <button
                  onClick={() => handleSaveItem('solution', item.name)}
                  className="self-start px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90"
                >
                  {t('settings.save')}
                </button>
              </div>
            )}
          </div>
        ))}
      </section>

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

      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" data-testid="delete-confirm-dialog">
          <div className="bg-bg-primary rounded-xl border border-border p-6 shadow-lg max-w-sm mx-4">
            <p className="text-sm text-text-primary mb-4">{t('settings.deleteDialog.message')}</p>
            <div className="flex gap-2 justify-end">
              <button
                data-testid="delete-cancel"
                onClick={() => setConfirmDelete(null)}
                className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-bg-tertiary"
              >
                {t('settings.deleteDialog.cancel')}
              </button>
              <button
                data-testid="delete-confirm"
                onClick={handleDeleteConfirm}
                className="px-3 py-1.5 text-xs font-medium bg-error text-white rounded-lg hover:bg-error/90"
              >
                {t('settings.deleteDialog.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <span className="text-xs text-text-secondary">{toast}</span>}
    </div>
  );
}

// === Skills Tab ===
function SkillsTab() {
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

  const nameError = newName.trim() !== '' && INVALID_NAME_RE.test(newName.trim());

  useEffect(() => {
    skillsApi.list().then((r) => {
      setSkills(r.skills);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleCreate = useCallback(async () => {
    if (!newName.trim() || INVALID_NAME_RE.test(newName.trim())) return;
    try {
      await skillsApi.put(newName.trim(), newDescription, newContent);
      setSkills((prev) => [...prev, { name: newName.trim(), description: newDescription, content: newContent, builtin: false }]);
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
      setSkills((prev) => prev.map((s) => (s.name === expandedSkill ? { ...s, description: editDescription, content: editContent } : s)));
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
      setSkills((prev) => prev.filter((s) => s.name !== confirmDelete));
      setToast(t('settings.toast.deleted'));
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast(t('settings.toast.deleteFailed'));
      setTimeout(() => setToast(null), 2000);
    }
    setConfirmDelete(null);
  }, [confirmDelete, t]);

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

      {toast && <span className="text-xs text-text-secondary">{toast}</span>}
    </div>
  );
}
