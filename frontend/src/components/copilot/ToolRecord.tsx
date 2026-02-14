import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Loader, ChevronDown } from 'lucide-react';
import type { ToolRecord as ToolRecordType } from '../../store';

interface ToolRecordProps {
  record: ToolRecordType;
}

export function ToolRecord({ record }: ToolRecordProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const statusIcon =
    record.status === 'running' ? (
      <Loader size={14} className="text-accent animate-spin" />
    ) : record.status === 'success' ? (
      <Check size={14} className="text-success" />
    ) : (
      <X size={14} className="text-error" />
    );

  return (
    <div className="my-2 rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-bg-tertiary/50 transition-colors"
      >
        {statusIcon}
        <span className="text-text-primary font-mono text-xs font-semibold">{record.toolName}</span>
        <ChevronDown size={14} className={`ml-auto text-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="px-4 pb-3 text-xs font-mono border-t border-border">
          {record.arguments != null && (
            <div className="mb-2 mt-2">
              <p className="text-text-muted mb-1 font-sans text-xs">{t('tool.arguments')}</p>
              <pre className="bg-code-bg p-3 rounded-lg text-text-secondary overflow-x-auto text-xs">
                {JSON.stringify(record.arguments, null, 2)}
              </pre>
            </div>
          )}
          {record.result != null && (
            <div className="mb-2">
              <p className="text-text-muted mb-1 font-sans text-xs">{t('tool.result')}</p>
              <pre className="bg-code-bg p-3 rounded-lg text-text-secondary overflow-x-auto max-h-48 overflow-y-auto text-xs">
                {typeof record.result === 'string'
                  ? record.result
                  : JSON.stringify(record.result, null, 2)}
              </pre>
            </div>
          )}
          {record.error && (
            <div>
              <p className="text-text-muted mb-1 font-sans text-xs">{t('tool.error')}</p>
              <pre className="bg-code-bg p-3 rounded-lg text-error overflow-x-auto text-xs">
                {record.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
