import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GitBranch, FileText, Archive, Trash2 } from 'lucide-react';
import { Markdown } from '../shared/Markdown';
import type { OverviewData } from '../../lib/openspec-api';

interface OpenSpecOverviewProps {
  overview: OverviewData | null;
  onNavigate?: (tab: string) => void;
  onDeleteOpenspec?: () => void;
  deleting?: boolean;
}

export function OpenSpecOverview({ overview, onNavigate, onDeleteOpenspec, deleting }: OpenSpecOverviewProps) {
  const { t } = useTranslation();
  const [configTab, setConfigTab] = useState<'description' | 'rules'>('description');

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
      value: overview.changesCount,
      icon: GitBranch,
      tab: 'changes',
    },
    {
      label: t('openspecPanel.overview.specs', 'Specs'),
      value: overview.specsCount,
      icon: FileText,
      tab: 'specs',
    },
    {
      label: t('openspecPanel.overview.archived', 'Archived'),
      value: overview.archivedCount,
      icon: Archive,
      tab: 'archived',
    },
  ];

  const config = overview.config;
  const projectDescription = config?.context as string | undefined;
  // rules is an object { proposal: string[], specs: string[], ... } — format as markdown
  const rulesObj = config?.rules as Record<string, string[]> | undefined;
  const outputRules = rulesObj
    ? Object.entries(rulesObj)
        .map(([key, items]) => `### ${key}\n${Array.isArray(items) ? items.map((r) => `- ${r}`).join('\n') : String(items)}`)
        .join('\n\n')
    : undefined;

  return (
    <div className="p-4 flex flex-col gap-3 h-full">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted shrink-0">
        {t('openspecPanel.overview.title', 'Project Overview')}
      </h3>
      <div className="grid grid-cols-3 gap-3 shrink-0">
        {stats.map((stat) => (
          <button
            key={stat.label}
            onClick={() => onNavigate?.(stat.tab)}
            className="rounded-lg border border-border bg-bg-primary p-3 text-center hover:bg-bg-tertiary transition-colors cursor-pointer"
          >
            <stat.icon size={16} className="mx-auto mb-1.5 text-accent" />
            <p className="text-lg font-bold text-accent">{stat.value}</p>
            <p className="text-[11px] text-text-muted leading-tight mt-0.5">{stat.label}</p>
          </button>
        ))}
      </div>

      {/* Config.yaml display card */}
      {config && (
        <div className="rounded-lg border border-border bg-bg-primary overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text-primary">
                {t('openspecPanel.overview.configTitle', 'Project Settings')}
              </span>
              <span className="text-xs text-text-muted">config.yaml</span>
            </div>
          </div>

          {/* Tab buttons */}
          <div className="flex border-b border-border shrink-0">
            <button
              onClick={() => setConfigTab('description')}
              className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                configTab === 'description'
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {t('openspecPanel.overview.projectDescription', 'Project Description')}
            </button>
            <button
              onClick={() => setConfigTab('rules')}
              className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                configTab === 'rules'
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {t('openspecPanel.overview.outputRules', 'Output Rules')}
            </button>
          </div>

          {/* Tab content */}
          <div className="p-4 flex-1 overflow-y-auto min-h-0">
            {configTab === 'description' ? (
              projectDescription ? (
                <Markdown content={projectDescription} />
              ) : (
                <p className="text-sm text-text-muted">{t('openspecPanel.noContent', 'No content')}</p>
              )
            ) : (
              outputRules ? (
                <Markdown content={outputRules} />
              ) : (
                <p className="text-sm text-text-muted">{t('openspecPanel.noContent', 'No content')}</p>
              )
            )}
          </div>
        </div>
      )}

      {/* Danger zone — Delete OpenSpec */}
      {onDeleteOpenspec && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-red-400">
                {t('openspecPanel.dangerZone', 'Danger Zone')}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                {t('openspecPanel.deleteDesc', 'Permanently delete the openspec folder and all its contents.')}
              </p>
            </div>
            <button
              onClick={onDeleteOpenspec}
              disabled={deleting}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 border border-red-500/40 rounded-lg hover:bg-red-500/10 disabled:opacity-40 transition-colors"
            >
              <Trash2 size={12} />
              {deleting
                ? t('openspecPanel.deleting', 'Deleting...')
                : t('openspecPanel.deleteFolder', 'Delete OpenSpec')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
