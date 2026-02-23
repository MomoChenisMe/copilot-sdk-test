import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Copy, Check } from 'lucide-react';
import type { SpecListItem } from '../../lib/openspec-api';

interface OpenSpecSpecsProps {
  specs: SpecListItem[];
  onSelect: (name: string) => void;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function OpenSpecSpecs({ specs, onSelect }: OpenSpecSpecsProps) {
  const { t } = useTranslation();
  const [copiedName, setCopiedName] = useState<string | null>(null);

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
        <div
          key={spec.name}
          role="button"
          tabIndex={0}
          onClick={() => onSelect(spec.name)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(spec.name); } }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-bg-primary hover:bg-bg-tertiary transition-colors text-left cursor-pointer"
        >
          <FileText size={16} className="text-accent shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{spec.name}</p>
            {spec.summary && (
              <p className="text-xs text-text-secondary line-clamp-2 mt-0.5">{spec.summary}</p>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(spec.name).then(() => {
                setCopiedName(spec.name);
                setTimeout(() => setCopiedName(null), 2000);
              });
            }}
            className="shrink-0 p-1 rounded hover:bg-bg-secondary transition-colors text-text-muted hover:text-text-primary"
            aria-label={t('openspecPanel.specs.copyName', 'Copy spec name')}
          >
            {copiedName === spec.name ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
          </button>
          {formatBytes(spec.size) && (
            <span className="text-[10px] text-text-muted shrink-0">{formatBytes(spec.size)}</span>
          )}
        </div>
      ))}
    </div>
  );
}
