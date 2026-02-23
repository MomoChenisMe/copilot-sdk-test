import { useTranslation } from 'react-i18next';
import { Archive } from 'lucide-react';
import type { ArchivedItem } from '../../lib/openspec-api';

interface OpenSpecArchivedProps {
  archived: ArchivedItem[];
  onSelect: (name: string) => void;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function OpenSpecArchived({ archived, onSelect }: OpenSpecArchivedProps) {
  const { t } = useTranslation();

  if (archived.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-muted text-sm gap-2">
        <Archive size={28} className="opacity-40" />
        <p>{t('openspecPanel.archived.empty', 'No archived changes')}</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-1.5">
      {archived.map((item) => (
        <button
          key={item.name}
          onClick={() => onSelect(item.name)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-bg-primary hover:bg-bg-tertiary transition-colors text-left"
        >
          <Archive size={16} className="text-text-muted shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{item.name}</p>
          </div>
          <span className="text-[10px] text-text-muted shrink-0 bg-bg-tertiary px-1.5 py-0.5 rounded">
            {formatDate(item.archivedAt)}
          </span>
        </button>
      ))}
    </div>
  );
}
