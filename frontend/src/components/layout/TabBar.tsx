import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, AlertTriangle, ChevronDown } from 'lucide-react';
import { useAppStore } from '../../store';
import { ConversationPopover } from './ConversationPopover';

interface TabBarProps {
  onNewTab: () => void;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onSwitchConversation: (tabId: string, conversationId: string) => void;
  conversations: Array<{ id: string; title: string; pinned?: boolean; updatedAt?: string }>;
}

export function TabBar({ onNewTab, onSelectTab, onCloseTab, onSwitchConversation, conversations }: TabBarProps) {
  const { t } = useTranslation();
  const tabOrder = useAppStore((s) => s.tabOrder);
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const activeStreams = useAppStore((s) => s.activeStreams);
  const tabLimitWarning = useAppStore((s) => s.tabLimitWarning);

  const [popoverTabId, setPopoverTabId] = useState<string | null>(null);
  const tabTitleRefs = useRef<Record<string, HTMLSpanElement | null>>({});

  return (
    <div className="h-10 flex items-center gap-1 px-2 bg-bg-primary border-b border-border-subtle shrink-0 overflow-x-auto flex-nowrap">
      {tabOrder.map((tabId) => {
        const tab = tabs[tabId];
        if (!tab) return null;
        const isActive = activeTabId === tabId;
        const isStreaming = !!activeStreams[tab.conversationId];

        return (
          <div key={tabId} className="relative">
            <button
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
              <span
                data-testid={`tab-title-${tabId}`}
                className="max-w-32 truncate"
              >
                {tab.title}
              </span>
              <span
                ref={(el) => { tabTitleRefs.current[tabId] = el; }}
                data-testid={`tab-chevron-${tabId}`}
                role="button"
                tabIndex={-1}
                className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setPopoverTabId(popoverTabId === tabId ? null : tabId);
                }}
              >
                <ChevronDown size={12} />
              </span>
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

            {/* ConversationPopover */}
            <ConversationPopover
              open={popoverTabId === tabId}
              onClose={() => setPopoverTabId(null)}
              conversations={conversations}
              currentConversationId={tab.conversationId}
              onSelect={(conversationId) => {
                onSwitchConversation(tabId, conversationId);
                setPopoverTabId(null);
              }}
              onNew={() => {
                onNewTab();
                setPopoverTabId(null);
              }}
              anchorRef={{ current: tabTitleRefs.current[tabId] ?? null }}
            />
          </div>
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
