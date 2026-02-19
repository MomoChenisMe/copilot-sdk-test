import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { cronApi } from '../../lib/api';
import type { CronJob, CronHistory } from '../../lib/api';
import { ToggleSwitch } from '../shared/ToggleSwitch';

export function CronTab() {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [history, setHistory] = useState<CronHistory[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'ai' | 'shell'>('ai');
  const [formScheduleType, setFormScheduleType] = useState<'cron' | 'interval' | 'once'>('cron');
  const [formScheduleValue, setFormScheduleValue] = useState('');
  const [formPrompt, setFormPrompt] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formCommand, setFormCommand] = useState('');

  const fetchJobs = useCallback(async () => {
    try {
      const res = await cronApi.listJobs();
      setJobs(res.jobs);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const resetForm = useCallback(() => {
    setFormName('');
    setFormType('ai');
    setFormScheduleType('cron');
    setFormScheduleValue('');
    setFormPrompt('');
    setFormModel('');
    setFormCommand('');
  }, []);

  const handleCreateJob = useCallback(async () => {
    if (!formName.trim()) return;

    const config: Record<string, unknown> = {};
    if (formType === 'ai') {
      config.prompt = formPrompt;
      config.model = formModel;
    } else {
      config.command = formCommand;
    }

    try {
      const res = await cronApi.createJob({
        name: formName.trim(),
        type: formType,
        scheduleType: formScheduleType,
        scheduleValue: formScheduleValue.trim(),
        config,
        enabled: true,
      });
      setJobs((prev) => [...prev, res.job]);
      resetForm();
      setShowForm(false);
    } catch {
      // ignore
    }
  }, [formName, formType, formScheduleType, formScheduleValue, formPrompt, formModel, formCommand, resetForm]);

  const handleDeleteJob = useCallback(async (id: string) => {
    try {
      await cronApi.deleteJob(id);
      setJobs((prev) => prev.filter((j) => j.id !== id));
      setConfirmDeleteId(null);
    } catch {
      // ignore
    }
  }, []);

  const handleTriggerJob = useCallback(async (id: string) => {
    try {
      await cronApi.triggerJob(id);
    } catch {
      // ignore
    }
  }, []);

  const handleToggleEnabled = useCallback(async (job: CronJob) => {
    try {
      const res = await cronApi.updateJob(job.id, { enabled: !job.enabled });
      setJobs((prev) => prev.map((j) => (j.id === job.id ? res.job : j)));
    } catch {
      // ignore
    }
  }, []);

  const handleViewHistory = useCallback(async (id: string) => {
    if (expandedHistory === id) {
      setExpandedHistory(null);
      return;
    }
    setExpandedHistory(id);
    try {
      const res = await cronApi.getHistory(id);
      setHistory(res.history);
    } catch {
      setHistory([]);
    }
  }, [expandedHistory]);

  if (loading) {
    return <div className="text-text-secondary text-sm">{t('settings.loading')}</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-text-secondary uppercase">
          {t('cron.title')}
        </h3>
        <button
          data-testid="cron-add-job-button"
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90"
        >
          {t('cron.addJob')}
        </button>
      </div>

      {/* Add job form */}
      {showForm && (
        <div className="border border-border rounded-lg p-3 flex flex-col gap-2">
          <label className="text-xs font-medium text-text-secondary">{t('cron.name')}</label>
          <input
            data-testid="cron-form-name"
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="w-full p-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary"
          />

          <label className="text-xs font-medium text-text-secondary">{t('cron.type')}</label>
          <select
            data-testid="cron-form-type"
            value={formType}
            onChange={(e) => setFormType(e.target.value as 'ai' | 'shell')}
            className="w-full p-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary"
          >
            <option value="ai">{t('cron.typeAi')}</option>
            <option value="shell">{t('cron.typeShell')}</option>
          </select>

          <label className="text-xs font-medium text-text-secondary">{t('cron.scheduleType')}</label>
          <select
            data-testid="cron-form-schedule-type"
            value={formScheduleType}
            onChange={(e) => setFormScheduleType(e.target.value as 'cron' | 'interval' | 'once')}
            className="w-full p-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary"
          >
            <option value="cron">{t('cron.scheduleCron')}</option>
            <option value="interval">{t('cron.scheduleInterval')}</option>
            <option value="once">{t('cron.scheduleOnce')}</option>
          </select>

          <label className="text-xs font-medium text-text-secondary">{t('cron.scheduleValue')}</label>
          <input
            data-testid="cron-form-schedule-value"
            type="text"
            value={formScheduleValue}
            onChange={(e) => setFormScheduleValue(e.target.value)}
            className="w-full p-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary"
          />

          {formType === 'ai' && (
            <>
              <label className="text-xs font-medium text-text-secondary">{t('cron.prompt')}</label>
              <textarea
                data-testid="cron-form-prompt"
                value={formPrompt}
                onChange={(e) => setFormPrompt(e.target.value)}
                className="w-full h-20 p-2 text-sm bg-bg-secondary border border-border rounded-lg resize-y text-text-primary"
              />

              <label className="text-xs font-medium text-text-secondary">{t('cron.model')}</label>
              <input
                data-testid="cron-form-model"
                type="text"
                value={formModel}
                onChange={(e) => setFormModel(e.target.value)}
                className="w-full p-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary"
              />
            </>
          )}

          {formType === 'shell' && (
            <>
              <label className="text-xs font-medium text-text-secondary">{t('cron.command')}</label>
              <input
                data-testid="cron-form-command"
                type="text"
                value={formCommand}
                onChange={(e) => setFormCommand(e.target.value)}
                className="w-full p-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary"
              />
            </>
          )}

          <div className="flex gap-2">
            <button
              data-testid="cron-form-submit"
              onClick={handleCreateJob}
              className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90"
            >
              {t('cron.save')}
            </button>
            <button
              data-testid="cron-form-cancel"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-bg-tertiary text-text-secondary"
            >
              {t('cron.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {jobs.length === 0 && (
        <div className="text-sm text-text-secondary text-center py-8">
          {t('cron.noJobs')}
        </div>
      )}

      {/* Job list */}
      {jobs.map((job) => (
        <div
          key={job.id}
          className="border border-border rounded-lg overflow-hidden"
        >
          <div className="flex items-center gap-2 px-3 py-2">
            {/* Toggle enabled */}
            <ToggleSwitch
              data-testid={`job-toggle-${job.id}`}
              checked={job.enabled}
              onChange={() => handleToggleEnabled(job)}
            />

            {/* Job name */}
            <span className="flex-1 text-sm text-text-primary font-medium">
              {job.name}
            </span>

            {/* Type badge */}
            <span
              data-testid={`job-type-${job.id}`}
              className="px-1.5 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded"
            >
              {job.type === 'ai' ? t('cron.typeAi') : t('cron.typeShell')}
            </span>

            {/* Schedule info */}
            <span
              data-testid={`job-schedule-${job.id}`}
              className="text-xs text-text-secondary font-mono"
            >
              {job.scheduleValue}
            </span>

            {/* Last run */}
            <span
              data-testid={`job-lastrun-${job.id}`}
              className="text-xs text-text-secondary"
            >
              {t('cron.lastRun')}: {job.lastRun ? new Date(job.lastRun).toLocaleString() : t('cron.never')}
            </span>

            {/* History button */}
            <button
              data-testid={`job-history-${job.id}`}
              onClick={() => handleViewHistory(job.id)}
              className="px-2 py-1 text-xs text-text-secondary hover:text-accent hover:bg-bg-tertiary rounded"
            >
              {t('cron.history')}
            </button>

            {/* Trigger button */}
            <button
              data-testid={`job-trigger-${job.id}`}
              onClick={() => handleTriggerJob(job.id)}
              className="px-2 py-1 text-xs text-text-secondary hover:text-accent hover:bg-bg-tertiary rounded"
            >
              {t('cron.trigger')}
            </button>

            {/* Delete button */}
            {confirmDeleteId === job.id ? (
              <button
                data-testid={`job-confirm-delete-${job.id}`}
                onClick={() => handleDeleteJob(job.id)}
                className="px-2 py-1 text-xs text-error hover:bg-error/10 rounded font-medium"
              >
                {t('cron.confirmDelete')}
              </button>
            ) : (
              <button
                data-testid={`job-delete-${job.id}`}
                onClick={() => setConfirmDeleteId(job.id)}
                className="px-2 py-1 text-xs text-text-secondary hover:text-error hover:bg-bg-tertiary rounded"
              >
                {t('cron.delete')}
              </button>
            )}
          </div>

          {/* Expanded history section */}
          {expandedHistory === job.id && (
            <div className="px-3 pb-3 border-t border-border-subtle">
              <h4 className="text-xs font-medium text-text-secondary mt-2 mb-1">
                {t('cron.history')}
              </h4>
              <div className="flex flex-col gap-1">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-2 px-2 py-1 rounded bg-bg-secondary"
                  >
                    <span
                      className={`text-xs font-medium ${
                        entry.status === 'success'
                          ? 'text-emerald-500'
                          : entry.status === 'error'
                            ? 'text-error'
                            : 'text-amber-500'
                      }`}
                    >
                      {entry.status === 'success'
                        ? t('cron.status.success')
                        : entry.status === 'error'
                          ? t('cron.status.error')
                          : t('cron.status.timeout')}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {new Date(entry.startedAt).toLocaleString()}
                    </span>
                    {entry.output && (
                      <span className="text-xs text-text-secondary truncate flex-1">
                        {entry.output}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
