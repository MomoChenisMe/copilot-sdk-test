import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';
import type { SpecListItem } from '../../lib/openspec-api';

interface OpenSpecSpecsProps {
  specs: SpecListItem[];
  onSelect: (name: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function OpenSpecSpecs({ specs, onSelect }: OpenSpecSpecsProps) {
  const { t } = useTranslation();

  if (specs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-muted text-sm gap-2">
        <FileText size={28} className="opacity-40" />
        <p>{t('openspecPanel.specs.empty', 'No spec files found')}</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-1.5">
      {specs.map((spec) => (
        <button
          key={spec.name}
          onClick={() => onSelect(spec.name)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border-subtle bg-bg-primary hover:bg-bg-tertiary transition-colors text-left"
        >
          <FileText size={16} className="text-accent shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{spec.name}</p>
          </div>
          <span className="text-[10px] text-text-muted shrink-0">{formatBytes(spec.size)}</span>
        </button>
      ))}
    </div>
  );
}
