import { useState, useEffect } from 'react';
import { apiGet } from '../../lib/api';

interface ModelInfo {
  id: string;
  name: string;
}

interface ModelSelectorProps {
  currentModel: string;
  onSelect: (modelId: string) => void;
}

export function ModelSelector({ currentModel, onSelect }: ModelSelectorProps) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    apiGet<ModelInfo[]>('/api/copilot/models')
      .then(setModels)
      .catch(() => {
        // Fallback models
        setModels([
          { id: 'gpt-5', name: 'GPT-5' },
          { id: 'gpt-4.1', name: 'GPT-4.1' },
          { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5' },
          { id: 'o4-mini', name: 'o4-mini' },
        ]);
      });
  }, []);

  const currentModelName = models.find((m) => m.id === currentModel)?.name || currentModel;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 text-xs text-text-secondary bg-bg-input border border-border rounded hover:border-accent transition-colors"
      >
        {currentModelName}
        <span className="text-text-muted">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-bg-secondary border border-border rounded shadow-lg z-50">
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
