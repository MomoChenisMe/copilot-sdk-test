import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Circle, Loader2, CheckCircle2 } from 'lucide-react';
import type { TaskItem } from '../../store';

interface TaskPanelProps {
  tasks: TaskItem[];
}

export function TaskPanel({ tasks }: TaskPanelProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  if (tasks.length === 0) return null;

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const totalCount = tasks.length;

  return (
    <div data-testid="task-panel" className="mx-4 mb-2">
      <div className="max-w-3xl mx-auto">
        <button
          data-testid="task-panel-toggle"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-secondary transition-colors"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          {t('tasks.title')} ({completedCount}/{totalCount})
        </button>

        {!collapsed && (
          <div data-testid="task-list" className="mt-1.5 space-y-1">
            {tasks.map((task) => (
              <div
                key={task.id}
                data-testid={`task-${task.id}`}
                className="flex items-center gap-2 px-2 py-1 rounded text-xs"
              >
                {task.status === 'pending' && (
                  <Circle size={14} className="shrink-0 text-text-muted" data-testid={`task-status-pending-${task.id}`} />
                )}
                {task.status === 'in_progress' && (
                  <Loader2 size={14} className="shrink-0 text-accent animate-spin" data-testid={`task-status-in_progress-${task.id}`} />
                )}
                {task.status === 'completed' && (
                  <CheckCircle2 size={14} className="shrink-0 text-green-500" data-testid={`task-status-completed-${task.id}`} />
                )}
                <span className={`truncate ${task.status === 'completed' ? 'text-text-muted line-through' : 'text-text-secondary'}`}>
                  {task.status === 'in_progress' && task.activeForm ? task.activeForm : task.subject}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
