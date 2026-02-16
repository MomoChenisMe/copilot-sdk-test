import { useState, useRef, useEffect, useCallback } from 'react';
import { FolderOpen } from 'lucide-react';

interface CwdSelectorProps {
  currentCwd: string;
  onCwdChange: (newCwd: string) => void;
}

export function CwdSelector({ currentCwd, onCwdChange }: CwdSelectorProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(currentCwd);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const maxDisplayLength = 25;
  const displayPath =
    currentCwd.length > maxDisplayLength
      ? '...' + currentCwd.slice(-maxDisplayLength)
      : currentCwd;

  const handleClick = useCallback(() => {
    setEditValue(currentCwd);
    setEditing(true);
  }, [currentCwd]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // Click outside to cancel
  useEffect(() => {
    if (!editing) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setEditing(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [editing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = editValue.trim();
      if (trimmed && trimmed !== currentCwd) {
        onCwdChange(trimmed);
      }
      setEditing(false);
    } else if (e.key === 'Escape') {
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div ref={containerRef} className="inline-flex">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="px-3 py-1.5 text-xs font-medium text-text-primary bg-bg-elevated border border-border-focus rounded-lg focus:outline-none min-w-48"
        />
      </div>
    );
  }

  return (
    <button
      data-testid="cwd-selector"
      onClick={handleClick}
      title={currentCwd}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-bg-tertiary rounded-lg hover:bg-bg-secondary transition-colors truncate max-w-56"
    >
      <FolderOpen size={12} className="shrink-0" />
      <span className="truncate">{displayPath}</span>
    </button>
  );
}
