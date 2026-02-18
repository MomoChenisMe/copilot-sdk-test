import { useState, useRef, useEffect } from 'react';
import { FolderOpen, Sparkles, TerminalSquare } from 'lucide-react';
import { DirectoryPicker } from './DirectoryPicker';

interface CwdSelectorProps {
  currentCwd: string;
  onCwdChange: (newCwd: string) => void;
  mode?: 'copilot' | 'terminal';
  onModeChange?: (mode: 'copilot' | 'terminal') => void;
}

export function CwdSelector({ currentCwd, onCwdChange, mode, onModeChange }: CwdSelectorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const maxDisplayLength = 25;
  const displayPath =
    currentCwd.length > maxDisplayLength
      ? '...' + currentCwd.slice(-maxDisplayLength)
      : currentCwd;

  const handleClick = () => {
    setPickerOpen(true);
  };

  const handleSelect = (path: string) => {
    onCwdChange(path);
    setPickerOpen(false);
  };

  const handleClose = () => {
    setPickerOpen(false);
  };

  // Click outside to close picker
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerOpen]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center gap-1.5">
      <button
        data-testid="cwd-selector"
        onClick={handleClick}
        title={currentCwd}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-bg-tertiary rounded-lg hover:bg-bg-secondary transition-colors truncate max-w-56"
      >
        <FolderOpen size={12} className="shrink-0" />
        <span className="truncate">{displayPath}</span>
      </button>

      {pickerOpen && (
        <div data-testid="directory-picker">
          <DirectoryPicker
            currentPath={currentCwd}
            onSelect={handleSelect}
            onClose={handleClose}
          />
        </div>
      )}

      {mode && onModeChange && (
        <div className="inline-flex rounded-lg border border-border overflow-hidden">
          <button
            data-testid="mode-toggle-copilot"
            onClick={() => onModeChange('copilot')}
            className={`flex items-center gap-1 px-2 py-1.5 text-xs font-medium transition-colors ${
              mode === 'copilot'
                ? 'bg-accent text-white'
                : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
            }`}
          >
            <Sparkles size={12} />
            AI
          </button>
          <button
            data-testid="mode-toggle-terminal"
            onClick={() => onModeChange('terminal')}
            className={`flex items-center gap-1 px-2 py-1.5 text-xs font-medium transition-colors ${
              mode === 'terminal'
                ? 'bg-accent text-white'
                : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
            }`}
          >
            <TerminalSquare size={12} />
            Bash
          </button>
        </div>
      )}
    </div>
  );
}
