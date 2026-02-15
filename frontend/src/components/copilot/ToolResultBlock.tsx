import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { safeStringify } from './ToolRecord';
import { Markdown } from '../shared/Markdown';

const TRUNCATE_THRESHOLD = 500;
const TRUNCATE_SHOW_LINES = 200;

const TOOL_LANGUAGE_MAP: Record<string, string> = {
  bash: 'bash',
  shell: 'bash',
  execute: 'bash',
  run: 'bash',
};

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

export function ToolResultBlock({ result, toolName, status }: ToolResultBlockProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const text = extractResultText(result);
  const isRunning = status === 'running';
  const isError = status === 'error';

  // Running: ToolRecord already shows the running state
  // Null text: nothing to display
  if (isRunning || !text) return null;

  const lines = text.split('\n');
  const needsTruncation = lines.length > TRUNCATE_THRESHOLD;
  const displayText = needsTruncation && !expanded
    ? lines.slice(0, TRUNCATE_SHOW_LINES).join('\n')
    : text;

  const lang = TOOL_LANGUAGE_MAP[toolName] ?? '';

  // Error: render as plain error block (not highlighted)
  if (isError) {
    return (
      <div>
        <div
          data-testid="tool-result-block"
          className="my-2 rounded-xl border border-border border-l-4 border-l-error overflow-hidden"
        >
          <pre className="font-mono text-xs leading-relaxed p-4 bg-code-bg text-error whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
            <code>{displayText}</code>
          </pre>
        </div>

        {needsTruncation && (
          <button
            data-testid="tool-result-expand"
            onClick={() => setExpanded(!expanded)}
            className="mt-1 text-xs text-accent hover:text-accent-hover transition-colors"
          >
            {expanded
              ? t('tool.collapse', 'Collapse')
              : t('tool.expandAll', 'Show all {{count}} lines', { count: lines.length })
            }
          </button>
        )}
      </div>
    );
  }

  // Success: render as markdown code block (same as assistant message code blocks)
  const markdown = `\`\`\`${lang}\n${displayText}\n\`\`\``;

  return (
    <div data-testid="tool-result-block">
      <Markdown content={markdown} />

      {needsTruncation && (
        <button
          data-testid="tool-result-expand"
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-xs text-accent hover:text-accent-hover transition-colors"
        >
          {expanded
            ? t('tool.collapse', 'Collapse')
            : t('tool.expandAll', 'Show all {{count}} lines', { count: lines.length })
          }
        </button>
      )}
    </div>
  );
}
