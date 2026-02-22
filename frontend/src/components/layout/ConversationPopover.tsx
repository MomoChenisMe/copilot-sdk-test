import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Trash2, Clock } from 'lucide-react';

export interface ConversationPopoverProps {
  open: boolean;
  onClose: () => void;
  conversations: Array<{ id: string; title: string; pinned?: boolean; updatedAt?: string; cronEnabled?: boolean }>;
  currentConversationId: string | null;
  onSelect: (conversationId: string) => void;
  onNew: () => void;
  onDelete?: (conversationId: string) => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export function ConversationPopover({
  open,
  onClose,
  conversations,
  currentConversationId,
  onSelect,
  onNew,
  onDelete,
  anchorRef,
}: ConversationPopoverProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter conversations by search query
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  // Group into pinned and recent
  const pinned = useMemo(() => filtered.filter((c) => c.pinned), [filtered]);
  const recent = useMemo(() => filtered.filter((c) => !c.pinned), [filtered]);

  // Flat list for keyboard navigation (pinned first, then recent)
  const flatList = useMemo(() => [...pinned, ...recent], [pinned, recent]);

  // Reset state when popover opens/closes
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setHighlightIndex(-1);
      setConfirmingDeleteId(null);
      setHoveredId(null);
      // Autofocus the search input after mount
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [open]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-popover-item]');
    const item = items[highlightIndex] as HTMLElement | undefined;
    if (item && typeof item.scrollIntoView === 'function') {
      item.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightIndex((prev) => {
            const next = prev + 1;
            return next >= flatList.length ? 0 : next;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightIndex((prev) => {
            const next = prev - 1;
            return next < 0 ? flatList.length - 1 : next;
          });
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightIndex >= 0 && highlightIndex < flatList.length) {
            onSelect(flatList[highlightIndex].id);
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [flatList, highlightIndex, onSelect, onClose],
  );

  // Calculate position from anchor element
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => {
    if (!open || !anchorRef?.current) {
      setPosition(null);
      return;
    }
    const rect = anchorRef.current.getBoundingClientRect();
    const popoverWidth = 288; // w-72 = 18rem = 288px
    const maxLeft = window.innerWidth - popoverWidth - 16;
    setPosition({ top: rect.bottom + 4, left: Math.min(rect.left, Math.max(0, maxLeft)) });
  }, [open, anchorRef]);

  if (!open) return null;

  const renderItem = (conv: (typeof conversations)[number], index: number) => {
    const isCurrent = conv.id === currentConversationId;
    const isHighlighted = index === highlightIndex;
    const isHovered = hoveredId === conv.id;
    const isConfirming = confirmingDeleteId === conv.id;

    if (isConfirming) {
      return (
        <div
          key={conv.id}
          data-popover-item
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-error/10"
        >
          <span className="flex-1 truncate text-text-secondary">{t('sidebar.deleteConfirm', 'Delete?')}</span>
          <button
            data-testid={`confirm-delete-${conv.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(conv.id);
              setConfirmingDeleteId(null);
            }}
            className="px-2 py-0.5 text-xs rounded bg-error text-white hover:bg-error/80 transition-colors"
          >
            {t('common.delete', 'Delete')}
          </button>
          <button
            data-testid={`cancel-delete-${conv.id}`}
            onClick={(e) => {
              e.stopPropagation();
              setConfirmingDeleteId(null);
            }}
            className="px-2 py-0.5 text-xs rounded bg-bg-tertiary text-text-secondary hover:bg-bg-secondary transition-colors"
          >
            {t('common.cancel', 'Cancel')}
          </button>
        </div>
      );
    }

    return (
      <div
        key={conv.id}
        data-popover-item
        data-testid={`popover-item-${conv.id}`}
        className={`relative flex items-center w-full text-left px-3 py-2 text-sm rounded-md transition-colors cursor-pointer ${
          isCurrent
            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-text-primary font-medium'
            : isHighlighted
              ? 'bg-bg-tertiary text-text-primary'
              : 'text-text-secondary hover:bg-bg-tertiary'
        }`}
        onClick={() => {
          onSelect(conv.id);
          onClose();
        }}
        onMouseEnter={() => setHoveredId(conv.id)}
        onMouseLeave={() => setHoveredId(null)}
      >
        {conv.cronEnabled && <Clock size={10} className="shrink-0 text-accent" />}
        <span className="block truncate flex-1">{conv.title}</span>
        {onDelete && isHovered && (
          <button
            data-testid={`delete-conv-${conv.id}`}
            onClick={(e) => {
              e.stopPropagation();
              setConfirmingDeleteId(conv.id);
            }}
            className="shrink-0 p-1 rounded text-text-muted hover:text-error hover:bg-error/10 transition-colors"
            aria-label={t('sidebar.deleteConversation', 'Delete conversation')}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    );
  };

  // Track a running index across pinned + recent sections
  let runningIndex = 0;

  const popoverStyle: React.CSSProperties = position
    ? { position: 'fixed', top: position.top, left: position.left }
    : { position: 'absolute', top: '100%', left: 0, marginTop: 4 };

  const content = (
    <>
      {/* Invisible backdrop to close popover on outside click */}
      <div
        data-testid="popover-backdrop"
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Popover container */}
      <div
        data-testid="conversation-popover"
        style={popoverStyle}
        className="w-72 max-w-[calc(100vw-2rem)] bg-bg-primary border border-border-subtle rounded-lg shadow-lg z-50 flex flex-col max-h-80"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="p-2 border-b border-border-subtle flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={t('sidebar.search')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightIndex(-1);
              }}
              className="w-full pl-7 pr-2 py-1.5 bg-bg-tertiary text-text-primary rounded-md text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              data-testid="popover-search"
            />
          </div>
          <button
            data-testid="popover-new-button"
            onClick={() => {
              onNew();
              onClose();
            }}
            className="shrink-0 p-1.5 text-text-muted hover:text-accent hover:bg-bg-tertiary rounded-md transition-colors"
            title={t('sidebar.new')}
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Conversation list */}
        <div ref={listRef} className="overflow-y-auto flex-1 p-1" data-testid="popover-list">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-text-muted" data-testid="popover-no-results">
              {t('sidebar.noResults')}
            </p>
          ) : (
            <>
              {/* Pinned section */}
              {pinned.length > 0 && (
                <div>
                  <p className="px-3 py-1 text-xs font-semibold text-text-muted uppercase tracking-wider">
                    {t('sidebar.pinned')}
                  </p>
                  {pinned.map((conv) => {
                    const el = renderItem(conv, runningIndex);
                    runningIndex++;
                    return el;
                  })}
                </div>
              )}

              {/* Recent section */}
              {recent.length > 0 && (
                <div>
                  <p className="px-3 py-1 text-xs font-semibold text-text-muted uppercase tracking-wider">
                    {t('sidebar.recent')}
                  </p>
                  {recent.map((conv) => {
                    const el = renderItem(conv, runningIndex);
                    runningIndex++;
                    return el;
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );

  // Use portal when anchorRef is available (production), fallback for tests
  if (anchorRef) {
    return createPortal(content, document.body);
  }
  return content;
}
