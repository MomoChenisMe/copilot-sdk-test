import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';

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
    <div className="my-2 rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-bg-tertiary/50 transition-colors"
      >
        {isStreaming && (
          <span className="inline-block w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin shrink-0" />
        )}
        <span className="text-text-secondary font-medium">{title}</span>
        <ChevronDown size={14} className={`ml-auto text-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="px-4 pb-3 text-sm font-mono text-text-muted whitespace-pre-wrap max-h-64 overflow-y-auto border-t border-border">
          {text}
        </div>
      )}
    </div>
  );
}
