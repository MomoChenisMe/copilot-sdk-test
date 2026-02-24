import { useState, useRef, useCallback, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Plus, X, AlertTriangle, ChevronDown, History, Clock, Trash2, XCircle, Palette } from 'lucide-react';
import { useAppStore } from '../../store';
import { ConversationPopover } from './ConversationPopover';
import { ConfirmDialog } from '../shared/ConfirmDialog';

// ── Color palette ─────────────────────────────────────────────────────────

const TAB_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
];

// ── Tab Context Menu ──────────────────────────────────────────────────────

interface ContextMenuState {
  tabId: string;
  x: number;
  y: number;
}

function TabContextMenu({
  state,
  hasConversation,
  tabColor,
  onClose,
  onCloseTab,
  onRequestDelete,
  onSetColor,
  onClearColor,
}: {
  state: ContextMenuState;
  hasConversation: boolean;
  tabColor?: string;
  onClose: () => void;
  onCloseTab: () => void;
  onRequestDelete: () => void;
  onSetColor: (color: string) => void;
  onClearColor: () => void;
}) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [showPalette, setShowPalette] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] min-w-[160px] py-1 rounded-lg border border-border bg-bg-primary shadow-lg"
      style={{ left: state.x, top: state.y }}
    >
      <button
        onClick={() => { onCloseTab(); onClose(); }}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-tertiary transition-colors text-left"
      >
        <XCircle size={13} />
        {t('tabBar.closeTab', 'Close tab')}
      </button>
      <button
        onClick={() => setShowPalette(!showPalette)}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-tertiary transition-colors text-left"
      >
        <Palette size={13} />
        {t('tabBar.setColor', 'Set color')}
      </button>
      {showPalette && (
        <div data-testid="color-palette" className="flex flex-wrap gap-1.5 px-3 py-2">
          {TAB_COLORS.map((c) => (
            <button
              key={c}
              data-testid={`color-swatch-${c}`}
              onClick={() => { onSetColor(c); onClose(); }}
              className="w-5 h-5 rounded-full border border-border hover:scale-110 transition-transform"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}
      {tabColor && (
        <button
          onClick={() => { onClearColor(); onClose(); }}
          className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-tertiary transition-colors text-left"
        >
          <X size={13} />
          {t('tabBar.clearColor', 'Clear color')}
        </button>
      )}
      {hasConversation && (
        <button
          onClick={() => {
            onRequestDelete();
            onClose();
          }}
          className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors text-left"
        >
          <Trash2 size={13} />
          {t('tabBar.deleteConversation', 'Delete conversation')}
        </button>
      )}
    </div>
  );
}

interface TabBarProps {
  onNewTab: () => void;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onSwitchConversation: (tabId: string, conversationId: string) => void;
  onDeleteConversation?: (conversationId: string) => void;
  onDeleteTabConversation?: (tabId: string) => void;
  onOpenConversation?: (conversationId: string) => void;
  conversations: Array<{ id: string; title: string; pinned?: boolean; updatedAt?: string; cronEnabled?: boolean }>;
}

export function TabBar({ onNewTab, onSelectTab, onCloseTab, onSwitchConversation, onDeleteConversation, onDeleteTabConversation, onOpenConversation, conversations }: TabBarProps) {
  const { t } = useTranslation();
  const tabOrder = useAppStore((s) => s.tabOrder);
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const activeStreams = useAppStore((s) => s.activeStreams);
  const tabLimitWarning = useAppStore((s) => s.tabLimitWarning);

  const reorderTabs = useAppStore((s) => s.reorderTabs);
  const setTabCustomTitle = useAppStore((s) => s.setTabCustomTitle);
  const setTabColor = useAppStore((s) => s.setTabColor);
  const [popoverTabId, setPopoverTabId] = useState<string | null>(null);
  const [globalHistoryOpen, setGlobalHistoryOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [deleteDialogTabId, setDeleteDialogTabId] = useState<string | null>(null);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabTitleRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const historyButtonRef = useRef<HTMLButtonElement | null>(null);

  // Drag state
  const [dragTabId, setDragTabId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tabElsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const dragInfoRef = useRef<{ tabId: string; startX: number; active: boolean } | null>(null);
  const wasDraggingRef = useRef(false);
  const swapAnimatingRef = useRef<string | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent, tabId: string) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-testid^="tab-close-"]') || target.closest('[data-testid^="tab-chevron-"]')) return;
    dragInfoRef.current = { tabId, startX: e.clientX, active: false };
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const info = dragInfoRef.current;
    if (!info) return;
    const dx = e.clientX - info.startX;
    if (!info.active) {
      if (Math.abs(dx) < 5) return;
      info.active = true;
      containerRef.current?.setPointerCapture(e.pointerId);
      setDragTabId(info.tabId);
      setPopoverTabId(null);
    }
    // Immediate swap: when pointer crosses another tab's midpoint, reorder instantly
    for (const [id, el] of Object.entries(tabElsRef.current)) {
      if (!el || id === info.tabId) continue;
      const rect = el.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right) continue;
      const mid = rect.left + rect.width / 2;
      const order = useAppStore.getState().tabOrder;
      const dragIdx = order.indexOf(info.tabId);
      const targetIdx = order.indexOf(id);
      if (dragIdx === -1 || targetIdx === -1) break;
      if ((dragIdx < targetIdx && e.clientX > mid) || (dragIdx > targetIdx && e.clientX < mid)) {
        // FLIP: record positions before swap
        const dragEl = tabElsRef.current[info.tabId];
        const prevOffset = dragEl?.offsetLeft ?? 0;
        const swappedEl = el;
        const swappedPrevOffset = swappedEl.offsetLeft;

        // Clear any ongoing swap animation on previous tab
        if (swapAnimatingRef.current) {
          const prevSwapEl = tabElsRef.current[swapAnimatingRef.current];
          if (prevSwapEl) {
            prevSwapEl.style.transition = '';
            prevSwapEl.style.transform = '';
          }
          swapAnimatingRef.current = null;
        }

        const next = [...order];
        next.splice(dragIdx, 1);
        next.splice(targetIdx, 0, info.tabId);
        flushSync(() => { reorderTabs(next); });

        // Adjust startX so translateX stays visually consistent
        const newOffset = dragEl?.offsetLeft ?? 0;
        info.startX += (newOffset - prevOffset);

        // FLIP animate the swapped tab
        const swappedNewOffset = swappedEl.offsetLeft;
        const swapDiff = swappedPrevOffset - swappedNewOffset;
        if (swapDiff !== 0) {
          swapAnimatingRef.current = id;
          swappedEl.style.transform = `translateX(${swapDiff}px)`;
          requestAnimationFrame(() => {
            swappedEl.style.transition = 'transform 120ms ease-out';
            swappedEl.style.transform = 'translateX(0)';
            const swapCleanup = () => {
              swappedEl.style.transition = '';
              swappedEl.style.transform = '';
              if (swapAnimatingRef.current === id) swapAnimatingRef.current = null;
            };
            swappedEl.addEventListener('transitionend', swapCleanup, { once: true });
            setTimeout(swapCleanup, 150);
          });
        }
      }
      break;
    }
    // Imperatively update transform for smooth cursor-following (no React re-render)
    const dragEl = tabElsRef.current[info.tabId];
    if (dragEl) {
      dragEl.style.transform = `translateX(${e.clientX - info.startX}px)`;
    }
  }, [reorderTabs]);

  const handlePointerUp = useCallback(() => {
    const info = dragInfoRef.current;
    if (!info) return;
    // Null out immediately to stop handlePointerMove from processing
    dragInfoRef.current = null;
    if (info.active) {
      wasDraggingRef.current = true;
      const dragEl = tabElsRef.current[info.tabId];
      if (dragEl) {
        // Animate back to 0 synchronously (no rAF wrapper)
        dragEl.style.transition = 'transform 120ms ease-out';
        dragEl.style.transform = 'translateX(0)';
        const cleanup = () => {
          dragEl.style.transition = '';
          dragEl.style.transform = '';
          setDragTabId(null);
          wasDraggingRef.current = false;
        };
        dragEl.addEventListener('transitionend', cleanup, { once: true });
        // Cleanup guard in case transitionend doesn't fire
        setTimeout(cleanup, 150);
      } else {
        setDragTabId(null);
        wasDraggingRef.current = false;
      }
    } else {
      setDragTabId(null);
    }
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
    <div
      ref={containerRef}
      className={`h-10 flex items-center gap-1 px-2 bg-bg-primary border-b border-border-subtle shrink-0 overflow-x-auto flex-nowrap ${dragTabId ? 'select-none cursor-grabbing' : ''}`}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {tabOrder.map((tabId) => {
        const tab = tabs[tabId];
        if (!tab) return null;
        const isActive = activeTabId === tabId;
        const isStreaming = tab.conversationId ? !!activeStreams[tab.conversationId] : false;

        const isDragging = dragTabId === tabId;
        const displayTitle = tab.customTitle || tab.title;
        const tabBgStyle: React.CSSProperties = tab.color
          ? { backgroundColor: `${tab.color}${isActive ? '1a' : '0d'}` }
          : {};

        return (
          <div
            key={tabId}
            ref={(el) => { tabElsRef.current[tabId] = el; }}
            className={`relative ${isDragging ? 'z-50 shadow-lg opacity-90' : 'cursor-grab'}`}
            onPointerDown={(e) => handlePointerDown(e, tabId)}
            onContextMenu={(e) => {
              e.preventDefault();
              if (wasDraggingRef.current) return;
              setContextMenu({ tabId, x: e.clientX, y: e.clientY });
            }}
            onTouchStart={(e) => {
              if (longPressTimer.current) clearTimeout(longPressTimer.current);
              const touch = e.touches[0];
              const x = touch.clientX;
              const y = touch.clientY;
              longPressTimer.current = setTimeout(() => {
                setContextMenu({ tabId, x, y });
              }, 500);
            }}
            onTouchEnd={() => {
              if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
            }}
            onTouchMove={() => {
              if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
            }}
          >
            <button
              data-testid={`tab-${tabId}`}
              onClick={() => { if (!wasDraggingRef.current) onSelectTab(tabId); }}
              onAuxClick={(e) => {
                if (e.button === 1 && !wasDraggingRef.current) onCloseTab(tabId);
              }}
              className={`group flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors shrink-0 ${
                isActive
                  ? 'text-accent bg-accent-soft'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
              }`}
              style={tabBgStyle}
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
              {editingTabId === tabId ? (
                <input
                  data-testid={`tab-rename-input-${tabId}`}
                  className="max-w-32 bg-transparent border-b border-accent outline-none text-sm"
                  value={editValue}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const trimmed = editValue.trim();
                      if (trimmed) setTabCustomTitle(tabId, trimmed);
                      setEditingTabId(null);
                    } else if (e.key === 'Escape') {
                      setEditingTabId(null);
                    }
                  }}
                  onBlur={() => {
                    const trimmed = editValue.trim();
                    if (trimmed) setTabCustomTitle(tabId, trimmed);
                    setEditingTabId(null);
                  }}
                />
              ) : (
                <span
                  data-testid={`tab-title-${tabId}`}
                  className="max-w-32 truncate"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingTabId(tabId);
                    setEditValue(displayTitle);
                  }}
                >
                  {displayTitle}
                </span>
              )}
              <span
                ref={(el) => { tabTitleRefs.current[tabId] = el; }}
                data-testid={`tab-chevron-${tabId}`}
                role="button"
                tabIndex={-1}
                className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  if (wasDraggingRef.current) return;
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
                  if (wasDraggingRef.current) return;
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

      {/* Tab context menu */}
      {contextMenu && (
        <TabContextMenu
          state={contextMenu}
          hasConversation={!!tabs[contextMenu.tabId]?.conversationId}
          tabColor={tabs[contextMenu.tabId]?.color}
          onClose={() => setContextMenu(null)}
          onCloseTab={() => onCloseTab(contextMenu.tabId)}
          onRequestDelete={() => setDeleteDialogTabId(contextMenu.tabId)}
          onSetColor={(color) => setTabColor(contextMenu.tabId, color)}
          onClearColor={() => setTabColor(contextMenu.tabId, undefined)}
        />
      )}

      {/* Delete conversation confirm dialog */}
      <ConfirmDialog
        open={deleteDialogTabId !== null}
        title={t('tabBar.deleteConversation', 'Delete conversation')}
        description={t('tabBar.deleteConfirm', 'Delete this conversation? This cannot be undone.')}
        destructive
        confirmLabel={t('common.delete', 'Delete')}
        onConfirm={() => {
          if (deleteDialogTabId) onDeleteTabConversation?.(deleteDialogTabId);
          setDeleteDialogTabId(null);
        }}
        onCancel={() => setDeleteDialogTabId(null)}
      />
    </div>
  );
}
