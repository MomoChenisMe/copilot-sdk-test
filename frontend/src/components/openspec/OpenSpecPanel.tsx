import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
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

  const loadOverview = useCallback(async () => {
    try {
      const data = await openspecApi.getOverview();
      setOverview(data);
    } catch (err) {
      console.warn('Failed to load OpenSpec overview:', err);
    }
  }, []);

  const loadChanges = useCallback(async () => {
    try {
      const data = await openspecApi.listChanges();
      setChanges(data);
    } catch (err) {
      console.warn('Failed to load OpenSpec changes:', err);
    }
  }, []);

  const loadSpecs = useCallback(async () => {
    try {
      const data = await openspecApi.listSpecs();
      setSpecs(data);
    } catch (err) {
      console.warn('Failed to load OpenSpec specs:', err);
    }
  }, []);

  const loadArchived = useCallback(async () => {
    try {
      const data = await openspecApi.listArchived();
      setArchived(data);
    } catch (err) {
      console.warn('Failed to load OpenSpec archived:', err);
    }
  }, []);

  const loadChangeDetail = useCallback(async (name: string) => {
    try {
      const data = await openspecApi.getChange(name);
      setChangeDetail(data);
    } catch (err) {
      console.warn('Failed to load change detail:', err);
    }
  }, []);

  const loadSpecContent = useCallback(async (name: string) => {
    try {
      const data = await openspecApi.getSpecFile(name);
      setSpecContent(data);
    } catch (err) {
      console.warn('Failed to load spec file:', err);
    }
  }, []);

  // ── Refresh All ─────────────────────────────────────────────────────────

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadOverview(), loadChanges(), loadSpecs(), loadArchived()]);
    } finally {
      setLoading(false);
    }
  }, [loadOverview, loadChanges, loadSpecs, loadArchived]);

  // Initial load when panel opens
  useEffect(() => {
    if (open) {
      refreshAll();
    }
  }, [open, refreshAll]);

  // Load detail when a change is selected
  useEffect(() => {
    if (selectedChangeName) {
      setChangeDetail(null);
      loadChangeDetail(selectedChangeName);
    }
  }, [selectedChangeName, loadChangeDetail]);

  // Load spec content when a spec is selected
  useEffect(() => {
    if (selectedSpecName) {
      setSpecContent(null);
      loadSpecContent(selectedSpecName);
    }
  }, [selectedSpecName, loadSpecContent]);

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
        const result = await openspecApi.updateTask(selectedChangeName, taskLine, checked);
        // Optimistic: reload detail
        if (result.ok) {
          await loadChangeDetail(selectedChangeName);
          // Also refresh changes list and overview for counts
          loadChanges();
          loadOverview();
        }
      } catch (err) {
        console.warn('Failed to toggle task:', err);
      }
    },
    [selectedChangeName, loadChangeDetail, loadChanges, loadOverview],
  );

  const handleArchive = useCallback(async () => {
    if (!selectedChangeName) return;
    try {
      await openspecApi.archiveChange(selectedChangeName);
      setSelectedChangeName(null);
      refreshAll();
    } catch (err) {
      console.warn('Failed to archive change:', err);
    }
  }, [selectedChangeName, refreshAll]);

  const handleDelete = useCallback(async () => {
    if (!selectedChangeName) return;
    try {
      await openspecApi.deleteChange(selectedChangeName);
      setSelectedChangeName(null);
      refreshAll();
    } catch (err) {
      console.warn('Failed to delete change:', err);
    }
  }, [selectedChangeName, refreshAll]);

  const handleTabChange = useCallback((tab: OpenSpecTabId) => {
    setActiveTab(tab);
    setSelectedChangeName(null);
    setSelectedSpecName(null);
  }, []);

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
          onArchive={handleArchive}
          onDelete={handleDelete}
        />
      );
    }

    // Spec content view
    if (selectedSpecName) {
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle shrink-0">
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
        return <OpenSpecOverview overview={overview} />;
      case 'changes':
        return (
          <OpenSpecChanges
            changes={changes}
            onSelect={setSelectedChangeName}
            onRefresh={loadChanges}
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
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        data-testid="openspec-panel"
        className={[
          'fixed top-0 right-0 z-40 flex flex-col bg-bg-secondary',
          // Mobile: full screen
          'inset-0 md:inset-auto',
          // Desktop: right panel
          'md:w-[420px] md:h-full md:border-l md:border-border-subtle',
          // Slide animation
          'animate-slide-in-right',
        ].join(' ')}
      >
        <OpenSpecHeader onClose={onClose} onRefresh={refreshAll} loading={loading} />

        {/* Only show nav tabs when not in a detail view */}
        {!selectedChangeName && !selectedSpecName && (
          <OpenSpecNavTabs activeTab={activeTab} onTabChange={handleTabChange} />
        )}

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">{renderContent()}</div>
      </div>

      {/* Slide-in animation keyframes (injected once) */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.2s ease-out;
        }
      `}</style>
    </>
  );
}
