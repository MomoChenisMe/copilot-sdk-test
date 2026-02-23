import { useTranslation } from 'react-i18next';
import { Sun, Moon, Settings, Keyboard, Menu, BookOpen, PanelRight } from 'lucide-react';
import type { WsStatus } from '../../lib/ws-types';
import type { Theme } from '../../store';
import { ConnectionBadge } from '../shared/ConnectionBadge';
import { Tooltip } from '../shared/Tooltip';

interface TopBarProps {
  title: string;
  status: WsStatus;
  theme: Theme;
  onThemeToggle: () => void;
  onHomeClick: () => void;
  onSettingsClick?: () => void;
  onShortcutsClick?: () => void;
  onOpenSpecClick?: () => void;
  onArtifactsClick?: () => void;
  artifactsCount?: number;
  openSpecActive?: boolean;
  onMenuClick?: () => void;
}

export function TopBar({ title, status, theme, onThemeToggle, onHomeClick, onSettingsClick, onShortcutsClick, onOpenSpecClick, onArtifactsClick, artifactsCount, openSpecActive, onMenuClick }: TopBarProps) {
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
          <Tooltip label={t('topBar.shortcuts', 'Keyboard shortcuts')} position="bottom">
            <button
              onClick={onShortcutsClick}
              className="p-2 rounded-lg hover:bg-bg-tertiary transition-colors text-text-secondary hover:text-text-primary"
              aria-label={t('topBar.shortcuts', 'Keyboard shortcuts')}
            >
              <Keyboard size={18} />
            </button>
          </Tooltip>
        )}
        {onOpenSpecClick && (
          <Tooltip label={t('topBar.openspec', 'OpenSpec')} position="bottom">
            <button
              onClick={onOpenSpecClick}
              className="relative p-2 rounded-lg hover:bg-bg-tertiary transition-colors text-text-secondary hover:text-text-primary"
              aria-label={t('topBar.openspec', 'OpenSpec')}
            >
              <BookOpen size={18} />
              {openSpecActive && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent" />
              )}
            </button>
          </Tooltip>
        )}
        {onArtifactsClick && (
          <Tooltip label={t('topBar.artifacts', 'Artifacts')} position="bottom">
            <button
              onClick={onArtifactsClick}
              className="relative p-2 rounded-lg hover:bg-bg-tertiary transition-colors text-text-secondary hover:text-text-primary"
              aria-label={t('topBar.artifacts', 'Artifacts')}
            >
              <PanelRight size={18} />
              {(artifactsCount ?? 0) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent text-white text-[9px] font-bold flex items-center justify-center">
                  {artifactsCount! > 9 ? '9+' : artifactsCount}
                </span>
              )}
            </button>
          </Tooltip>
        )}
        {onSettingsClick && (
          <Tooltip label={t('topBar.settings', 'Settings')} position="bottom">
            <button
              onClick={onSettingsClick}
              className="p-2 rounded-lg hover:bg-bg-tertiary transition-colors text-text-secondary hover:text-text-primary"
              aria-label={t('topBar.settings', 'Settings')}
            >
              <Settings size={18} />
            </button>
          </Tooltip>
        )}
        <Tooltip label={t('topBar.toggleTheme', 'Toggle theme')} position="bottom">
          <button
            onClick={onThemeToggle}
            className="p-2 rounded-lg hover:bg-bg-tertiary transition-colors text-text-secondary"
            aria-label={t('topBar.toggleTheme')}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </Tooltip>
        <ConnectionBadge status={status} />
      </div>
    </header>
  );
}
