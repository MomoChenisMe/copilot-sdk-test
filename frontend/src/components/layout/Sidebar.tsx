import { useState } from 'react';
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

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-bg-secondary z-50 flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-text-primary font-semibold text-lg">Conversations</h2>
          <button
            onClick={onCreate}
            className="px-3 py-1 bg-accent text-white text-sm rounded hover:bg-accent-hover transition-colors"
          >
            + New
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2">
          <input
            type="text"
            placeholder="Search..."
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
              <p className="px-4 py-3 text-text-muted text-sm">No results found</p>
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
            // Conversation list view
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center px-4 py-3 border-b border-border cursor-pointer hover:bg-bg-tertiary transition-colors ${
                  conv.id === activeConversationId ? 'bg-bg-tertiary' : ''
                }`}
                onClick={() => onSelect(conv.id)}
              >
                {/* Pin indicator */}
                {conv.pinned && (
                  <span className="text-warning text-xs mr-2" title="Pinned">
                    ★
                  </span>
                )}

                {/* Title */}
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
                  <p className="text-text-muted text-xs mt-0.5">{conv.model}</p>
                </div>

                {/* Actions (visible on hover) */}
                <div className="hidden group-hover:flex items-center gap-1 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startRename(conv);
                    }}
                    className="text-text-muted hover:text-text-primary text-xs p-1"
                    title="Rename"
                  >
                    ✎
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPin(conv.id, !conv.pinned);
                    }}
                    className="text-text-muted hover:text-warning text-xs p-1"
                    title={conv.pinned ? 'Unpin' : 'Pin'}
                  >
                    {conv.pinned ? '★' : '☆'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv.id);
                    }}
                    className="text-text-muted hover:text-error text-xs p-1"
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
