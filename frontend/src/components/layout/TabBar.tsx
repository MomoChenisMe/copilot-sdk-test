import { useTranslation } from 'react-i18next';
import { Sparkles, TerminalSquare } from 'lucide-react';

type ActiveTab = 'copilot' | 'terminal';

interface TabBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const { t } = useTranslation();

  const tabs = [
    { id: 'copilot' as const, label: t('tabBar.copilot', 'Copilot'), icon: Sparkles },
    { id: 'terminal' as const, label: t('tabBar.terminal', 'Terminal'), icon: TerminalSquare },
  ];

  return (
    <div className="h-10 flex items-center gap-1 px-4 bg-bg-primary border-b border-border-subtle shrink-0">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              isActive
                ? 'text-accent bg-accent-soft'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
            }`}
          >
            <Icon size={16} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
