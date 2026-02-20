import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cronApi } from '../../lib/api';
import type { CronHistoryWithJob } from '../../lib/api';
import { CronHistoryDetail } from './CronHistoryDetail';

interface CronHistoryListProps {
  onOpenConversation?: (conversationId: string) => void;
}

const POLL_INTERVAL_MS = 3000;

export function CronHistoryList({ onOpenConversation }: CronHistoryListProps) {
  const { t } = useTranslation();
  const [history, setHistory] = useState<CronHistoryWithJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadHistory = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const { history } = await cronApi.getRecentHistory(50);
      setHistory(history);
    } catch {
      // silent
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { loadHistory(true); }, [loadHistory]);

  // Auto-poll when any entry has status "running"
  const hasRunning = history.some((h) => h.status === 'running');

  useEffect(() => {
    if (hasRunning) {
      pollRef.current = setInterval(() => loadHistory(false), POLL_INTERVAL_MS);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [hasRunning, loadHistory]);

  const handleOpenConversation = async (historyId: string) => {
    if (!onOpenConversation) return;
    setOpeningId(historyId);
    try {
      const { conversation } = await cronApi.openAsConversation(historyId);
      onOpenConversation(conversation.id);
    } catch {
      // silent
    } finally {
      setOpeningId(null);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    try {
      await cronApi.deleteHistoryEntry(id);
      setConfirmDeleteId(null);
      if (expandedId === id) setExpandedId(null);
      setHistory((prev) => prev.filter((h) => h.id !== id));
    } catch { /* silent */ }
  };

  if (loading) {
    return <div className="text-sm text-text-secondary">{t('cron.loadingHistory')}</div>;
  }

  if (history.length === 0) {
    return (
      <div className="text-sm text-text-secondary text-center py-8">
        {t('cron.noHistory')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {history.map((h) => {
        const isExpanded = expandedId === h.id;

        return (
          <div key={h.id} className="border border-border rounded-lg overflow-hidden">
            <div
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-bg-tertiary transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : h.id)}
            >
              {/* Status indicator */}
              <span
                className={`text-xs font-medium ${
                  h.status === 'success'
                    ? 'text-emerald-500'
                    : h.status === 'error'
                      ? 'text-error'
                      : h.status === 'running'
                        ? 'text-accent'
                        : 'text-amber-500'
                }`}
              >
                {t(`cron.status.${h.status}`)}
              </span>

              <span className="flex-1 text-sm text-text-primary font-medium truncate">
                {h.jobName}
              </span>

              <span className="text-xs text-text-secondary">
                {new Date(h.startedAt).toLocaleString()}
              </span>

              {h.output && (
                <span className="text-xs text-text-secondary truncate max-w-48 hidden md:inline">
                  {h.output.slice(0, 80)}
                </span>
              )}

              {onOpenConversation && (
                <button
                  className="px-2 py-1 text-xs text-text-secondary hover:text-accent hover:bg-bg-tertiary rounded disabled:opacity-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenConversation(h.id);
                  }}
                  disabled={openingId === h.id}
                >
                  {openingId === h.id ? '...' : t('cron.openAsConversation')}
                </button>
              )}

              {confirmDeleteId === h.id ? (
                <button
                  className="px-2 py-1 text-xs text-error hover:bg-error/10 rounded font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteEntry(h.id);
                  }}
                >
                  {t('cron.confirmDeleteEntry')}
                </button>
              ) : (
                <button
                  className="px-2 py-1 text-xs text-text-secondary hover:text-error hover:bg-bg-tertiary rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteEntry(h.id);
                  }}
                >
                  {t('cron.deleteEntry')}
                </button>
              )}
            </div>

            {isExpanded && <CronHistoryDetail history={h} />}
          </div>
        );
      })}
    </div>
  );
}
