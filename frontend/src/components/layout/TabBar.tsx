import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, AlertTriangle, ChevronDown, History, Clock } from 'lucide-react';
import { useAppStore } from '../../store';
import { ConversationPopover } from './ConversationPopover';

interface TabBarProps {
  onNewTab: () => void;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onSwitchConversation: (tabId: string, conversationId: string) => void;
  onDeleteConversation?: (conversationId: string) => void;
  onOpenConversation?: (conversationId: string) => void;
  onOpenCronTab?: () => void;
  conversations: Array<{ id: string; title: string; pinned?: boolean; updatedAt?: string }>;
}

export function TabBar({ onNewTab, onSelectTab, onCloseTab, onSwitchConversation, onDeleteConversation, onOpenConversation, onOpenCronTab, conversations }: TabBarProps) {
  const { t } = useTranslation();
  const tabOrder = useAppStore((s) => s.tabOrder);
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const activeStreams = useAppStore((s) => s.activeStreams);
  const tabLimitWarning = useAppStore((s) => s.tabLimitWarning);
  const cronUnreadCount = useAppStore((s) => s.cronUnreadCount);
  const cronFailedCount = useAppStore((s) => s.cronFailedCount);

  const [popoverTabId, setPopoverTabId] = useState<string | null>(null);
  const [globalHistoryOpen, setGlobalHistoryOpen] = useState(false);
  const tabTitleRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const historyButtonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div className="h-10 flex items-center gap-1 px-2 bg-bg-primary border-b border-border-subtle shrink-0 overflow-x-auto flex-nowrap">
      {tabOrder.map((tabId) => {
        const tab = tabs[tabId];
        if (!tab) return null;
        const isActive = activeTabId === tabId;
        const isStreaming = tab.conversationId ? !!activeStreams[tab.conversationId] : false;

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
              onDelete={onDeleteConversation}
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

      {/* Cron tab button with badge */}
      {onOpenCronTab && (
        <button
          data-testid="cron-tab-button"
          onClick={onOpenCronTab}
          className="relative shrink-0 p-1.5 text-text-muted hover:text-text-secondary hover:bg-bg-tertiary rounded-lg transition-colors"
          title={t('cron.title')}
        >
          <Clock size={16} />
          {(cronUnreadCount > 0 || cronFailedCount > 0) && (
            <span
              className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center text-[10px] font-bold text-white rounded-full px-1 ${
                cronFailedCount > 0 ? 'bg-red-500' : 'bg-accent'
              }`}
            >
              {cronUnreadCount + cronFailedCount}
            </span>
          )}
        </button>
      )}

      {/* Global history dropdown button */}
      <div className="relative shrink-0">
        <button
          ref={historyButtonRef}
          data-testid="history-dropdown-button"
          onClick={() => setGlobalHistoryOpen(!globalHistoryOpen)}
          className="p-1.5 text-text-muted hover:text-text-secondary hover:bg-bg-tertiary rounded-lg transition-colors"
          title={t('tabBar.history')}
        >
          <History size={16} />
        </button>
        <ConversationPopover
          open={globalHistoryOpen}
          onClose={() => setGlobalHistoryOpen(false)}
          conversations={conversations}
          currentConversationId={null}
          onSelect={(conversationId) => {
            onOpenConversation?.(conversationId);
            setGlobalHistoryOpen(false);
          }}
          onNew={() => {
            onNewTab();
            setGlobalHistoryOpen(false);
          }}
          onDelete={onDeleteConversation}
          anchorRef={historyButtonRef}
        />
      </div>
    </div>
  );
}
