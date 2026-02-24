import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Circle, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { TaskItem } from '../../store';

interface TaskPanelProps {
  tasks: TaskItem[];
}

export function TaskPanel({ tasks }: TaskPanelProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  if (tasks.length === 0) return null;

  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div data-testid="task-panel" className="mx-4 mb-2">
      <div className="max-w-3xl mx-auto">
        <button
          data-testid="task-panel-toggle"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-secondary transition-colors"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          {t('tasks.title')} ({doneCount}/{totalCount})
        </button>

        {!collapsed && (
          <>
            <div data-testid="task-progress-bar" className="mt-1 h-1 rounded-full bg-bg-tertiary overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${progressPercent}%` }}
                data-testid="task-progress-fill"
              />
            </div>

            <div data-testid="task-list" className="mt-1.5 space-y-1">
              {tasks.map((task) => (
                <div key={task.id} data-testid={`task-${task.id}`}>
                  <button
                    onClick={() => task.description ? toggleExpand(task.id) : undefined}
                    className="flex items-center gap-2 px-2 py-1 rounded text-xs w-full text-left hover:bg-bg-tertiary/50 transition-colors"
                  >
                    {task.status === 'pending' && (
                      <Circle size={14} className="shrink-0 text-text-muted" data-testid={`task-status-pending-${task.id}`} />
                    )}
                    {task.status === 'in_progress' && (
                      <Loader2 size={14} className="shrink-0 text-accent animate-spin" data-testid={`task-status-in_progress-${task.id}`} />
                    )}
                    {task.status === 'done' && (
                      <CheckCircle2 size={14} className="shrink-0 text-green-500" data-testid={`task-status-done-${task.id}`} />
                    )}
                    {task.status === 'blocked' && (
                      <AlertCircle size={14} className="shrink-0 text-orange-500" data-testid={`task-status-blocked-${task.id}`} />
                    )}
                    <span className={`truncate ${task.status === 'done' ? 'text-text-muted line-through' : 'text-text-secondary'}`}>
                      {task.title}
                    </span>
                    {task.status === 'blocked' && (
                      <span data-testid={`task-blocked-label-${task.id}`} className="ml-auto shrink-0 text-[10px] text-orange-500 font-medium">
                        {t('tasks.blocked')}
                      </span>
                    )}
                  </button>
                  {expandedIds.has(task.id) && task.description && (
                    <div data-testid={`task-description-${task.id}`} className="ml-8 px-2 pb-1 text-xs text-text-muted">
                      {task.description}
                    </div>
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
