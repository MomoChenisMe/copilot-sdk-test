import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store';

interface ModelSelectorProps {
  currentModel: string;
  onSelect: (modelId: string) => void;
}

export function ModelSelector({ currentModel, onSelect }: ModelSelectorProps) {
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
      <span className="text-xs text-text-muted px-2 py-1">Loading...</span>
    );
  }

  if (modelsError) {
    return (
      <span className="text-xs text-error px-2 py-1">Error</span>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 text-xs text-text-secondary bg-bg-input border border-border rounded hover:border-accent transition-colors"
      >
        {currentModelName}
        <span className="text-text-muted">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          data-testid="model-dropdown"
          className="absolute bottom-full left-0 mb-1 w-48 bg-bg-secondary border border-border rounded shadow-lg z-50"
        >
          {models.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                onSelect(model.id);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-bg-tertiary transition-colors ${
                model.id === currentModel ? 'text-accent' : 'text-text-primary'
              }`}
            >
              {model.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
