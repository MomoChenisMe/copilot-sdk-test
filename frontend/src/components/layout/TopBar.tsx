import { Sun, Moon, Menu } from 'lucide-react';
import type { WsStatus } from '../../lib/ws-types';
import type { Theme } from '../../store';
import { ConnectionBadge } from '../shared/ConnectionBadge';

interface TopBarProps {
  title: string;
  modelName: string;
  status: WsStatus;
  theme: Theme;
  onMenuClick: () => void;
  onThemeToggle: () => void;
}

export function TopBar({ title, modelName, status, theme, onMenuClick, onThemeToggle }: TopBarProps) {
  return (
    <header className="flex items-center gap-3 px-3 py-2 bg-bg-secondary border-b border-border shrink-0">
      {/* Hamburger menu */}
      <button
        onClick={onMenuClick}
        className="p-1.5 rounded hover:bg-bg-tertiary transition-colors text-text-secondary"
        aria-label="menu"
      >
        <Menu size={20} />
      </button>

      {/* Title + Model name */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-text-primary truncate">{title}</h1>
        {modelName && (
          <p className="text-xs text-text-muted truncate" data-testid="model-name">
            {modelName}
          </p>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={onThemeToggle}
          className="p-1.5 rounded hover:bg-bg-tertiary transition-colors text-text-secondary"
          aria-label="toggle theme"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Connection badge */}
        <ConnectionBadge status={status} />
      </div>
    </header>
  );
}
