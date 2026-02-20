import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CronJobList } from './CronJobList';
import { CronJobForm } from './CronJobForm';
import { CronHistoryList } from './CronHistoryList';
import { useAppStore } from '../../store';
import { cronApi } from '../../lib/api';
import type { CronJob } from '../../lib/api';

interface CronPageProps {
  onOpenConversation?: (conversationId: string) => void;
}

export function CronPage({ onOpenConversation }: CronPageProps) {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const cronRefreshTrigger = useAppStore((s) => s.cronRefreshTrigger);

  // Auto-refresh when WebSocket cron events arrive
  useEffect(() => {
    if (cronRefreshTrigger > 0) {
      setRefreshKey((k) => k + 1);
    }
  }, [cronRefreshTrigger]);

  const handleCreate = () => {
    setEditingJob(null);
    setShowForm(true);
  };

  const handleEdit = (job: CronJob) => {
    setEditingJob(job);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingJob(null);
  };

  const handleFormSaved = () => {
    setShowForm(false);
    setEditingJob(null);
    setRefreshKey((k) => k + 1);
  };

  const handleClearAll = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    try {
      await cronApi.clearHistory();
      setConfirmClear(false);
      setRefreshKey((k) => k + 1);
    } catch { /* silent */ }
  };

  const handleKeepRecent = async (count: number) => {
    try {
      await cronApi.clearHistory(count);
      setRefreshKey((k) => k + 1);
    } catch { /* silent */ }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 md:p-6 flex flex-col gap-6">
        {/* Jobs section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-text-secondary uppercase">
              {t('cron.title')}
            </h3>
            <button
              onClick={handleCreate}
              className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90"
            >
              {t('cron.addJob')}
            </button>
          </div>

          {showForm && (
            <CronJobForm
              job={editingJob}
              onClose={handleFormClose}
              onSaved={handleFormSaved}
            />
          )}

          <CronJobList
            key={`jobs-${refreshKey}`}
            onEdit={handleEdit}
            onRefresh={() => setRefreshKey((k) => k + 1)}
          />
        </div>

        {/* History section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-text-secondary uppercase">
              {t('cron.executionHistory')}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleKeepRecent(10)}
                className="px-2 py-1 text-xs text-text-secondary hover:text-accent hover:bg-bg-tertiary rounded"
              >
                {t('cron.keepRecent', { count: 10 })}
              </button>
              {confirmClear ? (
                <button
                  onClick={handleClearAll}
                  className="px-2 py-1 text-xs text-error hover:bg-error/10 rounded font-medium"
                >
                  {t('cron.confirmDeleteEntry')}
                </button>
              ) : (
                <button
                  onClick={handleClearAll}
                  className="px-2 py-1 text-xs text-text-secondary hover:text-error hover:bg-bg-tertiary rounded"
                >
                  {t('cron.clearAll')}
                </button>
              )}
            </div>
          </div>
          <CronHistoryList
            key={`history-${refreshKey}`}
            onOpenConversation={onOpenConversation}
          />
        </div>
      </div>
    </div>
  );
}
