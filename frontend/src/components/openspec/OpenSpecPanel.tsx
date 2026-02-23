import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { useAppStore } from '../../store';
import { openspecApi } from '../../lib/openspec-api';
import type {
  OverviewData,
  ChangeListItem,
  ChangeDetail,
  SpecListItem,
  SpecFileContent,
  ArchivedItem,
} from '../../lib/openspec-api';
import { OpenSpecHeader } from './OpenSpecHeader';
import { OpenSpecNavTabs } from './OpenSpecNavTabs';
import type { OpenSpecTabId } from './OpenSpecNavTabs';
import { OpenSpecOverview } from './OpenSpecOverview';
import { OpenSpecChanges } from './OpenSpecChanges';
import { OpenSpecChangeDetail } from './OpenSpecChangeDetail';
import { OpenSpecSpecs } from './OpenSpecSpecs';
import { OpenSpecArchived } from './OpenSpecArchived';
import { Markdown } from '../shared/Markdown';

interface OpenSpecPanelProps {
  open: boolean;
  onClose: () => void;
}

export function OpenSpecPanel({ open, onClose }: OpenSpecPanelProps) {
  const { t } = useTranslation();

  // ── Active tab CWD ────────────────────────────────────────────────────────
  const activeTabId = useAppStore((s) => s.activeTabId);
  const tabs = useAppStore((s) => s.tabs);
  const conversations = useAppStore((s) => s.conversations);

  const activeCwd = useMemo(() => {
    if (!activeTabId) return undefined;
    const tab = tabs[activeTabId];
    if (!tab?.conversationId) return undefined;
    const conv = conversations.find((c) => c.id === tab.conversationId);
    return conv?.cwd || undefined;
  }, [activeTabId, tabs, conversations]);

  // Navigation
  const [activeTab, setActiveTab] = useState<OpenSpecTabId>('overview');
  const [selectedChangeName, setSelectedChangeName] = useState<string | null>(null);
  const [selectedSpecName, setSelectedSpecName] = useState<string | null>(null);

  // Data
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [changes, setChanges] = useState<ChangeListItem[]>([]);
  const [changeDetail, setChangeDetail] = useState<ChangeDetail | null>(null);
  const [specs, setSpecs] = useState<SpecListItem[]>([]);
  const [specContent, setSpecContent] = useState<SpecFileContent | null>(null);
  const [archived, setArchived] = useState<ArchivedItem[]>([]);

  // ── Data Fetching ───────────────────────────────────────────────────────

  const loadOverview = useCallback(async (cwd?: string) => {
    try {
      const data = await openspecApi.getOverview(cwd);
      setOverview(data);
    } catch (err) {
      console.warn('Failed to load OpenSpec overview:', err);
    }
  }, []);

  const loadChanges = useCallback(async (cwd?: string) => {
    try {
      const data = await openspecApi.listChanges(cwd);
      setChanges(data);
    } catch (err) {
      console.warn('Failed to load OpenSpec changes:', err);
    }
  }, []);

  const loadSpecs = useCallback(async (cwd?: string) => {
    try {
      const data = await openspecApi.listSpecs(cwd);
      setSpecs(data);
    } catch (err) {
      console.warn('Failed to load OpenSpec specs:', err);
    }
  }, []);

  const loadArchived = useCallback(async (cwd?: string) => {
    try {
      const data = await openspecApi.listArchived(cwd);
      setArchived(data);
    } catch (err) {
      console.warn('Failed to load OpenSpec archived:', err);
    }
  }, []);

  const loadChangeDetail = useCallback(async (name: string, cwd?: string) => {
    try {
      const data = await openspecApi.getChange(name, cwd);
      setChangeDetail(data);
    } catch (err) {
      console.warn('Failed to load change detail:', err);
    }
  }, []);

  const loadSpecContent = useCallback(async (name: string, cwd?: string) => {
    try {
      const data = await openspecApi.getSpecFile(name, cwd);
      setSpecContent(data);
    } catch (err) {
      console.warn('Failed to load spec file:', err);
    }
  }, []);

  // ── Refresh All ─────────────────────────────────────────────────────────

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadOverview(activeCwd),
        loadChanges(activeCwd),
        loadSpecs(activeCwd),
        loadArchived(activeCwd),
      ]);
    } finally {
      setLoading(false);
    }
  }, [loadOverview, loadChanges, loadSpecs, loadArchived, activeCwd]);

  // Initial load when panel opens
  useEffect(() => {
    if (open) {
      refreshAll();
    }
  }, [open, refreshAll]);

  // Auto-refresh when CWD changes while panel is open
  const prevCwdRef = useRef(activeCwd);
  useEffect(() => {
    if (open && activeCwd !== prevCwdRef.current) {
      prevCwdRef.current = activeCwd;
      refreshAll();
    }
  }, [open, activeCwd, refreshAll]);

  // Load detail when a change is selected
  useEffect(() => {
    if (selectedChangeName) {
      setChangeDetail(null);
      loadChangeDetail(selectedChangeName, activeCwd);
    }
  }, [selectedChangeName, loadChangeDetail, activeCwd]);

  // Load spec content when a spec is selected
  useEffect(() => {
    if (selectedSpecName) {
      setSpecContent(null);
      loadSpecContent(selectedSpecName, activeCwd);
    }
  }, [selectedSpecName, loadSpecContent, activeCwd]);

  // Escape key handler
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedChangeName) {
          setSelectedChangeName(null);
        } else if (selectedSpecName) {
          setSelectedSpecName(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, selectedChangeName, selectedSpecName]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleTaskToggle = useCallback(
    async (taskLine: string, checked: boolean) => {
      if (!selectedChangeName) return;
      try {
        const result = await openspecApi.updateTask(selectedChangeName, taskLine, checked, activeCwd);
        // Optimistic: reload detail
        if (result.ok) {
          await loadChangeDetail(selectedChangeName, activeCwd);
          // Also refresh changes list and overview for counts
          loadChanges(activeCwd);
          loadOverview(activeCwd);
        }
      } catch (err) {
        console.warn('Failed to toggle task:', err);
      }
    },
    [selectedChangeName, loadChangeDetail, loadChanges, loadOverview, activeCwd],
  );

  const handleArchive = useCallback(async () => {
    if (!selectedChangeName) return;
    try {
      await openspecApi.archiveChange(selectedChangeName, activeCwd);
      setSelectedChangeName(null);
      refreshAll();
    } catch (err) {
      console.warn('Failed to archive change:', err);
    }
  }, [selectedChangeName, refreshAll, activeCwd]);

  const handleDelete = useCallback(async () => {
    if (!selectedChangeName) return;
    try {
      await openspecApi.deleteChange(selectedChangeName, activeCwd);
      setSelectedChangeName(null);
      refreshAll();
    } catch (err) {
      console.warn('Failed to delete change:', err);
    }
  }, [selectedChangeName, refreshAll, activeCwd]);

  const handleBatchToggle = useCallback(
    async (tasks: { taskLine: string; checked: boolean }[]) => {
      if (!selectedChangeName || tasks.length === 0) return;
      try {
        for (const task of tasks) {
          await openspecApi.updateTask(selectedChangeName, task.taskLine, task.checked, activeCwd);
        }
        await loadChangeDetail(selectedChangeName, activeCwd);
        loadChanges(activeCwd);
        loadOverview(activeCwd);
      } catch (err) {
        console.warn('Failed to batch toggle tasks:', err);
      }
    },
    [selectedChangeName, loadChangeDetail, loadChanges, loadOverview, activeCwd],
  );

  const handleTabChange = useCallback((tab: OpenSpecTabId) => {
    setActiveTab(tab);
    setSelectedChangeName(null);
    setSelectedSpecName(null);
  }, []);

  // ── Path indicator ────────────────────────────────────────────────────────

  const resolvedPath = overview?.resolvedPath ?? null;
  const noOpenspecAtCwd = overview && resolvedPath === null && !!activeCwd;
  const isUsingProjectCwd = resolvedPath && activeCwd && resolvedPath.startsWith(activeCwd);

  // ── Render ──────────────────────────────────────────────────────────────

  if (!open) return null;

  // Determine content to render
  const renderContent = () => {
    // Change detail view
    if (selectedChangeName) {
      return (
        <OpenSpecChangeDetail
          change={changeDetail}
          onBack={() => setSelectedChangeName(null)}
          onTaskToggle={handleTaskToggle}
          onBatchToggle={handleBatchToggle}
          onArchive={handleArchive}
          onDelete={handleDelete}
        />
      );
    }

    // Spec content view
    if (selectedSpecName) {
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
            <button
              onClick={() => setSelectedSpecName(null)}
              className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-secondary"
              aria-label={t('openspecPanel.back', 'Back')}
            >
              <ArrowLeft size={14} />
            </button>
            <p className="text-sm font-medium text-text-primary truncate">
              {specContent?.name ?? selectedSpecName}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 prose-sm">
            {specContent ? (
              <Markdown content={specContent.content} />
            ) : (
              <div className="flex items-center justify-center py-12 text-text-muted text-sm">
                {t('openspecPanel.loading', 'Loading...')}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Tab views
    switch (activeTab) {
      case 'overview':
        return <OpenSpecOverview overview={overview} onNavigate={(tab) => handleTabChange(tab as OpenSpecTabId)} />;
      case 'changes':
        return (
          <OpenSpecChanges
            changes={changes}
            onSelect={setSelectedChangeName}
            onRefresh={() => loadChanges(activeCwd)}
          />
        );
      case 'specs':
        return <OpenSpecSpecs specs={specs} onSelect={setSelectedSpecName} />;
      case 'archived':
        return <OpenSpecArchived archived={archived} onSelect={setSelectedChangeName} />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40 md:hidden"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel — full overlay on mobile, left side panel on desktop */}
      <div
        data-testid="openspec-panel"
        className="
          fixed inset-0 z-50
          md:relative md:inset-auto md:z-auto
          md:w-[420px] md:min-w-[340px] md:shrink-0
          h-full
          bg-bg-primary
          md:border-r md:border-border
          flex flex-col
        "
      >
        <OpenSpecHeader onClose={onClose} onRefresh={refreshAll} loading={loading} />

        {/* Resolved path indicator */}
        {(resolvedPath || noOpenspecAtCwd) && (
          <div className="px-4 py-1.5 border-b border-border flex items-center gap-1.5 text-[11px] text-text-muted">
            <FolderOpen size={11} className="shrink-0" />
            <span className="truncate" title={resolvedPath || activeCwd || ''}>
              {resolvedPath || activeCwd}
            </span>
            <span className={`shrink-0 px-1 py-0.5 rounded text-[9px] font-medium ${
              noOpenspecAtCwd
                ? 'bg-orange-500/10 text-orange-500'
                : isUsingProjectCwd
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-text-muted/10 text-text-muted'
            }`}>
              {noOpenspecAtCwd
                ? t('openspecPanel.notFound', 'Not found')
                : isUsingProjectCwd
                  ? t('openspecPanel.usingProject', 'Project')
                  : t('openspecPanel.usingDefault', 'Default')}
            </span>
          </div>
        )}

        {/* No OpenSpec found at CWD — empty state */}
        {noOpenspecAtCwd ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
            <FolderOpen size={32} className="text-text-muted/40 mb-3" />
            <p className="text-sm font-medium text-text-primary mb-1">
              {t('openspecPanel.noOpenspec', 'No OpenSpec found')}
            </p>
            <p className="text-xs text-text-muted leading-relaxed">
              {t('openspecPanel.noOpenspecDesc', 'No openspec/ directory was found at the current working directory or any parent directory. Change CWD to a project with OpenSpec, or run "openspec init" to initialize.')}
            </p>
          </div>
        ) : (
          <>
            {/* Only show nav tabs when not in a detail view */}
            {!selectedChangeName && !selectedSpecName && (
              <OpenSpecNavTabs activeTab={activeTab} onTabChange={handleTabChange} />
            )}

            {/* Content area */}
            <div className="flex-1 min-h-0 overflow-y-auto">{renderContent()}</div>
          </>
        )}
      </div>

    </>
  );
}
