import { useEffect, useRef } from 'react';

export interface ShortcutActions {
  onNewTab: () => void;
  onCloseTab: () => void;
  onSelectTabByIndex: (index: number) => void;
  onNextTab: () => void;
  onPrevTab: () => void;
  onToggleAiMode: () => void;
  onToggleBashMode: () => void;
  onOpenSettings: () => void;
  onClearConversation: () => void;
  onToggleTheme: () => void;
  onTriggerUpload: () => void;
  onToggleModelSelector: () => void;
  onShowShortcuts: () => void;
}

export function useGlobalShortcuts(actions: ShortcutActions) {
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const alt = e.altKey;
      const shift = e.shiftKey;
      const key = e.key;
      // Use e.code for Alt-based shortcuts because macOS Option+key produces
      // special characters (e.g. Option+T → †), making e.key unreliable.
      const code = e.code;

      // ? key — show shortcuts panel (skip when in input/textarea)
      if (key === '?' && !alt && !shift) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        actionsRef.current.onShowShortcuts();
        return;
      }

      if (!alt) return;

      // Alt+Shift combos
      if (shift) {
        switch (code) {
          case 'BracketLeft':
            e.preventDefault();
            actionsRef.current.onPrevTab();
            return;
          case 'BracketRight':
            e.preventDefault();
            actionsRef.current.onNextTab();
            return;
          case 'KeyA':
            e.preventDefault();
            actionsRef.current.onToggleAiMode();
            return;
          case 'KeyB':
            e.preventDefault();
            actionsRef.current.onToggleBashMode();
            return;
          case 'KeyD':
            e.preventDefault();
            actionsRef.current.onToggleTheme();
            return;
          case 'KeyU':
            e.preventDefault();
            actionsRef.current.onTriggerUpload();
            return;
        }
      }

      // Alt+number (1-9) — tab switching
      if (!shift && code >= 'Digit1' && code <= 'Digit9') {
        e.preventDefault();
        actionsRef.current.onSelectTabByIndex(parseInt(code.slice(5), 10) - 1);
        return;
      }

      // Alt+key combos (no shift)
      if (!shift) {
        switch (code) {
          case 'KeyT':
            e.preventDefault();
            actionsRef.current.onNewTab();
            return;
          case 'KeyW':
            e.preventDefault();
            actionsRef.current.onCloseTab();
            return;
          case 'Comma':
            e.preventDefault();
            actionsRef.current.onOpenSettings();
            return;
          case 'KeyK':
            e.preventDefault();
            actionsRef.current.onClearConversation();
            return;
          case 'KeyM':
            e.preventDefault();
            actionsRef.current.onToggleModelSelector();
            return;
        }
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
}

/** Human-readable shortcut definitions for display */
export const SHORTCUT_DEFINITIONS = [
  { action: 'shortcuts.newTab', keys: ['⌥', 'T'] },
  { action: 'shortcuts.closeTab', keys: ['⌥', 'W'] },
  { action: 'shortcuts.switchTab', keys: ['⌥', '1-9'] },
  { action: 'shortcuts.prevTab', keys: ['⌥', '⇧', '['] },
  { action: 'shortcuts.nextTab', keys: ['⌥', '⇧', ']'] },
  { action: 'shortcuts.aiMode', keys: ['⌥', '⇧', 'A'] },
  { action: 'shortcuts.bashMode', keys: ['⌥', '⇧', 'B'] },
  { action: 'shortcuts.settings', keys: ['⌥', ','] },
  { action: 'shortcuts.clearChat', keys: ['⌥', 'K'] },
  { action: 'shortcuts.toggleTheme', keys: ['⌥', '⇧', 'D'] },
  { action: 'shortcuts.upload', keys: ['⌥', '⇧', 'U'] },
  { action: 'shortcuts.modelSelector', keys: ['⌥', 'M'] },
  { action: 'shortcuts.showShortcuts', keys: ['?'] },
] as const;
