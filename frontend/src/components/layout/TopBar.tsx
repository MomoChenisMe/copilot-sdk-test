import { useState, useCallback } from 'react';
import type { WsStatus } from '../../lib/ws-types';
import { ConnectionBadge } from '../shared/ConnectionBadge';

interface TopBarProps {
  title: string;
  cwd: string;
  status: WsStatus;
  onMenuClick: () => void;
  onCwdChange: (cwd: string) => void;
}

export function TopBar({ title, cwd, status, onMenuClick, onCwdChange }: TopBarProps) {
  const [editingCwd, setEditingCwd] = useState(false);
  const [cwdValue, setCwdValue] = useState(cwd);

  const startEdit = useCallback(() => {
    setCwdValue(cwd);
    setEditingCwd(true);
  }, [cwd]);

  const commitEdit = useCallback(() => {
    const trimmed = cwdValue.trim();
    if (trimmed && trimmed !== cwd) {
      onCwdChange(trimmed);
    }
    setEditingCwd(false);
  }, [cwdValue, cwd, onCwdChange]);

  const cancelEdit = useCallback(() => {
    setEditingCwd(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      }
    },
    [commitEdit, cancelEdit],
  );

  return (
    <header className="flex items-center gap-3 px-3 py-2 bg-bg-secondary border-b border-border shrink-0">
      {/* Hamburger menu */}
      <button
        onClick={onMenuClick}
        className="p-1.5 rounded hover:bg-bg-tertiary transition-colors text-text-secondary"
        aria-label="menu"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="5" x2="17" y2="5" />
          <line x1="3" y1="10" x2="17" y2="10" />
          <line x1="3" y1="15" x2="17" y2="15" />
        </svg>
      </button>

      {/* Title + CWD */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-text-primary truncate">{title}</h1>
        {editingCwd ? (
          <input
            type="text"
            value={cwdValue}
            onChange={(e) => setCwdValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitEdit}
            className="w-full text-xs text-text-muted bg-bg-input px-1 py-0.5 rounded border border-accent focus:outline-none font-mono"
            autoFocus
          />
        ) : (
          <p
            className="text-xs text-text-muted font-mono truncate cursor-pointer hover:text-text-secondary"
            onClick={startEdit}
          >
            {cwd}
          </p>
        )}
      </div>

      {/* Connection badge */}
      <ConnectionBadge status={status} />
    </header>
  );
}
