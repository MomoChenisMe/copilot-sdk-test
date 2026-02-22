import { useTranslation } from 'react-i18next';
import { Sun, Moon, Settings, Keyboard, Menu } from 'lucide-react';
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
  onShortcutsClick?: () => void;
  onMenuClick?: () => void;
}

export function TopBar({ title, status, theme, onThemeToggle, onHomeClick, onSettingsClick, onShortcutsClick, onMenuClick }: TopBarProps) {
  const { t } = useTranslation();
  return (
    <header className="h-12 flex items-center gap-2 px-4 bg-bg-primary border-b border-border-subtle shrink-0">
      {/* Left: Hamburger menu (mobile only) */}
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg hover:bg-bg-tertiary transition-colors text-text-secondary hover:text-text-primary"
          aria-label={t('topBar.menu', 'Menu')}
        >
          <Menu size={18} />
        </button>
      )}

      {/* Center: Title (clickable → home) */}
      <button
        onClick={onHomeClick}
        className="flex-1 min-w-0 text-center overflow-hidden"
      >
        <span className="text-sm font-medium text-text-primary truncate block">
          {title}
        </span>
      </button>

      {/* Right: Settings + Theme + Connection */}
      <div className="flex items-center gap-1 shrink-0">
        {onShortcutsClick && (
          <button
            onClick={onShortcutsClick}
            className="p-2 rounded-lg hover:bg-bg-tertiary transition-colors text-text-secondary hover:text-text-primary"
            aria-label={t('topBar.shortcuts', 'Keyboard shortcuts')}
          >
            <Keyboard size={18} />
          </button>
        )}
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
