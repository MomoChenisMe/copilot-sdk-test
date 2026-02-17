import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGlobalShortcuts } from '../../src/hooks/useGlobalShortcuts';

function fireShortcut(key: string, opts: Partial<KeyboardEventInit> = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...opts,
  });
  document.dispatchEvent(event);
  return event;
}

describe('useGlobalShortcuts', () => {
  let actions: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    actions = {
      onNewTab: vi.fn(),
      onCloseTab: vi.fn(),
      onSelectTabByIndex: vi.fn(),
      onNextTab: vi.fn(),
      onPrevTab: vi.fn(),
      onToggleAiMode: vi.fn(),
      onToggleBashMode: vi.fn(),
      onOpenSettings: vi.fn(),
      onClearConversation: vi.fn(),
      onToggleTheme: vi.fn(),
      onTriggerUpload: vi.fn(),
      onToggleModelSelector: vi.fn(),
      onShowShortcuts: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Alt+T triggers onNewTab', () => {
    renderHook(() => useGlobalShortcuts(actions));
    act(() => { fireShortcut('t', { altKey: true, code: 'KeyT' }); });
    expect(actions.onNewTab).toHaveBeenCalledTimes(1);
  });

  it('Alt+W triggers onCloseTab', () => {
    renderHook(() => useGlobalShortcuts(actions));
    act(() => { fireShortcut('w', { altKey: true, code: 'KeyW' }); });
    expect(actions.onCloseTab).toHaveBeenCalledTimes(1);
  });

  it('Alt+1 through Alt+9 triggers onSelectTabByIndex', () => {
    renderHook(() => useGlobalShortcuts(actions));
    act(() => { fireShortcut('1', { altKey: true, code: 'Digit1' }); });
    expect(actions.onSelectTabByIndex).toHaveBeenCalledWith(0);
    act(() => { fireShortcut('5', { altKey: true, code: 'Digit5' }); });
    expect(actions.onSelectTabByIndex).toHaveBeenCalledWith(4);
    act(() => { fireShortcut('9', { altKey: true, code: 'Digit9' }); });
    expect(actions.onSelectTabByIndex).toHaveBeenCalledWith(8);
  });

  it('Alt+Shift+[ triggers onPrevTab', () => {
    renderHook(() => useGlobalShortcuts(actions));
    act(() => { fireShortcut('[', { altKey: true, shiftKey: true, code: 'BracketLeft' }); });
    expect(actions.onPrevTab).toHaveBeenCalledTimes(1);
  });

  it('Alt+Shift+] triggers onNextTab', () => {
    renderHook(() => useGlobalShortcuts(actions));
    act(() => { fireShortcut(']', { altKey: true, shiftKey: true, code: 'BracketRight' }); });
    expect(actions.onNextTab).toHaveBeenCalledTimes(1);
  });

  it('Alt+Shift+A triggers onToggleAiMode', () => {
    renderHook(() => useGlobalShortcuts(actions));
    act(() => { fireShortcut('A', { altKey: true, shiftKey: true, code: 'KeyA' }); });
    expect(actions.onToggleAiMode).toHaveBeenCalledTimes(1);
  });

  it('Alt+Shift+B triggers onToggleBashMode', () => {
    renderHook(() => useGlobalShortcuts(actions));
    act(() => { fireShortcut('B', { altKey: true, shiftKey: true, code: 'KeyB' }); });
    expect(actions.onToggleBashMode).toHaveBeenCalledTimes(1);
  });

  it('Alt+, triggers onOpenSettings', () => {
    renderHook(() => useGlobalShortcuts(actions));
    act(() => { fireShortcut(',', { altKey: true, code: 'Comma' }); });
    expect(actions.onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('Alt+K triggers onClearConversation', () => {
    renderHook(() => useGlobalShortcuts(actions));
    act(() => { fireShortcut('k', { altKey: true, code: 'KeyK' }); });
    expect(actions.onClearConversation).toHaveBeenCalledTimes(1);
  });

  it('Alt+Shift+D triggers onToggleTheme', () => {
    renderHook(() => useGlobalShortcuts(actions));
    act(() => { fireShortcut('D', { altKey: true, shiftKey: true, code: 'KeyD' }); });
    expect(actions.onToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('Alt+Shift+U triggers onTriggerUpload', () => {
    renderHook(() => useGlobalShortcuts(actions));
    act(() => { fireShortcut('U', { altKey: true, shiftKey: true, code: 'KeyU' }); });
    expect(actions.onTriggerUpload).toHaveBeenCalledTimes(1);
  });

  it('Alt+M triggers onToggleModelSelector', () => {
    renderHook(() => useGlobalShortcuts(actions));
    act(() => { fireShortcut('m', { altKey: true, code: 'KeyM' }); });
    expect(actions.onToggleModelSelector).toHaveBeenCalledTimes(1);
  });

  it('? key triggers onShowShortcuts (not in input)', () => {
    renderHook(() => useGlobalShortcuts(actions));
    act(() => { fireShortcut('?'); });
    expect(actions.onShowShortcuts).toHaveBeenCalledTimes(1);
  });

  it('Cmd+T does NOT trigger shortcuts (avoids browser conflict)', () => {
    renderHook(() => useGlobalShortcuts(actions));
    act(() => { fireShortcut('t', { metaKey: true, code: 'KeyT' }); });
    expect(actions.onNewTab).not.toHaveBeenCalled();
  });

  it('cleans up event listener on unmount', () => {
    const spy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => useGlobalShortcuts(actions));
    unmount();
    expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});
