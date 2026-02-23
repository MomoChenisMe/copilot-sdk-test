import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, Sparkles, TerminalSquare } from 'lucide-react';
import { DirectoryPicker } from './DirectoryPicker';

interface CwdSelectorProps {
  currentCwd: string;
  onCwdChange: (newCwd: string) => void;
  mode?: 'copilot' | 'terminal' | 'cron';
  onModeChange?: (mode: 'copilot' | 'terminal') => void;
}

/** Shorten a filesystem path for display: ~/…/parent/last */
export function shortenPath(fullPath: string): string {
  if (fullPath === '/') return '/';

  // Replace home directory prefix with ~
  const homePath = fullPath.replace(/^\/Users\/[^/]+/, '~').replace(/^\/home\/[^/]+/, '~');
  const parts = homePath.split('/').filter(Boolean);

  if (parts.length === 0) return '/';
  if (parts.length <= 2) return homePath;

  // Show: <first>/…/<second-to-last>/<last>
  const prefix = parts[0] === '~' ? '~' : `/${parts[0]}`;
  return `${prefix}/\u2026/${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
}

export function CwdSelector({ currentCwd, onCwdChange, mode, onModeChange }: CwdSelectorProps) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-bg-tertiary rounded-lg hover:bg-bg-secondary transition-colors truncate max-w-40 sm:max-w-56"
      >
        <FolderOpen size={12} className="shrink-0" />
        <span className="truncate">{shortenPath(currentCwd)}</span>
      </button>

      {pickerOpen && (
        <div data-testid="directory-picker">
          <DirectoryPicker
            currentPath={currentCwd}
            onSelect={handleSelect}
            onClose={handleClose}
            onFallback={onCwdChange}
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
                ? 'border-accent text-accent bg-accent/10'
                : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
            }`}
          >
            <Sparkles size={12} />
            {t('terminal.modeAI')}
          </button>
          <button
            data-testid="mode-toggle-terminal"
            onClick={() => onModeChange('terminal')}
            className={`flex items-center gap-1 px-2 py-1.5 text-xs font-medium transition-colors ${
              mode === 'terminal'
                ? 'border-accent text-accent bg-accent/10'
                : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary'
            }`}
          >
            <TerminalSquare size={12} />
            {t('terminal.modeBash')}
          </button>
        </div>
      )}
    </div>
  );
}
