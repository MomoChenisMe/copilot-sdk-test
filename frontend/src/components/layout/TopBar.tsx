import { useTranslation } from 'react-i18next';
import { Sun, Moon, Settings } from 'lucide-react';
import type { WsStatus } from '../../lib/ws-types';
import type { Theme } from '../../store';
import { ConnectionBadge } from '../shared/ConnectionBadge';

interface TopBarProps {
  title: string;
  status: WsStatus;
  theme: Theme;
  onThemeToggle: () => void;
  onHomeClick: () => void;
  onSettingsClick?: () => void;
}

export function TopBar({ title, status, theme, onThemeToggle, onHomeClick, onSettingsClick }: TopBarProps) {
  const { t } = useTranslation();
  return (
    <header className="h-12 flex items-center gap-2 px-4 bg-bg-primary border-b border-border-subtle shrink-0">
      {/* Center: Title (clickable → home) */}
      <button
        onClick={onHomeClick}
        className="flex-1 min-w-0 text-center"
      >
        <span className="text-sm font-medium text-text-primary truncate">
          {title}
        </span>
      </button>

      {/* Right: Settings + Theme + Connection */}
      <div className="flex items-center gap-1">
        {onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className="p-2 rounded-lg hover:bg-bg-tertiary transition-colors text-text-secondary hover:text-text-primary"
            aria-label={t('topBar.settings', 'Settings')}
          >
            <Settings size={18} />
          </button>
        )}
        <button
          onClick={onThemeToggle}
          className="p-2 rounded-lg hover:bg-bg-tertiary transition-colors text-text-secondary"
          aria-label={t('topBar.toggleTheme')}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <ConnectionBadge status={status} />
      </div>
    </header>
  );
}
