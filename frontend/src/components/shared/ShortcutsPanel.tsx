import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { ShortcutHint } from './ShortcutHint';
import { SHORTCUT_DEFINITIONS } from '../../hooks/useGlobalShortcuts';

interface ShortcutsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function ShortcutsPanel({ open, onClose }: ShortcutsPanelProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      data-testid="shortcuts-panel-overlay"
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        data-testid="shortcuts-panel"
        className="bg-bg-primary border border-border rounded-2xl shadow-lg max-w-md w-full mx-4 overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">
            {t('shortcuts.title', 'Keyboard Shortcuts')}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-text-muted hover:text-text-primary transition-colors"
            aria-label={t('common.close', 'Close')}
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto space-y-2">
          {SHORTCUT_DEFINITIONS.map((def) => (
            <div
              key={def.action}
              className="flex items-center justify-between py-1.5"
            >
              <span className="text-sm text-text-secondary">
                {t(def.action, def.action.split('.').pop() ?? def.action)}
              </span>
              <ShortcutHint keys={def.keys} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
