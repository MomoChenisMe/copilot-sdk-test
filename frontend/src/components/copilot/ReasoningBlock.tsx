import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface ReasoningBlockProps {
  text: string;
  isStreaming: boolean;
}

function estimateDuration(text: string): string {
  const seconds = Math.max(1, Math.round(text.length / 50));
  return `${seconds}s`;
}

export function ReasoningBlock({ text, isStreaming }: ReasoningBlockProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(isStreaming);
  }, [isStreaming]);

  if (!text) return null;

  const title = isStreaming
    ? t('reasoning.thinking')
    : t('reasoning.thoughtFor', { duration: estimateDuration(text) });

  return (
    <div className="my-2 rounded-lg bg-tool-card-bg border border-border/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-bg-tertiary/50 transition-colors rounded-lg"
      >
        <span className="text-text-secondary font-medium">{title}</span>
        <span className="ml-auto text-text-muted text-xs">{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 text-sm font-mono text-text-muted whitespace-pre-wrap max-h-64 overflow-y-auto">
          {text}
        </div>
      )}
    </div>
  );
}
