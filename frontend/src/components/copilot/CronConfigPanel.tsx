import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, X, ChevronDown } from 'lucide-react';
import { conversationApi } from '../../lib/api';
import type { Conversation } from '../../lib/api';
import { useAppStore } from '../../store';

interface CronConfigPanelProps {
  conversationId: string;
  tabId: string;
  onClose: () => void;
  onSaved?: () => void;
}

function getMultiplierStyle(multiplier: number | null | undefined) {
  if (multiplier == null) return null;
  if (multiplier === 0) return { text: '0x', color: 'text-green-500' };
  if (multiplier < 1) return { text: `${multiplier}x`, color: 'text-green-500' };
  if (multiplier === 1) return { text: '1x', color: 'text-text-muted' };
  if (multiplier >= 9) return { text: `${multiplier}x`, color: 'text-red-500' };
  return { text: `${multiplier}x`, color: 'text-amber-500' };
}

export function CronConfigPanel({ conversationId, tabId, onClose, onSaved }: CronConfigPanelProps) {
  const { t } = useTranslation();
  const addToast = useAppStore((s) => s.addToast);
  const models = useAppStore((s) => s.models);

  const [enabled, setEnabled] = useState(false);
  const [scheduleType, setScheduleType] = useState<'cron' | 'interval'>('cron');
  const [scheduleValue, setScheduleValue] = useState('');
  const [prompt, setPrompt] = useState('');
  const [cronModel, setCronModel] = useState<string>('');
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [scheduleTypeDropdownOpen, setScheduleTypeDropdownOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const scheduleTypeDropdownRef = useRef<HTMLDivElement>(null);

  // Load current cron config
  useEffect(() => {
    conversationApi.getById(conversationId).then((conv: Conversation) => {
      setEnabled(conv.cronEnabled);
      setScheduleType(conv.cronScheduleType ?? 'cron');
      setScheduleValue(conv.cronScheduleValue ?? '');
      setPrompt(conv.cronPrompt ?? '');
      setCronModel(conv.cronModel ?? '');
      setLoaded(true);
    }).catch(() => {
      setLoaded(true);
    });
  }, [conversationId]);

  // Click-outside for dropdowns
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
      setModelDropdownOpen(false);
    }
    if (scheduleTypeDropdownRef.current && !scheduleTypeDropdownRef.current.contains(e.target as Node)) {
      setScheduleTypeDropdownOpen(false);
    }
  }, []);

  useEffect(() => {
    if (modelDropdownOpen || scheduleTypeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [modelDropdownOpen, scheduleTypeDropdownOpen, handleClickOutside]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await conversationApi.updateCron(conversationId, {
        cronEnabled: enabled,
        cronScheduleType: scheduleType,
        cronScheduleValue: scheduleValue,
        cronPrompt: prompt,
        cronModel: cronModel || null,
      });
      addToast({
        type: 'success',
        title: t('cron.saved', 'Cron saved'),
      });
      onSaved?.();
      onClose();
    } catch {
      addToast({
        type: 'error',
        title: t('cron.saveFailed', 'Failed to save cron'),
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedModelObj = cronModel ? models.find((m) => m.id === cronModel) : null;
  const selectedModelName = selectedModelObj?.name || t('cron.useConversationModel', 'Use conversation model');
  const selectedMultiplierStyle = getMultiplierStyle(selectedModelObj?.premiumMultiplier);

  if (!loaded) return null;

  return (
    <div className="border border-border rounded-xl bg-bg-elevated p-4 mb-3 shadow-[var(--shadow-sm)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <Clock size={16} className="text-accent" />
          {t('cron.configTitle', 'Scheduled Task')}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-bg-tertiary text-text-muted transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Enable toggle */}
      <div className="flex items-center gap-3 mb-3">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-bg-tertiary rounded-full peer peer-checked:bg-accent transition-colors" />
          <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
        </label>
        <span className="text-sm text-text-secondary">
          {enabled ? t('cron.enable', 'Enable') : t('cron.disable', 'Disable')}
        </span>
      </div>

      {enabled && (
        <>
          {/* Model selector — custom dropdown */}
          <div className="mb-3">
            <label className="block text-xs text-text-muted mb-1">
              {t('usage.model', 'Model')}
            </label>
            <div className="relative" ref={modelDropdownRef}>
              <button
                type="button"
                onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-sm rounded-lg border border-border bg-bg-input text-text-primary hover:bg-bg-tertiary transition-colors"
              >
                <span className="flex items-center gap-2 truncate">
                  <span className={`truncate ${!cronModel ? 'text-text-muted' : ''}`}>{selectedModelName}</span>
                  {selectedMultiplierStyle && (
                    <span className={`shrink-0 text-xs font-medium ${selectedMultiplierStyle.color}`}>
                      {selectedMultiplierStyle.text}
                    </span>
                  )}
                </span>
                <ChevronDown size={14} className={`shrink-0 text-text-muted transition-transform ${modelDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {modelDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full max-h-60 overflow-y-auto bg-bg-elevated border border-border rounded-xl shadow-[var(--shadow-lg)] z-50">
                  <div className="px-3 py-2 text-xs font-semibold text-text-muted border-b border-border">
                    {t('model.sourceTitle', 'GitHub Copilot Models')}
                  </div>
                  {/* Default: use conversation model */}
                  <button
                    onClick={() => { setCronModel(''); setModelDropdownOpen(false); }}
                    className={`w-full flex items-center px-3 py-2 text-sm transition-colors ${
                      !cronModel ? 'text-accent bg-accent-soft' : 'text-text-muted hover:bg-bg-tertiary'
                    }`}
                  >
                    <span className="truncate italic">{t('cron.useConversationModel', 'Use conversation model')}</span>
                  </button>
                  {models.map((model) => {
                    const isActive = model.id === cronModel;
                    const ms = getMultiplierStyle(model.premiumMultiplier);
                    return (
                      <button
                        key={model.id}
                        title={model.name}
                        onClick={() => { setCronModel(model.id); setModelDropdownOpen(false); }}
                        className={`w-full flex items-center px-3 py-2 text-sm transition-colors ${
                          isActive ? 'text-accent bg-accent-soft' : 'text-text-primary hover:bg-bg-tertiary'
                        }`}
                      >
                        <span className="truncate">{model.name}</span>
                        {ms && (
                          <span className={`ml-auto shrink-0 text-xs font-medium ${ms.color}`}>
                            {ms.text}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Schedule type — custom dropdown */}
          <div className="mb-3">
            <label className="block text-xs text-text-muted mb-1">
              {t('cron.scheduleType', 'Schedule Type')}
            </label>
            <div className="relative" ref={scheduleTypeDropdownRef}>
              <button
                type="button"
                onClick={() => setScheduleTypeDropdownOpen(!scheduleTypeDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-sm rounded-lg border border-border bg-bg-input text-text-primary hover:bg-bg-tertiary transition-colors"
              >
                <span className="truncate">
                  {scheduleType === 'cron' ? t('cron.cronExpression', 'Cron Expression') : t('cron.interval', 'Interval')}
                </span>
                <ChevronDown size={14} className={`shrink-0 text-text-muted transition-transform ${scheduleTypeDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {scheduleTypeDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-bg-elevated border border-border rounded-xl shadow-[var(--shadow-lg)] z-50">
                  {([
                    { value: 'cron' as const, label: t('cron.cronExpression', 'Cron Expression') },
                    { value: 'interval' as const, label: t('cron.interval', 'Interval') },
                  ]).map((option) => {
                    const isActive = scheduleType === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => { setScheduleType(option.value); setScheduleTypeDropdownOpen(false); }}
                        className={`w-full flex items-center px-3 py-2 text-sm transition-colors first:rounded-t-xl last:rounded-b-xl ${
                          isActive ? 'text-accent bg-accent-soft' : 'text-text-primary hover:bg-bg-tertiary'
                        }`}
                      >
                        <span className="truncate">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Schedule value */}
          <div className="mb-3">
            <label className="block text-xs text-text-muted mb-1">
              {t('cron.scheduleValue', 'Schedule Value')}
            </label>
            <input
              type="text"
              value={scheduleValue}
              onChange={(e) => setScheduleValue(e.target.value)}
              placeholder={scheduleType === 'cron' ? '*/5 * * * *' : '300000'}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-bg-input text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-border-focus"
            />
            <p className="text-xs text-text-muted mt-1">
              {scheduleType === 'cron'
                ? 'e.g. */5 * * * * (every 5 minutes)'
                : 'Milliseconds, e.g. 300000 (5 minutes)'}
            </p>
          </div>

          {/* Prompt */}
          <div className="mb-3">
            <label className="block text-xs text-text-muted mb-1">
              {t('cron.prompt', 'Prompt')}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder={t('cron.promptPlaceholder', 'Message to send on each trigger...')}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-bg-input text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-border-focus resize-none"
            />
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-sm rounded-lg border border-border text-text-secondary hover:bg-bg-tertiary transition-colors"
        >
          {t('cron.cancel', 'Cancel')}
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1.5 text-sm rounded-lg bg-accent text-text-inverse hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {saving ? '...' : t('cron.save', 'Save')}
        </button>
      </div>
    </div>
  );
}
