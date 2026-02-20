import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cronApi } from '../../lib/api';
import type { CronJob } from '../../lib/api';
import { useAppStore } from '../../store';
import { CustomSelect } from '../shared/CustomSelect';
import type { SelectOption } from '../shared/CustomSelect';
import { CronJobToolConfig } from './CronJobToolConfig';

interface CronJobFormProps {
  job: CronJob | null;
  onClose: () => void;
  onSaved: () => void;
}

function getMultiplierStyle(multiplier: number | null | undefined) {
  if (multiplier == null) return { text: '', color: '' };
  if (multiplier === 0) return { text: '0x', color: 'text-green-500' };
  if (multiplier < 1) return { text: `${multiplier}x`, color: 'text-green-500' };
  if (multiplier === 1) return { text: '1x', color: 'text-text-muted' };
  if (multiplier >= 9) return { text: `${multiplier}x`, color: 'text-red-500' };
  return { text: `${multiplier}x`, color: 'text-amber-500' };
}

export function CronJobForm({ job, onClose, onSaved }: CronJobFormProps) {
  const { t } = useTranslation();
  const isEdit = !!job;
  const [name, setName] = useState(job?.name || '');
  const [type, setType] = useState<'ai' | 'shell'>(job?.type || 'ai');
  const [scheduleType, setScheduleType] = useState<'cron' | 'interval' | 'once'>(job?.scheduleType || 'cron');
  const [scheduleValue, setScheduleValue] = useState(job?.scheduleValue || '0 9 * * 1-5');
  const [prompt, setPrompt] = useState((job?.config as any)?.prompt || '');
  const [command, setCommand] = useState((job?.config as any)?.command || '');
  const [model, setModel] = useState((job?.config as any)?.model || '');
  const [cwd, setCwd] = useState((job?.config as any)?.cwd || '');
  const [toolConfig, setToolConfig] = useState((job?.config as any)?.toolConfig || {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const models = useAppStore((s) => s.models);

  // Set default model if not set
  useEffect(() => {
    if (!model && models.length > 0) {
      setModel(models[0].id);
    }
  }, [model, models]);

  // Build option lists
  const typeOptions: SelectOption[] = [
    { value: 'ai', label: t('cron.typeAi') },
    { value: 'shell', label: t('cron.typeShell') },
  ];

  const scheduleTypeOptions: SelectOption[] = [
    { value: 'cron', label: t('cron.scheduleCron') },
    { value: 'interval', label: t('cron.scheduleInterval') },
    { value: 'once', label: t('cron.scheduleOnce') },
  ];

  const modelOptions: SelectOption[] = models.map((m) => {
    const ms = getMultiplierStyle(m.premiumMultiplier);
    return {
      value: m.id,
      label: m.name,
      badge: ms.text || undefined,
      badgeColor: ms.color || undefined,
    };
  });

  const handleSave = async () => {
    if (!name.trim()) {
      setError(t('cron.nameRequired'));
      return;
    }
    if (!scheduleValue.trim()) {
      setError(t('cron.scheduleRequired'));
      return;
    }

    const config: Record<string, unknown> = {};
    if (type === 'ai') {
      config.prompt = prompt;
      config.model = model;
      if (cwd) config.cwd = cwd;
      if (Object.keys(toolConfig).length > 0) config.toolConfig = toolConfig;
    } else {
      config.command = command;
      if (cwd) config.cwd = cwd;
    }

    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        await cronApi.updateJob(job!.id, { name, type, scheduleType, scheduleValue, config } as any);
      } else {
        await cronApi.createJob({ name, type, scheduleType, scheduleValue, config, enabled: true });
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || t('cron.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-border rounded-lg p-3 flex flex-col gap-2">
      {error && <div className="text-xs text-error">{error}</div>}

      <label className="text-xs font-medium text-text-secondary">{t('cron.name')}</label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full p-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary"
        placeholder="Daily disk check"
      />

      <label className="text-xs font-medium text-text-secondary">{t('cron.type')}</label>
      <CustomSelect
        value={type}
        options={typeOptions}
        onChange={(v) => setType(v as 'ai' | 'shell')}
      />

      <label className="text-xs font-medium text-text-secondary">{t('cron.scheduleType')}</label>
      <CustomSelect
        value={scheduleType}
        options={scheduleTypeOptions}
        onChange={(v) => setScheduleType(v as 'cron' | 'interval' | 'once')}
      />

      <label className="text-xs font-medium text-text-secondary">{t('cron.scheduleValue')}</label>
      <input
        type="text"
        value={scheduleValue}
        onChange={(e) => setScheduleValue(e.target.value)}
        className="w-full p-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary"
        placeholder={scheduleType === 'cron' ? '0 9 * * 1-5' : scheduleType === 'interval' ? '60000' : '2026-03-01T09:00:00Z'}
      />

      {type === 'ai' && (
        <>
          <label className="text-xs font-medium text-text-secondary">{t('cron.prompt')}</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-20 p-2 text-sm bg-bg-secondary border border-border rounded-lg resize-y text-text-primary"
            placeholder="Check disk usage and report issues"
          />

          <label className="text-xs font-medium text-text-secondary">{t('cron.model')}</label>
          <CustomSelect
            value={model}
            options={modelOptions}
            onChange={setModel}
            header={t('model.sourceTitle', 'Models')}
          />

          <label className="text-xs font-medium text-text-secondary">{t('cron.workingDirectory')}</label>
          <input
            type="text"
            value={cwd}
            onChange={(e) => setCwd(e.target.value)}
            className="w-full p-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary"
            placeholder="~/project"
          />

          <CronJobToolConfig config={toolConfig} onChange={setToolConfig} />
        </>
      )}

      {type === 'shell' && (
        <>
          <label className="text-xs font-medium text-text-secondary">{t('cron.command')}</label>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            className="w-full p-2 text-sm bg-bg-secondary border border-border rounded-lg font-mono text-text-primary"
            placeholder="df -h"
          />

          <label className="text-xs font-medium text-text-secondary">{t('cron.workingDirectory')}</label>
          <input
            type="text"
            value={cwd}
            onChange={(e) => setCwd(e.target.value)}
            className="w-full p-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary"
            placeholder="~/project"
          />
        </>
      )}

      <div className="flex gap-2 mt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50"
        >
          {saving ? t('cron.saving') : isEdit ? t('cron.update') : t('cron.save')}
        </button>
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-bg-tertiary text-text-secondary"
        >
          {t('cron.cancel')}
        </button>
      </div>
    </div>
  );
}
