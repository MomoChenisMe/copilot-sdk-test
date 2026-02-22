import { useState, useEffect, useRef } from 'react';
import { SlidersHorizontal, X, ChevronDown, FolderOpen, Sparkles, TerminalSquare, Lightbulb, Zap, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store';
import { DirectoryPicker } from './DirectoryPicker';

interface MobileToolbarPopupProps {
  currentModel: string;
  onModelChange: (modelId: string) => void;
  currentCwd?: string;
  onCwdChange?: (newCwd: string) => void;
  tabMode: 'copilot' | 'terminal' | 'cron';
  onModeChange: (mode: 'copilot' | 'terminal') => void;
  tabId?: string | null;
  planMode: boolean;
  onPlanModeToggle: (newPlanMode: boolean) => void;
  isStreaming: boolean;
  webSearchForced: boolean;
  onWebSearchToggle: (forced: boolean) => void;
  webSearchAvailable: boolean;
}

function getMultiplierStyle(multiplier: number | null | undefined) {
  if (multiplier == null) return null;
  if (multiplier === 0) return { text: '0x', color: 'text-green-500' };
  if (multiplier < 1) return { text: `${multiplier}x`, color: 'text-green-500' };
  if (multiplier === 1) return { text: '1x', color: 'text-text-muted' };
  if (multiplier >= 9) return { text: `${multiplier}x`, color: 'text-red-500' };
  return { text: `${multiplier}x`, color: 'text-amber-500' };
}

export function MobileToolbarPopup({
  currentModel,
  onModelChange,
  currentCwd,
  onCwdChange,
  tabMode,
  onModeChange,
  tabId,
  planMode,
  onPlanModeToggle,
  isStreaming,
  webSearchForced,
  onWebSearchToggle,
  webSearchAvailable,
}: MobileToolbarPopupProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [modelListOpen, setModelListOpen] = useState(false);
  const [cwdPickerOpen, setCwdPickerOpen] = useState(false);
  const cwdContainerRef = useRef<HTMLDivElement>(null);
  const models = useAppStore((s) => s.models);

  const currentModelObj = models.find((m) => m.id === currentModel);
  const currentModelName = currentModelObj?.name || currentModel;
  const currentMultiplierStyle = getMultiplierStyle(currentModelObj?.premiumMultiplier);

  const cwdLast = currentCwd ? currentCwd.split('/').filter(Boolean).pop() || '/' : '';

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setModelListOpen(false); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className={`p-1.5 rounded-lg transition-colors ${
          open ? 'text-accent' : 'text-text-muted hover:text-text-primary'
        }`}
      >
        <SlidersHorizontal size={14} />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[90] bg-black/30"
          onClick={() => { setOpen(false); setModelListOpen(false); }}
        />
      )}

      {/* Bottom sheet */}
      {open && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-bg-primary border-t border-border rounded-t-2xl shadow-lg px-5 pt-3 pb-8">
          {/* Handle bar + close */}
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>
          <button
            onClick={() => { setOpen(false); setModelListOpen(false); }}
            className="absolute top-3 right-4 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <X size={16} />
          </button>

          {/* Model selector — full width, no truncation */}
          <div className="mb-4">
            <label className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-1.5 block">
              {t('usage.model', 'Model')}
            </label>
            <button
              onClick={() => setModelListOpen(!modelListOpen)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-text-primary bg-bg-tertiary rounded-xl hover:bg-bg-secondary transition-colors"
            >
              <span className="flex items-center gap-2">
                {currentModelName}
                {currentMultiplierStyle && (
                  <span className={`text-xs font-medium ${currentMultiplierStyle.color}`}>
                    {currentMultiplierStyle.text}
                  </span>
                )}
              </span>
              <ChevronDown size={14} className={`text-text-muted transition-transform ${modelListOpen ? 'rotate-180' : ''}`} />
            </button>
            {modelListOpen && (
              <div className="mt-1 max-h-48 overflow-y-auto bg-bg-elevated border border-border rounded-xl shadow-lg">
                {models.map((model) => {
                  const isActive = model.id === currentModel;
                  const ms = getMultiplierStyle(model.premiumMultiplier);
                  return (
                    <button
                      key={model.id}
                      onClick={() => { onModelChange(model.id); setModelListOpen(false); setOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors ${
                        isActive ? 'text-accent bg-accent-soft' : 'text-text-primary hover:bg-bg-tertiary'
                      }`}
                    >
                      <span>{model.name}</span>
                      {ms && <span className={`text-xs font-medium ${ms.color}`}>{ms.text}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* CWD + Mode toggles row */}
          <div className="flex items-start gap-3 mb-4">
            {currentCwd && onCwdChange && (
              <div className="flex-1 min-w-0" ref={cwdContainerRef}>
                <label className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-1.5 block">
                  {t('cwd.label', 'Working Directory')}
                </label>
                <div className="relative">
                  <button
                    onClick={() => setCwdPickerOpen(!cwdPickerOpen)}
                    className="w-full flex items-center gap-1.5 px-3 py-2 text-sm text-text-secondary bg-bg-tertiary rounded-xl hover:bg-bg-secondary transition-colors"
                  >
                    <FolderOpen size={14} className="shrink-0" />
                    <span className="truncate">{cwdLast}</span>
                  </button>
                  {cwdPickerOpen && (
                    <div className="absolute bottom-full left-0 mb-1 z-[110]">
                      <DirectoryPicker
                        currentPath={currentCwd}
                        onSelect={(path) => { onCwdChange(path); setCwdPickerOpen(false); }}
                        onClose={() => setCwdPickerOpen(false)}
                        onFallback={onCwdChange}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-1.5 block">
                {t('bottomBar.copilot', 'Mode')}
              </label>
              <div className="inline-flex rounded-xl border border-border overflow-hidden">
                <button
                  onClick={() => onModeChange('copilot')}
                  className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
                    tabMode === 'copilot' ? 'text-accent bg-accent/10' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
                  }`}
                >
                  <Sparkles size={12} />
                  {t('terminal.modeAI')}
                </button>
                <button
                  onClick={() => onModeChange('terminal')}
                  className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
                    tabMode === 'terminal' ? 'text-accent bg-accent/10' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
                  }`}
                >
                  <TerminalSquare size={12} />
                  {t('terminal.modeBash')}
                </button>
              </div>
            </div>
          </div>

          {/* Plan/Act toggle */}
          {tabId && (
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-1.5 block">
                {t('planMode.tooltip', 'Plan / Act')}
              </label>
              <div className="inline-flex rounded-xl border border-border overflow-hidden">
                <button
                  disabled={isStreaming}
                  onClick={() => onPlanModeToggle(true)}
                  className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
                    planMode ? 'text-accent bg-accent/10' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
                  } disabled:opacity-50`}
                >
                  <Lightbulb size={12} />
                  {t('planMode.plan')}
                </button>
                <button
                  disabled={isStreaming}
                  onClick={() => onPlanModeToggle(false)}
                  className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
                    !planMode ? 'text-accent bg-accent/10' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
                  } disabled:opacity-50`}
                >
                  <Zap size={12} />
                  {t('planMode.act')}
                </button>
              </div>
            </div>
          )}

          {/* Web Search toggle */}
          {webSearchAvailable && (
            <div className="mt-4">
              <label className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-1.5 block">
                {t('webSearch.label', 'Web Search')}
              </label>
              <div className="inline-flex rounded-xl border border-border overflow-hidden">
                <button
                  disabled={isStreaming}
                  onClick={() => onWebSearchToggle(false)}
                  className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
                    !webSearchForced ? 'text-accent bg-accent/10' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
                  } disabled:opacity-50`}
                >
                  {t('webSearch.auto', 'Auto')}
                </button>
                <button
                  disabled={isStreaming}
                  onClick={() => onWebSearchToggle(true)}
                  className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
                    webSearchForced ? 'text-accent bg-accent/10' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
                  } disabled:opacity-50`}
                >
                  <Search size={12} />
                  {t('webSearch.forced', 'Always')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
