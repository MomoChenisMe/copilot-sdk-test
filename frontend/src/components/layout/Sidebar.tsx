import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Conversation, SearchResult } from '../../lib/api';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onRename: (id: string, title: string) => void;
  onSearch: (query: string) => Promise<SearchResult[]>;
}

function useFormatTime() {
  const { t } = useTranslation();

  return (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return t('sidebar.justNow');
    if (diffMin < 60) return t('sidebar.minutesAgo', { count: diffMin });
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return t('sidebar.hoursAgo', { count: diffH });
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return t('sidebar.daysAgo', { count: diffD });
    return date.toLocaleDateString();
  };
}

export function Sidebar({
  open,
  onClose,
  conversations,
  activeConversationId,
  onSelect,
  onCreate,
  onDelete,
  onPin,
  onRename,
  onSearch,
}: SidebarProps) {
  const { t } = useTranslation();
  const formatTime = useFormatTime();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length === 0) {
      setSearchResults(null);
      return;
    }
    const results = await onSearch(q.trim());
    setSearchResults(results);
  };

  const startRename = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const commitRename = () => {
    if (editingId && editTitle.trim()) {
      onRename(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  const pinnedConversations = conversations.filter((c) => c.pinned);
  const recentConversations = conversations.filter((c) => !c.pinned);

  const renderConversationItem = (conv: Conversation) => {
    const isActive = conv.id === activeConversationId;
    return (
      <div
        key={conv.id}
        data-active={isActive}
        className={`group flex items-center px-4 py-3 cursor-pointer hover:bg-bg-tertiary transition-colors ${
          isActive ? 'bg-bg-tertiary border-l-2 border-accent' : ''
        }`}
        onClick={() => onSelect(conv.id)}
      >
        {/* Title + time */}
        <div className="flex-1 min-w-0">
          {editingId === conv.id ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') setEditingId(null);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-bg-input text-text-primary text-sm px-1 py-0.5 rounded border border-accent focus:outline-none"
              autoFocus
            />
          ) : (
            <p className="text-text-primary text-sm truncate">{conv.title}</p>
          )}
          <p className="text-text-muted text-xs mt-0.5">{formatTime(conv.updatedAt)}</p>
        </div>

        {/* Actions (visible on hover) */}
        <div className="hidden group-hover:flex items-center gap-1 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              startRename(conv);
            }}
            className="text-text-muted hover:text-text-primary text-xs p-1"
            title={t('sidebar.rename')}
          >
            ✎
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPin(conv.id, !conv.pinned);
            }}
            className="text-text-muted hover:text-warning text-xs p-1"
            title={conv.pinned ? t('sidebar.unpin') : t('sidebar.pin')}
          >
            {conv.pinned ? '★' : '☆'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(conv.id);
            }}
            className="text-text-muted hover:text-error text-xs p-1"
            title={t('sidebar.delete')}
          >
            ✕
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
          data-testid="sidebar-backdrop"
        />
      )}

      {/* Sidebar panel */}
      <div
        data-testid="sidebar-panel"
        className={`fixed top-0 left-0 h-full w-72 bg-bg-secondary z-50 flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-text-primary font-semibold text-lg">{t('sidebar.conversations')}</h2>
          <button
            onClick={onCreate}
            className="px-3 py-1 bg-accent text-white text-sm rounded hover:bg-accent-hover transition-colors"
          >
            {t('sidebar.new')}
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <input
            type="text"
            placeholder={t('sidebar.search')}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-3 py-2 bg-bg-input text-text-primary rounded border border-border text-sm placeholder:text-text-muted focus:outline-none focus:border-accent"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {searchResults ? (
            // Search results view
            searchResults.length === 0 ? (
              <p className="px-4 py-3 text-text-muted text-sm">{t('sidebar.noResults')}</p>
            ) : (
              searchResults.map((result) => (
                <button
                  key={`${result.conversationId}-${result.snippet}`}
                  onClick={() => {
                    onSelect(result.conversationId);
                    setSearchQuery('');
                    setSearchResults(null);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-bg-tertiary transition-colors border-b border-border"
                >
                  <p className="text-text-primary text-sm font-medium truncate">
                    {result.conversationTitle}
                  </p>
                  <p
                    className="text-text-muted text-xs mt-1 truncate"
                    dangerouslySetInnerHTML={{ __html: result.snippet }}
                  />
                </button>
              ))
            )
          ) : (
            <>
              {/* Pinned section */}
              {pinnedConversations.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                    {t('sidebar.pinned')}
                  </p>
                  {pinnedConversations.map(renderConversationItem)}
                </div>
              )}

              {/* Recent section */}
              <div>
                <p className="px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  {t('sidebar.recent')}
                </p>
                {recentConversations.length > 0 ? (
                  recentConversations.map(renderConversationItem)
                ) : (
                  <p className="px-4 py-3 text-text-muted text-sm">{t('sidebar.noConversations')}</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
