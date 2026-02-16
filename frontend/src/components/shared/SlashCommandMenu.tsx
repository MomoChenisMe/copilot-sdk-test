import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export interface SlashCommand {
  name: string;
  description: string;
  type: 'builtin' | 'skill' | 'sdk';
}

interface SlashCommandMenuProps {
  commands: SlashCommand[];
  filter: string;
  selectedIndex: number;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
}

export function SlashCommandMenu({
  commands,
  filter,
  selectedIndex,
  onSelect,
  onClose,
}: SlashCommandMenuProps) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = commands.filter((cmd) =>
    cmd.name.toLowerCase().includes(filter.toLowerCase()),
  );

  const builtinCommands = filtered.filter((c) => c.type === 'builtin');
  const skillCommands = filtered.filter((c) => c.type === 'skill');
  const sdkCommands = filtered.filter((c) => c.type === 'sdk');

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const selected = menuRef.current?.querySelector('[aria-selected="true"]');
    if (selected && typeof selected.scrollIntoView === 'function') {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (filtered.length === 0) {
    return (
      <div
        ref={menuRef}
        className="absolute bottom-full left-0 mb-1 w-72 bg-bg-elevated border border-border rounded-xl shadow-[var(--shadow-lg)] z-50 p-3"
      >
        <p className="text-sm text-text-muted">
          {t('slashCommand.noResults', 'No matching commands')}
        </p>
      </div>
    );
  }

  let flatIndex = 0;

  return (
    <div
      ref={menuRef}
      role="listbox"
      className="absolute bottom-full left-0 mb-1 w-72 max-h-60 overflow-y-auto bg-bg-elevated border border-border rounded-xl shadow-[var(--shadow-lg)] z-50"
    >
      {builtinCommands.length > 0 && (
        <div>
          <div className="px-3 py-1.5 text-xs font-semibold text-text-muted border-b border-border">
            {t('slashCommand.commands', 'Commands')}
          </div>
          {builtinCommands.map((cmd) => {
            const idx = flatIndex++;
            return (
              <button
                key={cmd.name}
                role="option"
                aria-selected={idx === selectedIndex}
                onClick={() => onSelect(cmd)}
                className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                  idx === selectedIndex ? 'bg-accent-soft text-accent' : 'hover:bg-bg-tertiary text-text-primary'
                }`}
              >
                <span className="text-sm font-medium">/{cmd.name}</span>
                <span className="text-xs text-text-muted truncate">{cmd.description}</span>
              </button>
            );
          })}
        </div>
      )}
      {skillCommands.length > 0 && (
        <div>
          <div className="px-3 py-1.5 text-xs font-semibold text-text-muted border-b border-border">
            {t('slashCommand.skills', 'Skills')}
          </div>
          {skillCommands.map((cmd) => {
            const idx = flatIndex++;
            return (
              <button
                key={cmd.name}
                role="option"
                aria-selected={idx === selectedIndex}
                onClick={() => onSelect(cmd)}
                className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                  idx === selectedIndex ? 'bg-accent-soft text-accent' : 'hover:bg-bg-tertiary text-text-primary'
                }`}
              >
                <span className="text-sm font-medium">/{cmd.name}</span>
                <span className="text-xs text-text-muted truncate">{cmd.description}</span>
              </button>
            );
          })}
        </div>
      )}
      {sdkCommands.length > 0 && (
        <div>
          <div className="px-3 py-1.5 text-xs font-semibold text-text-muted border-b border-border">
            {t('slashCommand.copilot', 'Copilot')}
          </div>
          {sdkCommands.map((cmd) => {
            const idx = flatIndex++;
            return (
              <button
                key={cmd.name}
                role="option"
                aria-selected={idx === selectedIndex}
                onClick={() => onSelect(cmd)}
                className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                  idx === selectedIndex ? 'bg-accent-soft text-accent' : 'hover:bg-bg-tertiary text-text-primary'
                }`}
              >
                <span className="text-sm font-medium">/{cmd.name}</span>
                <span className="text-xs text-text-muted truncate">{cmd.description}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
