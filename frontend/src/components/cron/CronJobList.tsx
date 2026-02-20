import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { cronApi } from '../../lib/api';
import type { CronJob } from '../../lib/api';
import { ToggleSwitch } from '../shared/ToggleSwitch';

interface CronJobListProps {
  onEdit: (job: CronJob) => void;
  onRefresh: () => void;
}

export function CronJobList({ onEdit, onRefresh }: CronJobListProps) {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    try {
      setLoading(true);
      const { jobs } = await cronApi.listJobs();
      setJobs(jobs);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const handleToggle = async (job: CronJob) => {
    try {
      await cronApi.updateJob(job.id, { enabled: !job.enabled } as any);
      loadJobs();
    } catch { /* silent */ }
  };

  const handleTrigger = async (id: string) => {
    try {
      await cronApi.triggerJob(id);
      // Refresh immediately to show 'running' entry, then again after delay for completion
      onRefresh();
      setTimeout(() => onRefresh(), 3000);
    } catch { /* silent */ }
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    try {
      await cronApi.deleteJob(id);
      setConfirmDeleteId(null);
      loadJobs();
      onRefresh();
    } catch { /* silent */ }
  };

  if (loading) {
    return <div className="text-sm text-text-secondary">{t('cron.loadingJobs')}</div>;
  }

  if (jobs.length === 0) {
    return (
      <div className="text-sm text-text-secondary text-center py-8">
        {t('cron.noJobs')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {jobs.map((job) => (
        <div
          key={job.id}
          className="border border-border rounded-lg overflow-hidden"
        >
          <div className="flex items-center gap-2 px-3 py-2">
            <ToggleSwitch checked={job.enabled} onChange={() => handleToggle(job)} />

            <span className="flex-1 text-sm text-text-primary font-medium truncate">
              {job.name}
            </span>

            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded">
              {job.type === 'ai' ? t('cron.typeAi') : t('cron.typeShell')}
            </span>

            <span className="text-xs text-text-secondary font-mono">
              {job.scheduleValue}
            </span>

            <span className="text-xs text-text-secondary hidden sm:inline">
              {t('cron.lastRun')}: {job.lastRun ? new Date(job.lastRun).toLocaleString() : t('cron.never')}
            </span>

            <button
              onClick={() => handleTrigger(job.id)}
              className="px-2 py-1 text-xs text-text-secondary hover:text-accent hover:bg-bg-tertiary rounded"
            >
              {t('cron.trigger')}
            </button>

            <button
              onClick={() => onEdit(job)}
              className="px-2 py-1 text-xs text-text-secondary hover:text-accent hover:bg-bg-tertiary rounded"
            >
              {t('cron.edit')}
            </button>

            {confirmDeleteId === job.id ? (
              <button
                onClick={() => handleDelete(job.id)}
                className="px-2 py-1 text-xs text-error hover:bg-error/10 rounded font-medium"
              >
                {t('cron.confirmDelete')}
              </button>
            ) : (
              <button
                onClick={() => handleDelete(job.id)}
                className="px-2 py-1 text-xs text-text-secondary hover:text-error hover:bg-bg-tertiary rounded"
              >
                {t('cron.delete')}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
