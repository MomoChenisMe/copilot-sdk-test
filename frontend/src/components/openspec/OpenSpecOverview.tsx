import { useTranslation } from 'react-i18next';
import { GitBranch, FileText, Archive } from 'lucide-react';
import type { OverviewData } from '../../lib/openspec-api';

interface OpenSpecOverviewProps {
  overview: OverviewData | null;
}

export function OpenSpecOverview({ overview }: OpenSpecOverviewProps) {
  const { t } = useTranslation();

  if (!overview) {
    return (
      <div className="flex items-center justify-center py-12 text-text-muted text-sm">
        {t('openspecPanel.loading', 'Loading...')}
      </div>
    );
  }

  const stats = [
    {
      label: t('openspecPanel.overview.activeChanges', 'Active Changes'),
      value: overview.activeChanges,
      icon: GitBranch,
    },
    {
      label: t('openspecPanel.overview.specs', 'Specs'),
      value: overview.specs,
      icon: FileText,
    },
    {
      label: t('openspecPanel.overview.archived', 'Archived'),
      value: overview.archived,
      icon: Archive,
    },
  ];

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
        {t('openspecPanel.overview.title', 'Project Overview')}
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border-subtle bg-bg-primary p-3 text-center"
          >
            <stat.icon size={16} className="mx-auto mb-1.5 text-accent" />
            <p className="text-lg font-bold text-accent">{stat.value}</p>
            <p className="text-[11px] text-text-muted leading-tight mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
