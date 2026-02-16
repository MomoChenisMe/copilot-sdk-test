import { useTranslation } from 'react-i18next';
import { Plus, X, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../../store';

interface TabBarProps {
  onNewTab: () => void;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
}

export function TabBar({ onNewTab, onSelectTab, onCloseTab }: TabBarProps) {
  const { t } = useTranslation();
  const tabOrder = useAppStore((s) => s.tabOrder);
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const activeStreams = useAppStore((s) => s.activeStreams);
  const tabLimitWarning = useAppStore((s) => s.tabLimitWarning);

  return (
    <div className="h-10 flex items-center gap-1 px-2 bg-bg-primary border-b border-border-subtle shrink-0 overflow-x-auto flex-nowrap">
      {tabOrder.map((tabId) => {
        const tab = tabs[tabId];
        if (!tab) return null;
        const isActive = activeTabId === tabId;
        const isStreaming = !!activeStreams[tab.conversationId];

        return (
          <button
            key={tabId}
            data-testid={`tab-${tabId}`}
            onClick={() => onSelectTab(tabId)}
            onAuxClick={(e) => {
              if (e.button === 1) onCloseTab(tabId);
            }}
            className={`group flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors shrink-0 ${
              isActive
                ? 'text-accent bg-accent-soft'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
            }`}
          >
            {isStreaming && (
              <span
                data-testid={`tab-streaming-${tabId}`}
                className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0"
              />
            )}
            <span className="max-w-32 truncate">{tab.title}</span>
            <span
              data-testid={`tab-close-${tabId}`}
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tabId);
              }}
              className="shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-bg-tertiary transition-opacity"
            >
              <X size={12} />
            </span>
          </button>
        );
      })}

      {/* Tab limit warning */}
      {tabLimitWarning && (
        <span
          data-testid="tab-limit-warning"
          className="shrink-0 flex items-center gap-1 px-2 py-1 text-xs text-warning"
          title={t('tabBar.tabLimit')}
        >
          <AlertTriangle size={14} />
        </span>
      )}

      {/* New Tab button */}
      <button
        data-testid="new-tab-button"
        onClick={onNewTab}
        className="shrink-0 p-1.5 text-text-muted hover:text-text-secondary hover:bg-bg-tertiary rounded-lg transition-colors"
        title={t('tabBar.newTab', 'New Tab')}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
