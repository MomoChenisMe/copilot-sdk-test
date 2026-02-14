import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { safeStringify } from './ToolRecord';

const TRUNCATE_THRESHOLD = 500;
const TRUNCATE_SHOW_LINES = 200;

interface ToolResultBlockProps {
  result: unknown;
  toolName: string;
  status?: 'running' | 'success' | 'error';
}

function extractResultText(result: unknown): string | null {
  if (result == null) return null;
  if (typeof result === 'string') return result;
  if (typeof result === 'object') {
    const obj = result as Record<string, unknown>;
    if (typeof obj.detailedContent === 'string') return obj.detailedContent;
    if (typeof obj.content === 'string') return obj.content;
    return safeStringify(result);
  }
  return String(result);
}

export function ToolResultBlock({ result, status }: ToolResultBlockProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const text = extractResultText(result);
  if (!text) return null;

  const lines = text.split('\n');
  const needsTruncation = lines.length > TRUNCATE_THRESHOLD;
  const displayText = needsTruncation && !expanded
    ? lines.slice(0, TRUNCATE_SHOW_LINES).join('\n')
    : text;

  const isError = status === 'error';

  return (
    <div>
      <pre
        data-testid="tool-result-block"
        className={`my-1 bg-code-bg p-3 rounded-lg overflow-x-auto max-h-96 overflow-y-auto text-xs font-mono ${
          isError ? 'text-error' : 'text-text-secondary'
        }`}
      >
        {displayText}
      </pre>
      {needsTruncation && !expanded && (
        <button
          data-testid="tool-result-expand"
          onClick={() => setExpanded(true)}
          className="mt-1 text-xs text-accent hover:text-accent-hover transition-colors"
        >
          {t('tool.expandAll', 'Show all {{count}} lines', { count: lines.length })}
        </button>
      )}
    </div>
  );
}
