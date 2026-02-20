import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export interface SlashCommand {
  name: string;
  description: string;
  type: 'builtin' | 'skill' | 'sdk';
  builtin?: boolean;
}

interface SlashCommandMenuProps {
  commands: SlashCommand[];
  filter: string;
  selectedIndex: number;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
}

function CommandItem({
  cmd,
  selected,
  onSelect,
}: {
  cmd: SlashCommand;
  selected: boolean;
  onSelect: (cmd: SlashCommand) => void;
}) {
  return (
    <button
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(cmd)}
      className={`w-full text-left px-3 py-2.5 flex flex-col gap-0.5 transition-colors ${
        selected ? 'bg-accent-soft text-accent' : 'hover:bg-bg-tertiary text-text-primary'
      }`}
    >
      <span className="text-sm font-medium">/{cmd.name}</span>
      {cmd.description && (
        <span className="text-xs text-text-muted line-clamp-2">{cmd.description}</span>
      )}
    </button>
  );
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
  const systemSkills = filtered.filter((c) => c.type === 'skill' && c.builtin === true);
  const userSkills = filtered.filter((c) => c.type === 'skill' && c.builtin !== true);
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
        className="absolute bottom-full left-0 mb-1 w-80 bg-bg-elevated border border-border rounded-xl shadow-[var(--shadow-lg)] z-50 p-3"
      >
        <p className="text-sm text-text-muted">
          {t('slashCommand.noResults', 'No matching commands')}
        </p>
      </div>
    );
  }

  let flatIndex = 0;

  const renderSection = (
    items: SlashCommand[],
    label: string,
  ) => {
    if (items.length === 0) return null;
    return (
      <div>
        <div className="px-3 py-1.5 text-xs font-semibold text-text-muted border-b border-border">
          {label}
        </div>
        {items.map((cmd) => {
          const idx = flatIndex++;
          return (
            <CommandItem
              key={cmd.name}
              cmd={cmd}
              selected={idx === selectedIndex}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div
      ref={menuRef}
      role="listbox"
      className="absolute bottom-full left-0 mb-1 w-80 max-h-72 overflow-y-auto bg-bg-elevated border border-border rounded-xl shadow-[var(--shadow-lg)] z-50"
    >
      {renderSection(builtinCommands, t('slashCommand.commands', 'Commands'))}
      {renderSection(systemSkills, t('slashCommand.systemSkills', 'System Skills'))}
      {renderSection(userSkills, t('slashCommand.userSkills', 'User Skills'))}
      {renderSection(sdkCommands, t('slashCommand.copilot', 'Copilot'))}
    </div>
  );
}
