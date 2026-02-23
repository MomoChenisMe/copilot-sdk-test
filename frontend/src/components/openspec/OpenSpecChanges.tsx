import { useTranslation } from 'react-i18next';
import { FolderOpen } from 'lucide-react';
import type { ChangeListItem } from '../../lib/openspec-api';

interface OpenSpecChangesProps {
  changes: ChangeListItem[];
  onSelect: (name: string) => void;
  onRefresh: () => void;
}

function statusBadge(status: string): string {
  if (status === 'completed') return 'bg-green-500/20 text-green-400';
  if (status === 'archived') return 'bg-zinc-500/20 text-zinc-400';
  return 'bg-purple-500/10 text-purple-500';
}

export function OpenSpecChanges({ changes, onSelect, onRefresh: _onRefresh }: OpenSpecChangesProps) {
  const { t } = useTranslation();

  if (changes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-muted text-sm gap-2">
        <FolderOpen size={28} className="opacity-40" />
        <p>{t('openspecPanel.changes.empty', 'No active changes')}</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      {changes.map((change) => {
        const { completed, total } = change.taskProgress;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

        return (
          <button
            key={change.name}
            onClick={() => onSelect(change.name)}
            className="w-full text-left rounded-lg border border-border bg-bg-primary p-3 hover:bg-bg-tertiary transition-colors"
          >
            {/* Top row: name + status */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-sm font-medium text-text-primary truncate">
                {change.name}
              </span>
              <span
                className={`shrink-0 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${statusBadge(change.status)}`}
              >
                {change.status}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden mb-1.5">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[11px] text-text-muted mb-1">
              {t('openspecPanel.changes.progress', '{{completed}}/{{total}} tasks', {
                completed,
                total,
              })}
            </p>

            {/* Proposal excerpt */}
            {change.proposal && (
              <p className="text-xs text-text-secondary line-clamp-2">
                {change.proposal}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
