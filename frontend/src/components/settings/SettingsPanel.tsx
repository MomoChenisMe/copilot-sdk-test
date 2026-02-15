import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { promptsApi, memoryApi } from '../../lib/prompts-api';
import type { PresetItem, MemoryItem } from '../../lib/prompts-api';

type TabId = 'profile' | 'agent' | 'presets' | 'memory';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  activePresets: string[];
  onTogglePreset: (name: string) => void;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'agent', label: 'Agent' },
  { id: 'presets', label: 'Presets' },
  { id: 'memory', label: 'Memory' },
];

export function SettingsPanel({ open, onClose, activePresets, onTogglePreset }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  if (!open) return null;

  return (
    <>
      {/* Overlay backdrop */}
      <div
        data-testid="settings-overlay"
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        data-testid="settings-panel"
        className="fixed inset-y-0 right-0 w-80 bg-bg-primary border-l border-border shadow-lg z-50 flex flex-col transition-transform duration-300"
      >
        {/* Header */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-border-subtle shrink-0">
          <h2 className="text-sm font-semibold text-text-primary">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-secondary"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-subtle" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'agent' && <AgentTab />}
          {activeTab === 'presets' && (
            <PresetsTab activePresets={activePresets} onTogglePreset={onTogglePreset} />
          )}
          {activeTab === 'memory' && <MemoryTab />}
        </div>
      </div>
    </>
  );
}

// === Profile Tab ===
function ProfileTab() {
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
      setToast('已儲存');
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast('儲存失敗');
      setTimeout(() => setToast(null), 2000);
    }
  }, [content]);

  if (loading) return <div className="text-text-secondary text-sm">Loading...</div>;

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
          Save
        </button>
        {toast && <span className="text-xs text-text-secondary">{toast}</span>}
      </div>
    </div>
  );
}

// === Agent Tab ===
function AgentTab() {
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
      setToast('已儲存');
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast('儲存失敗');
      setTimeout(() => setToast(null), 2000);
    }
  }, [content]);

  if (loading) return <div className="text-text-secondary text-sm">Loading...</div>;

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
          Save
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
      setToast('已儲存');
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast('儲存失敗');
      setTimeout(() => setToast(null), 2000);
    }
  }, [expandedPreset, editContent]);

  const handleDeletePreset = useCallback(async (name: string) => {
    try {
      await promptsApi.deletePreset(name);
      setPresets((prev) => prev.filter((p) => p.name !== name));
    } catch {
      setToast('刪除失敗');
      setTimeout(() => setToast(null), 2000);
    }
  }, []);

  if (loading) return <div className="text-text-secondary text-sm">Loading...</div>;

  return (
    <div className="flex flex-col gap-2">
      {presets.map((preset) => (
        <div key={preset.name} className="border border-border rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2">
            {/* Toggle switch */}
            <button
              data-testid={`preset-toggle-${preset.name}`}
              role="switch"
              aria-checked={activePresets.includes(preset.name)}
              onClick={() => onTogglePreset(preset.name)}
              className={`w-8 h-4 rounded-full relative transition-colors ${
                activePresets.includes(preset.name) ? 'bg-accent' : 'bg-bg-tertiary'
              }`}
            >
              <span
                className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                  activePresets.includes(preset.name) ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>

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
                Save
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
  const [prefsContent, setPrefsContent] = useState('');
  const [projects, setProjects] = useState<MemoryItem[]>([]);
  const [solutions, setSolutions] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ type: string; name: string } | null>(null);

  useEffect(() => {
    Promise.all([
      memoryApi.getPreferences(),
      memoryApi.listProjects(),
      memoryApi.listSolutions(),
    ]).then(([prefs, projs, sols]) => {
      setPrefsContent(prefs.content);
      setProjects(projs.items);
      setSolutions(sols.items);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSavePrefs = useCallback(async () => {
    try {
      await memoryApi.putPreferences(prefsContent);
      setToast('已儲存');
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast('儲存失敗');
      setTimeout(() => setToast(null), 2000);
    }
  }, [prefsContent]);

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
      setToast('已刪除');
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast('刪除失敗');
      setTimeout(() => setToast(null), 2000);
    }
    setConfirmDelete(null);
  }, [confirmDelete]);

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
      setToast('已儲存');
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast('儲存失敗');
      setTimeout(() => setToast(null), 2000);
    }
  }, [editContent]);

  if (loading) return <div className="text-text-secondary text-sm">Loading...</div>;

  return (
    <div className="flex flex-col gap-4">
      {/* Preferences */}
      <section>
        <h3 className="text-xs font-semibold text-text-secondary uppercase mb-2">Preferences</h3>
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
          Save
        </button>
      </section>

      {/* Projects */}
      <section>
        <h3 className="text-xs font-semibold text-text-secondary uppercase mb-2">Projects</h3>
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
                  Save
                </button>
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Solutions */}
      <section>
        <h3 className="text-xs font-semibold text-text-secondary uppercase mb-2">Solutions</h3>
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
                  Save
                </button>
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" data-testid="delete-confirm-dialog">
          <div className="bg-bg-primary rounded-xl border border-border p-6 shadow-lg max-w-sm mx-4">
            <p className="text-sm text-text-primary mb-4">確定要刪除此項目嗎？</p>
            <div className="flex gap-2 justify-end">
              <button
                data-testid="delete-cancel"
                onClick={() => setConfirmDelete(null)}
                className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-bg-tertiary"
              >
                取消
              </button>
              <button
                data-testid="delete-confirm"
                onClick={handleDeleteConfirm}
                className="px-3 py-1.5 text-xs font-medium bg-error text-white rounded-lg hover:bg-error/90"
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <span className="text-xs text-text-secondary">{toast}</span>}
    </div>
  );
}
