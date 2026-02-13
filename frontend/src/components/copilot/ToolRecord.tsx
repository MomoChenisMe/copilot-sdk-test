import { useState } from 'react';
import type { ToolRecord as ToolRecordType } from '../../store';

interface ToolRecordProps {
  record: ToolRecordType;
}

export function ToolRecord({ record }: ToolRecordProps) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon =
    record.status === 'running' ? (
      <span className="inline-block w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    ) : record.status === 'success' ? (
      <span className="text-success">✓</span>
    ) : (
      <span className="text-error">✗</span>
    );

  return (
    <div className="my-2 rounded border border-border bg-bg-input">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-bg-tertiary transition-colors"
      >
        {statusIcon}
        <span className="text-text-secondary font-mono text-xs">{record.toolName}</span>
        <span className="ml-auto text-text-muted text-xs">{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 text-xs font-mono">
          {record.arguments != null && (
            <div className="mb-2">
              <p className="text-text-muted mb-1">Arguments:</p>
              <pre className="bg-bg-primary p-2 rounded text-text-secondary overflow-x-auto">
                {JSON.stringify(record.arguments, null, 2)}
              </pre>
            </div>
          )}
          {record.result != null && (
            <div>
              <p className="text-text-muted mb-1">Result:</p>
              <pre className="bg-bg-primary p-2 rounded text-text-secondary overflow-x-auto max-h-48 overflow-y-auto">
                {typeof record.result === 'string'
                  ? record.result
                  : JSON.stringify(record.result, null, 2)}
              </pre>
            </div>
          )}
          {record.error && (
            <div>
              <p className="text-text-muted mb-1">Error:</p>
              <pre className="bg-bg-primary p-2 rounded text-error overflow-x-auto">
                {record.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
