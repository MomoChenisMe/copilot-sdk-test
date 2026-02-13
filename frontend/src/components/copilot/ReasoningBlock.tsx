import { useState } from 'react';

interface ReasoningBlockProps {
  text: string;
}

export function ReasoningBlock({ text }: ReasoningBlockProps) {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  return (
    <div className="mb-3 rounded border border-border bg-bg-input">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-bg-tertiary transition-colors"
      >
        <span className="text-accent">💭</span>
        <span className="text-text-secondary">Reasoning</span>
        <span className="ml-auto text-text-muted text-xs">{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 text-sm text-text-muted whitespace-pre-wrap max-h-64 overflow-y-auto">
          {text}
        </div>
      )}
    </div>
  );
}
