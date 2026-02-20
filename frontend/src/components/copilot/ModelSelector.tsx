import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { useAppStore } from '../../store';

interface ModelSelectorProps {
  currentModel: string;
  onSelect: (modelId: string) => void;
}

function getMultiplierStyle(multiplier: number | null | undefined) {
  if (multiplier == null) return null;
  if (multiplier === 0) return { text: '0x', color: 'text-green-500' };
  if (multiplier < 1) return { text: `${multiplier}x`, color: 'text-green-500' };
  if (multiplier === 1) return { text: '1x', color: 'text-text-muted' };
  if (multiplier >= 9) return { text: `${multiplier}x`, color: 'text-red-500' };
  return { text: `${multiplier}x`, color: 'text-amber-500' };
}

export function ModelSelector({ currentModel, onSelect }: ModelSelectorProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const models = useAppStore((s) => s.models);
  const modelsLoading = useAppStore((s) => s.modelsLoading);
  const modelsError = useAppStore((s) => s.modelsError);

  const currentModelObj = models.find((m) => m.id === currentModel);
  const currentModelName = currentModelObj?.name || currentModel;
  const currentMultiplierStyle = getMultiplierStyle(currentModelObj?.premiumMultiplier);

  // Click-outside handler
  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, handleClickOutside]);

  if (modelsLoading) {
    return (
      <span className="text-xs text-text-muted px-2 py-1">{t('model.loading')}</span>
    );
  }

  if (modelsError) {
    return (
      <span className="text-xs text-error px-2 py-1">{t('model.error')}</span>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-bg-tertiary rounded-lg hover:bg-bg-secondary transition-colors truncate max-w-52"
        title={currentModelName}
      >
        <span className="truncate">{currentModelName}</span>
        {currentMultiplierStyle && (
          <span className={`shrink-0 text-xs font-medium ${currentMultiplierStyle.color}`} data-testid="trigger-multiplier">
            {currentMultiplierStyle.text}
          </span>
        )}
        <ChevronDown size={12} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          data-testid="model-dropdown"
          className="absolute bottom-full left-0 mb-1 min-w-64 max-w-80 max-h-60 overflow-y-auto bg-bg-elevated border border-border rounded-xl shadow-[var(--shadow-lg)] z-50"
        >
          <div className="px-3 py-2 text-xs font-semibold text-text-muted border-b border-border">
            {t('model.sourceTitle')}
          </div>
          {models.map((model) => {
            const isActive = model.id === currentModel;
            const multiplierStyle = getMultiplierStyle(model.premiumMultiplier);
            return (
              <button
                key={model.id}
                title={model.name}
                onClick={() => {
                  onSelect(model.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'text-accent bg-accent-soft'
                    : 'text-text-primary hover:bg-bg-tertiary'
                }`}
              >
                <span className="truncate">{model.name}</span>
                {multiplierStyle && (
                  <span className={`ml-auto text-xs font-medium ${multiplierStyle.color}`}>
                    {multiplierStyle.text}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
