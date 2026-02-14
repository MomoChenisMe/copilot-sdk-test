import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ToolRecord as ToolRecordType } from '../../store';

interface ToolRecordProps {
  record: ToolRecordType;
}

export function ToolRecord({ record }: ToolRecordProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const statusIcon =
    record.status === 'running' ? (
      <span className="inline-block w-3 h-3 border-2 border-success border-t-transparent rounded-full animate-spin" />
    ) : record.status === 'success' ? (
      <span className="text-success text-sm">✓</span>
    ) : (
      <span className="text-error text-sm">✗</span>
    );

  return (
    <div className="my-2 rounded-lg bg-tool-card-bg border border-border/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-bg-tertiary/50 transition-colors rounded-lg"
      >
        {statusIcon}
        <span className="text-text-primary font-mono text-xs font-semibold">{record.toolName}</span>
        <span className="ml-auto text-text-muted text-xs">{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 text-xs font-mono">
          {record.arguments != null && (
            <div className="mb-2">
              <p className="text-text-muted mb-1 font-sans">{t('tool.arguments')}</p>
              <pre className="bg-code-block-bg p-2 rounded text-text-secondary overflow-x-auto">
                {JSON.stringify(record.arguments, null, 2)}
              </pre>
            </div>
          )}
          {record.result != null && (
            <div className="mb-2">
              <p className="text-text-muted mb-1 font-sans">{t('tool.result')}</p>
              <pre className="bg-code-block-bg p-2 rounded text-text-secondary overflow-x-auto max-h-48 overflow-y-auto">
                {typeof record.result === 'string'
                  ? record.result
                  : JSON.stringify(record.result, null, 2)}
              </pre>
            </div>
          )}
          {record.error && (
            <div>
              <p className="text-text-muted mb-1 font-sans">{t('tool.error')}</p>
              <pre className="bg-code-block-bg p-2 rounded text-error overflow-x-auto">
                {record.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
