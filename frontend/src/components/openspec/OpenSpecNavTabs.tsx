import { useTranslation } from 'react-i18next';

export type OpenSpecTabId = 'overview' | 'changes' | 'specs' | 'archived';

interface OpenSpecNavTabsProps {
  activeTab: OpenSpecTabId;
  onTabChange: (tab: OpenSpecTabId) => void;
}

const TABS: { id: OpenSpecTabId; labelKey: string }[] = [
  { id: 'overview', labelKey: 'openspecPanel.tabs.overview' },
  { id: 'changes', labelKey: 'openspecPanel.tabs.changes' },
  { id: 'specs', labelKey: 'openspecPanel.tabs.specs' },
  { id: 'archived', labelKey: 'openspecPanel.tabs.archived' },
];

export function OpenSpecNavTabs({ activeTab, onTabChange }: OpenSpecNavTabsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-1 px-3 py-2 border-b border-border-subtle">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === tab.id
              ? 'bg-accent text-white'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
          }`}
        >
          {t(tab.labelKey, tab.id)}
        </button>
      ))}
    </div>
  );
}
