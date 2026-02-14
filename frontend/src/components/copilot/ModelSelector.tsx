import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { useAppStore } from '../../store';

interface ModelSelectorProps {
  currentModel: string;
  onSelect: (modelId: string) => void;
}

export function ModelSelector({ currentModel, onSelect }: ModelSelectorProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const models = useAppStore((s) => s.models);
  const modelsLoading = useAppStore((s) => s.modelsLoading);
  const modelsError = useAppStore((s) => s.modelsError);

  const currentModelName = models.find((m) => m.id === currentModel)?.name || currentModel;

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
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-bg-tertiary rounded-lg hover:bg-bg-secondary transition-colors truncate max-w-40"
        title={currentModelName}
      >
        <span className="truncate">{currentModelName}</span>
        <ChevronDown size={12} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          data-testid="model-dropdown"
          className="absolute bottom-full left-0 mb-1 min-w-48 max-w-72 max-h-60 overflow-y-auto bg-bg-elevated border border-border rounded-xl shadow-[var(--shadow-lg)] z-50"
        >
          <div className="px-3 py-2 text-xs font-semibold text-text-muted border-b border-border">
            {t('model.sourceTitle')}
          </div>
          {models.map((model) => {
            const isActive = model.id === currentModel;
            return (
              <button
                key={model.id}
                title={model.name}
                onClick={() => {
                  onSelect(model.id);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm truncate transition-colors ${
                  isActive
                    ? 'text-accent bg-accent-soft'
                    : 'text-text-primary hover:bg-bg-tertiary'
                }`}
              >
                {model.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
