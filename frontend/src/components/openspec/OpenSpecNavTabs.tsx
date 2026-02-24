import { useTranslation } from 'react-i18next';

export type OpenSpecTabId = 'overview' | 'changes' | 'specs' | 'archived' | 'settings';

interface OpenSpecNavTabsProps {
  activeTab: OpenSpecTabId;
  onTabChange: (tab: OpenSpecTabId) => void;
}

const TABS: { id: OpenSpecTabId; labelKey: string }[] = [
  { id: 'overview', labelKey: 'openspecPanel.tabs.overview' },
  { id: 'changes', labelKey: 'openspecPanel.tabs.changes' },
  { id: 'specs', labelKey: 'openspecPanel.tabs.specs' },
  { id: 'archived', labelKey: 'openspecPanel.tabs.archived' },
  { id: 'settings', labelKey: 'openspecPanel.tabs.settings' },
];

export function OpenSpecNavTabs({ activeTab, onTabChange }: OpenSpecNavTabsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-1 px-4 py-2 border-b border-border">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors border ${
            activeTab === tab.id
              ? 'border-accent text-accent bg-accent/5'
              : 'border-transparent text-text-secondary hover:bg-bg-secondary'
          }`}
        >
          {t(tab.labelKey, tab.id)}
        </button>
      ))}
    </div>
  );
}
