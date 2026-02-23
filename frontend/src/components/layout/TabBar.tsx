import { useState, useRef, useCallback, useEffect } from 'react';
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
  conversations: Array<{ id: string; title: string; pinned?: boolean; updatedAt?: string; cronEnabled?: boolean }>;
}

export function TabBar({ onNewTab, onSelectTab, onCloseTab, onSwitchConversation, onDeleteConversation, onOpenConversation, conversations }: TabBarProps) {
  const { t } = useTranslation();
  const tabOrder = useAppStore((s) => s.tabOrder);
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const activeStreams = useAppStore((s) => s.activeStreams);
  const tabLimitWarning = useAppStore((s) => s.tabLimitWarning);

  const reorderTabs = useAppStore((s) => s.reorderTabs);
  const [popoverTabId, setPopoverTabId] = useState<string | null>(null);
  const [globalHistoryOpen, setGlobalHistoryOpen] = useState(false);
  const tabTitleRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const historyButtonRef = useRef<HTMLButtonElement | null>(null);

  // Drag state
  const [dragTabId, setDragTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const [dragSide, setDragSide] = useState<'left' | 'right'>('left');

  const handleDragStart = useCallback((e: React.DragEvent, tabId: string) => {
    setDragTabId(tabId);
    setPopoverTabId(null); // Close any open popover
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tabId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, tabId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragTabId || dragTabId === tabId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    setDragOverTabId(tabId);
    setDragSide(e.clientX < midX ? 'left' : 'right');
  }, [dragTabId]);

  const handleDragLeave = useCallback(() => {
    setDragOverTabId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetTabId: string) => {
    e.preventDefault();
    if (!dragTabId || dragTabId === targetTabId) {
      setDragTabId(null);
      setDragOverTabId(null);
      return;
    }
    const newOrder = tabOrder.filter((id) => id !== dragTabId);
    const targetIndex = newOrder.indexOf(targetTabId);
    const insertIndex = dragSide === 'left' ? targetIndex : targetIndex + 1;
    newOrder.splice(insertIndex, 0, dragTabId);
    reorderTabs(newOrder);
    setDragTabId(null);
    setDragOverTabId(null);
  }, [dragTabId, dragSide, tabOrder, reorderTabs]);

  const handleDragEnd = useCallback(() => {
    setDragTabId(null);
    setDragOverTabId(null);
  }, []);

  // Keyboard tab reordering: Ctrl+Shift+Arrow
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !e.shiftKey || !activeTabId) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const currentIndex = tabOrder.indexOf(activeTabId);
      if (currentIndex === -1) return;
      const newOrder = [...tabOrder];
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        [newOrder[currentIndex], newOrder[currentIndex - 1]] = [newOrder[currentIndex - 1], newOrder[currentIndex]];
        reorderTabs(newOrder);
      } else if (e.key === 'ArrowRight' && currentIndex < newOrder.length - 1) {
        [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]];
        reorderTabs(newOrder);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [tabOrder, activeTabId, reorderTabs]);

  return (
    <div className="h-10 flex items-center gap-1 px-2 bg-bg-primary border-b border-border-subtle shrink-0 overflow-x-auto flex-nowrap">
      {tabOrder.map((tabId) => {
        const tab = tabs[tabId];
        if (!tab) return null;
        const isActive = activeTabId === tabId;
        const isStreaming = tab.conversationId ? !!activeStreams[tab.conversationId] : false;

        const isDragging = dragTabId === tabId;
        const isDropTarget = dragOverTabId === tabId && dragTabId !== tabId;

        return (
          <div
            key={tabId}
            className={`relative ${isDragging ? 'opacity-30' : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, tabId)}
            onDragOver={(e) => handleDragOver(e, tabId)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, tabId)}
            onDragEnd={handleDragEnd}
          >
            {/* Left drop indicator */}
            {isDropTarget && dragSide === 'left' && (
              <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-accent rounded-full z-10" />
            )}
            {/* Right drop indicator */}
            {isDropTarget && dragSide === 'right' && (
              <div className="absolute right-0 top-1 bottom-1 w-0.5 bg-accent rounded-full z-10" />
            )}
            <button
              data-testid={`tab-${tabId}`}
              onClick={() => { if (!dragTabId) onSelectTab(tabId); }}
              onAuxClick={(e) => {
                if (e.button === 1 && !dragTabId) onCloseTab(tabId);
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
              {tab.conversationId && conversations.find((c) => c.id === tab.conversationId)?.cronEnabled && (
                <Clock size={10} className="shrink-0 text-accent" />
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
                  if (dragTabId) return;
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
                  if (dragTabId) return;
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
