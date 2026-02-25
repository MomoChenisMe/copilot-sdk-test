import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { SubagentItem } from '../../store';

interface SubagentPanelProps {
  subagents: SubagentItem[];
}

export function SubagentPanel({ subagents }: SubagentPanelProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  if (subagents.length === 0) return null;

  const doneCount = subagents.filter((s) => s.status === 'completed' || s.status === 'failed').length;
  const totalCount = subagents.length;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div data-testid="subagent-panel" className="mx-4 mb-2">
      <div className="max-w-3xl mx-auto">
        <button
          data-testid="subagent-panel-toggle"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-secondary transition-colors"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          {t('fleet.title')} ({doneCount}/{totalCount})
        </button>

        {!collapsed && (
          <>
            <div data-testid="subagent-progress-bar" className="mt-1 h-1 rounded-full bg-bg-tertiary overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${progressPercent}%` }}
                data-testid="subagent-progress-fill"
              />
            </div>

            <div data-testid="subagent-list" className="mt-1.5 space-y-1">
              {subagents.map((agent) => (
                <div
                  key={agent.toolCallId}
                  data-testid={`subagent-${agent.toolCallId}`}
                  className="flex items-center gap-2 px-2 py-1 rounded text-xs hover:bg-bg-tertiary/50 transition-colors"
                >
                  {agent.status === 'running' && (
                    <Loader2 size={14} className="shrink-0 text-accent animate-spin" data-testid={`subagent-status-running-${agent.toolCallId}`} />
                  )}
                  {agent.status === 'completed' && (
                    <CheckCircle2 size={14} className="shrink-0 text-green-500" data-testid={`subagent-status-completed-${agent.toolCallId}`} />
                  )}
                  {agent.status === 'failed' && (
                    <AlertCircle size={14} className="shrink-0 text-red-500" data-testid={`subagent-status-failed-${agent.toolCallId}`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className={`truncate block ${agent.status === 'completed' ? 'text-text-muted' : 'text-text-secondary'}`}>
                      {agent.displayName}
                    </span>
                    {agent.description && (
                      <span className="text-[10px] text-text-muted truncate block">{agent.description}</span>
                    )}
                  </div>
                  {agent.status === 'failed' && agent.error && (
                    <span className="ml-auto shrink-0 text-[10px] text-red-500 font-medium truncate max-w-[150px]">
                      {agent.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
