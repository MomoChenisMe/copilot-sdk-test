import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';

const COLLAPSE_THRESHOLD = 20;

interface BashOutputProps {
  content: string;
  exitCode: number;
}

export function BashOutput({ content, exitCode }: BashOutputProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const lines = content ? content.split('\n') : [];
  const isLong = lines.length > COLLAPSE_THRESHOLD;
  const visibleLines = isLong && !expanded ? lines.slice(0, COLLAPSE_THRESHOLD) : lines;
  const hiddenCount = lines.length - COLLAPSE_THRESHOLD;

  const hasContent = content.trim().length > 0;

  return (
    <div className="mb-4">
      {hasContent && (
        <pre className="text-xs leading-relaxed font-mono whitespace-pre-wrap bg-bg-tertiary rounded-lg p-3 text-text-primary overflow-x-auto">
          {visibleLines.map((line, i) => (
            <div key={i} data-testid={`bash-line-${i + 1}`} className="flex">
              <span className="select-none text-text-muted w-8 text-right pr-3 shrink-0 opacity-50">
                {i + 1}
              </span>
              <span className="flex-1">{line}</span>
            </div>
          ))}
        </pre>
      )}

      {isLong && !expanded && (
        <button
          data-testid="bash-show-all"
          onClick={() => setExpanded(true)}
          className="mt-1 inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
        >
          <ChevronDown size={12} />
          {t('bash.showAll', `Show all ${lines.length} lines (+${hiddenCount} more)`)}
        </button>
      )}

      {isLong && expanded && (
        <button
          data-testid="bash-collapse"
          onClick={() => setExpanded(false)}
          className="mt-1 inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
        >
          <ChevronUp size={12} />
          {t('bash.collapse', 'Collapse')}
        </button>
      )}

      <span
        data-testid="exit-code-badge"
        className={`inline-flex items-center ${hasContent ? 'mt-1' : ''} px-1.5 py-0.5 rounded text-xs font-medium ${
          exitCode === 0
            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
            : 'bg-error/15 text-error'
        }`}
      >
        {exitCode === 0 ? '✓' : `exit ${exitCode}`}
      </span>
    </div>
  );
}
