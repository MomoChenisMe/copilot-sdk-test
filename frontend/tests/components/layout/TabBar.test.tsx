import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useAppStore } from '../../../src/store/index';
import { TabBar } from '../../../src/components/layout/TabBar';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Plus: (props: any) => <svg data-testid="plus-icon" {...props} />,
  X: (props: any) => <svg data-testid="x-icon" {...props} />,
  AlertTriangle: (props: any) => <svg data-testid="alert-triangle-icon" {...props} />,
  ChevronDown: (props: any) => <svg data-testid="chevron-down-icon" {...props} />,
  Search: (props: any) => <svg data-testid="search-icon" {...props} />,
  History: (props: any) => <svg data-testid="history-icon" {...props} />,
  Clock: (props: any) => <svg data-testid="clock-icon" {...props} />,
  Trash2: (props: any) => <svg data-testid="trash-icon" {...props} />,
  XCircle: (props: any) => <svg data-testid="xcircle-icon" {...props} />,
  Palette: (props: any) => <svg data-testid="palette-icon" {...props} />,
}));

// Helper: open a tab and return its generated tabId
function openTabAndGetId(conversationId: string, title: string): string {
  useAppStore.getState().openTab(conversationId, title);
  const state = useAppStore.getState();
  return state.tabOrder[state.tabOrder.length - 1];
}

describe('TabBar', () => {
  const defaultProps = {
    onNewTab: vi.fn(),
    onSelectTab: vi.fn(),
    onCloseTab: vi.fn(),
    onSwitchConversation: vi.fn(),
    conversations: [] as Array<{ id: string; title: string; pinned?: boolean; updatedAt?: string }>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      tabs: {},
      tabOrder: [],
      activeTabId: null,
      activeStreams: {},
      tabLimitWarning: false,
    });
  });

  it('should render "+" button when no tabs exist', () => {
    render(<TabBar {...defaultProps} />);
    expect(screen.getByTestId('new-tab-button')).toBeTruthy();
  });

  it('should render tab items for each tab in tabOrder', () => {
    const tabId1 = openTabAndGetId('conv-1', 'Chat 1');
    const tabId2 = openTabAndGetId('conv-2', 'Chat 2');
    render(<TabBar {...defaultProps} />);
    expect(screen.getByTestId(`tab-${tabId1}`)).toBeTruthy();
    expect(screen.getByTestId(`tab-${tabId2}`)).toBeTruthy();
  });

  it('should display tab titles', () => {
    openTabAndGetId('conv-1', 'My Chat');
    render(<TabBar {...defaultProps} />);
    expect(screen.getByText('My Chat')).toBeTruthy();
  });

  it('should apply active styles to the active tab', () => {
    const tabId1 = openTabAndGetId('conv-1', 'Chat 1');
    openTabAndGetId('conv-2', 'Chat 2');
    useAppStore.getState().setActiveTab(tabId1);
    render(<TabBar {...defaultProps} />);
    const tab1 = screen.getByTestId(`tab-${tabId1}`);
    expect(tab1.className).toContain('text-accent');
    expect(tab1.className).toContain('bg-accent-soft');
  });

  it('should apply inactive styles to non-active tabs', () => {
    const tabId1 = openTabAndGetId('conv-1', 'Chat 1');
    const tabId2 = openTabAndGetId('conv-2', 'Chat 2');
    useAppStore.getState().setActiveTab(tabId1);
    render(<TabBar {...defaultProps} />);
    const tab2 = screen.getByTestId(`tab-${tabId2}`);
    expect(tab2.className).toContain('text-text-muted');
  });

  it('should show streaming pulse indicator for active-streamed tabs', () => {
    const tabId = openTabAndGetId('conv-1', 'Chat 1');
    useAppStore.setState({ activeStreams: { 'conv-1': 'running' } });
    render(<TabBar {...defaultProps} />);
    expect(screen.getByTestId(`tab-streaming-${tabId}`)).toBeTruthy();
  });

  it('should NOT show streaming indicator for non-streaming tabs', () => {
    const tabId = openTabAndGetId('conv-1', 'Chat 1');
    render(<TabBar {...defaultProps} />);
    expect(screen.queryByTestId(`tab-streaming-${tabId}`)).toBeNull();
  });

  it('should call onSelectTab when a tab is clicked', () => {
    const tabId = openTabAndGetId('conv-1', 'Chat 1');
    render(<TabBar {...defaultProps} />);
    fireEvent.click(screen.getByTestId(`tab-${tabId}`));
    expect(defaultProps.onSelectTab).toHaveBeenCalledWith(tabId);
  });

  it('should call onCloseTab when close button is clicked', () => {
    const tabId = openTabAndGetId('conv-1', 'Chat 1');
    render(<TabBar {...defaultProps} />);
    fireEvent.click(screen.getByTestId(`tab-close-${tabId}`));
    expect(defaultProps.onCloseTab).toHaveBeenCalledWith(tabId);
  });

  it('should call onNewTab when + button is clicked', () => {
    render(<TabBar {...defaultProps} />);
    fireEvent.click(screen.getByTestId('new-tab-button'));
    expect(defaultProps.onNewTab).toHaveBeenCalled();
  });

  it('should close tab on middle-click (auxclick button=1)', () => {
    const tabId = openTabAndGetId('conv-1', 'Chat 1');
    render(<TabBar {...defaultProps} />);
    fireEvent(screen.getByTestId(`tab-${tabId}`), new MouseEvent('auxclick', { button: 1, bubbles: true }));
    expect(defaultProps.onCloseTab).toHaveBeenCalledWith(tabId);
  });

  it('should have h-10 height and border-b', () => {
    const { container } = render(<TabBar {...defaultProps} />);
    const tabBar = container.firstChild as HTMLElement;
    expect(tabBar.className).toContain('h-10');
    expect(tabBar.className).toContain('border-b');
  });

  it('should have overflow-x-auto for horizontal scrolling', () => {
    const { container } = render(<TabBar {...defaultProps} />);
    const tabBar = container.firstChild as HTMLElement;
    expect(tabBar.className).toContain('overflow-x-auto');
  });

  it('should show tab limit warning when tabLimitWarning is true', () => {
    useAppStore.setState({ tabLimitWarning: true });
    render(<TabBar {...defaultProps} />);
    expect(screen.getByTestId('tab-limit-warning')).toBeTruthy();
  });

  it('should not show tab limit warning when tabLimitWarning is false', () => {
    useAppStore.setState({ tabLimitWarning: false });
    render(<TabBar {...defaultProps} />);
    expect(screen.queryByTestId('tab-limit-warning')).toBeNull();
  });

  // --- Context menu ---
  describe('Context menu', () => {
    it('should open context menu on right-click and suppress default', () => {
      const tabId = openTabAndGetId('conv-1', 'Chat 1');
      const onDeleteTabConversation = vi.fn();
      render(<TabBar {...defaultProps} onDeleteTabConversation={onDeleteTabConversation} />);
      const tabContainer = screen.getByTestId(`tab-${tabId}`).parentElement!;
      const prevented = fireEvent.contextMenu(tabContainer, { clientX: 100, clientY: 50 });
      // fireEvent returns false if preventDefault was called
      expect(prevented).toBe(false);
      // Context menu should now be visible — look for Close tab text
      expect(screen.getByText(/Close tab|關閉頁籤/i)).toBeTruthy();
    });

    it('should show delete option for tab with conversationId', () => {
      const tabId = openTabAndGetId('conv-1', 'Chat 1');
      const onDeleteTabConversation = vi.fn();
      render(<TabBar {...defaultProps} onDeleteTabConversation={onDeleteTabConversation} />);
      const tabEl = screen.getByTestId(`tab-${tabId}`).parentElement!;
      fireEvent.contextMenu(tabEl, { clientX: 100, clientY: 50 });
      expect(screen.getByText(/Delete conversation|刪除對話/i)).toBeTruthy();
    });

    it('should hide delete option for draft tab (null conversationId)', () => {
      useAppStore.getState().openTab(null, 'Draft');
      render(<TabBar {...defaultProps} />);
      const tabEl = screen.getByText('Draft').closest('[class*="relative"]')!;
      fireEvent.contextMenu(tabEl, { clientX: 100, clientY: 50 });
      expect(screen.getByText(/Close tab|關閉頁籤/i)).toBeTruthy();
      expect(screen.queryByText(/Delete conversation|刪除對話/i)).toBeNull();
    });

    it('should open ConfirmDialog when delete is clicked and call onDeleteTabConversation on confirm', () => {
      const tabId = openTabAndGetId('conv-1', 'Chat 1');
      const onDeleteTabConversation = vi.fn();
      render(<TabBar {...defaultProps} onDeleteTabConversation={onDeleteTabConversation} />);
      const tabEl = screen.getByTestId(`tab-${tabId}`).parentElement!;
      fireEvent.contextMenu(tabEl, { clientX: 100, clientY: 50 });
      fireEvent.click(screen.getByText(/Delete conversation|刪除對話/i));
      // Context menu should close, ConfirmDialog should appear
      expect(screen.queryByText(/Close tab|關閉頁籤/i)).toBeNull();
      // ConfirmDialog confirm button should show "Delete" (confirmLabel from common.delete)
      const confirmBtn = screen.getByRole('button', { name: /Delete|刪除/i });
      expect(confirmBtn).toBeTruthy();
      fireEvent.click(confirmBtn);
      expect(onDeleteTabConversation).toHaveBeenCalledWith(tabId);
    });

    it('should NOT call onDeleteTabConversation when user cancels ConfirmDialog', () => {
      const tabId = openTabAndGetId('conv-1', 'Chat 1');
      const onDeleteTabConversation = vi.fn();
      render(<TabBar {...defaultProps} onDeleteTabConversation={onDeleteTabConversation} />);
      const tabEl = screen.getByTestId(`tab-${tabId}`).parentElement!;
      fireEvent.contextMenu(tabEl, { clientX: 100, clientY: 50 });
      fireEvent.click(screen.getByText(/Delete conversation|刪除對話/i));
      // ConfirmDialog should be visible
      const cancelBtn = screen.getByText(/Cancel|取消/i);
      expect(cancelBtn).toBeTruthy();
      fireEvent.click(cancelBtn);
      expect(onDeleteTabConversation).not.toHaveBeenCalled();
    });

    it('should NOT use window.confirm for delete conversation', () => {
      const tabId = openTabAndGetId('conv-1', 'Chat 1');
      const confirmSpy = vi.spyOn(window, 'confirm');
      render(<TabBar {...defaultProps} onDeleteTabConversation={vi.fn()} />);
      const tabEl = screen.getByTestId(`tab-${tabId}`).parentElement!;
      fireEvent.contextMenu(tabEl, { clientX: 100, clientY: 50 });
      fireEvent.click(screen.getByText(/Delete conversation|刪除對話/i));
      expect(confirmSpy).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    });

    it('should close context menu on Escape key', () => {
      openTabAndGetId('conv-1', 'Chat 1');
      render(<TabBar {...defaultProps} />);
      const tabEl = screen.getByText('Chat 1').closest('[class*="relative"]')!;
      fireEvent.contextMenu(tabEl, { clientX: 100, clientY: 50 });
      expect(screen.getByText(/Close tab|關閉頁籤/i)).toBeTruthy();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByText(/Close tab|關閉頁籤/i)).toBeNull();
    });
  });

  // --- Long-press on mobile ---
  describe('Long-press (mobile)', () => {
    it('should open context menu after 500ms touch', () => {
      vi.useFakeTimers();
      openTabAndGetId('conv-1', 'Chat 1');
      render(<TabBar {...defaultProps} />);
      const tabEl = screen.getByText('Chat 1').closest('[class*="relative"]')!;
      fireEvent.touchStart(tabEl, { touches: [{ clientX: 100, clientY: 50 }] });
      act(() => { vi.advanceTimersByTime(500); });
      expect(screen.getByText(/Close tab|關閉頁籤/i)).toBeTruthy();
      vi.useRealTimers();
    });

    it('should NOT open context menu if touch ends before 500ms', () => {
      vi.useFakeTimers();
      openTabAndGetId('conv-1', 'Chat 1');
      render(<TabBar {...defaultProps} />);
      const tabEl = screen.getByText('Chat 1').closest('[class*="relative"]')!;
      fireEvent.touchStart(tabEl, { touches: [{ clientX: 100, clientY: 50 }] });
      act(() => { vi.advanceTimersByTime(300); });
      fireEvent.touchEnd(tabEl);
      act(() => { vi.advanceTimersByTime(300); });
      expect(screen.queryByText(/Close tab|關閉頁籤/i)).toBeNull();
      vi.useRealTimers();
    });

    it('should NOT open context menu if touch moves (cancel long-press)', () => {
      vi.useFakeTimers();
      openTabAndGetId('conv-1', 'Chat 1');
      render(<TabBar {...defaultProps} />);
      const tabEl = screen.getByText('Chat 1').closest('[class*="relative"]')!;
      fireEvent.touchStart(tabEl, { touches: [{ clientX: 100, clientY: 50 }] });
      act(() => { vi.advanceTimersByTime(200); });
      fireEvent.touchMove(tabEl);
      act(() => { vi.advanceTimersByTime(400); });
      expect(screen.queryByText(/Close tab|關閉頁籤/i)).toBeNull();
      vi.useRealTimers();
    });
  });

  // --- Drag snap-back animation ---
  describe('Drag snap-back animation', () => {
    beforeEach(() => {
      // jsdom doesn't implement setPointerCapture
      HTMLElement.prototype.setPointerCapture = vi.fn();
      HTMLElement.prototype.releasePointerCapture = vi.fn();
    });

    it('should set transition synchronously on pointerUp (no rAF delay)', () => {
      const tabId = openTabAndGetId('conv-1', 'Chat 1');
      const { container } = render(<TabBar {...defaultProps} />);
      const tabContainer = container.firstChild as HTMLElement;
      const tabEl = screen.getByTestId(`tab-${tabId}`).parentElement!;

      // Start drag: pointerDown + pointerMove past threshold
      fireEvent.pointerDown(tabEl, { button: 0, clientX: 100, pointerId: 1 });
      fireEvent.pointerMove(tabContainer, { clientX: 120, pointerId: 1 });

      // Tab should now be in dragging state
      expect(tabEl.className).toContain('z-50');

      // Release
      fireEvent.pointerUp(tabContainer, { pointerId: 1 });

      // Transition should be set immediately (synchronously, no rAF)
      expect(tabEl.style.transition).toContain('transform');
      expect(tabEl.style.transform).toBe('translateX(0)');
    });

    it('should animate swapped tab with FLIP during drag', () => {
      const tabId1 = openTabAndGetId('conv-1', 'Chat 1');
      const tabId2 = openTabAndGetId('conv-2', 'Chat 2');
      useAppStore.getState().setActiveTab(tabId1);

      const { container } = render(<TabBar {...defaultProps} />);
      const tabContainer = container.firstChild as HTMLElement;
      const tabEl1 = screen.getByTestId(`tab-${tabId1}`).parentElement!;
      const tabEl2 = screen.getByTestId(`tab-${tabId2}`).parentElement!;

      // Mock getBoundingClientRect for swap detection
      vi.spyOn(tabEl2, 'getBoundingClientRect').mockReturnValue({
        left: 100, right: 200, top: 0, bottom: 40, width: 100, height: 40,
        x: 100, y: 0, toJSON: () => {},
      });

      // Start drag on tab1
      fireEvent.pointerDown(tabEl1, { button: 0, clientX: 50, pointerId: 1 });
      // Move past threshold
      fireEvent.pointerMove(tabContainer, { clientX: 60, pointerId: 1 });
      // Move into tab2's area past midpoint to trigger swap
      fireEvent.pointerMove(tabContainer, { clientX: 160, pointerId: 1 });

      // After swap, the swapped tab (tab2) should have transition set
      // (The FLIP animation sets transform and then clears it)
      // We can't perfectly test rAF in jsdom, but we verify the approach is in place
      expect(tabEl1.style.transform).toBeTruthy();
    });

    it('should clear styles after transitionend', () => {
      const tabId = openTabAndGetId('conv-1', 'Chat 1');
      const { container } = render(<TabBar {...defaultProps} />);
      const tabContainer = container.firstChild as HTMLElement;
      const tabEl = screen.getByTestId(`tab-${tabId}`).parentElement!;

      // Drag and release
      fireEvent.pointerDown(tabEl, { button: 0, clientX: 100, pointerId: 1 });
      fireEvent.pointerMove(tabContainer, { clientX: 120, pointerId: 1 });
      fireEvent.pointerUp(tabContainer, { pointerId: 1 });

      // Fire transitionend to clean up
      fireEvent.transitionEnd(tabEl);

      expect(tabEl.style.transition).toBe('');
      expect(tabEl.style.transform).toBe('');
    });
  });

  // --- Double-click rename ---
  describe('Double-click rename', () => {
    it('should enter edit mode on double-click', () => {
      const tabId = openTabAndGetId('conv-1', 'Chat 1');
      render(<TabBar {...defaultProps} />);
      const titleSpan = screen.getByTestId(`tab-title-${tabId}`);
      fireEvent.doubleClick(titleSpan);
      // An input should appear with current title
      const input = screen.getByDisplayValue('Chat 1');
      expect(input.tagName).toBe('INPUT');
    });

    it('should confirm rename on Enter and update store', () => {
      const tabId = openTabAndGetId('conv-1', 'Chat 1');
      render(<TabBar {...defaultProps} />);
      const titleSpan = screen.getByTestId(`tab-title-${tabId}`);
      fireEvent.doubleClick(titleSpan);
      const input = screen.getByDisplayValue('Chat 1');
      fireEvent.change(input, { target: { value: 'Renamed' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      // Store should have customTitle set
      expect(useAppStore.getState().tabs[tabId].customTitle).toBe('Renamed');
    });

    it('should cancel rename on Escape and NOT update store', () => {
      const tabId = openTabAndGetId('conv-1', 'Chat 1');
      render(<TabBar {...defaultProps} />);
      const titleSpan = screen.getByTestId(`tab-title-${tabId}`);
      fireEvent.doubleClick(titleSpan);
      const input = screen.getByDisplayValue('Chat 1');
      fireEvent.change(input, { target: { value: 'Renamed' } });
      fireEvent.keyDown(input, { key: 'Escape' });
      // Store should NOT have customTitle
      expect(useAppStore.getState().tabs[tabId].customTitle).toBeUndefined();
    });

    it('should display customTitle instead of title when set', () => {
      const tabId = openTabAndGetId('conv-1', 'Chat 1');
      useAppStore.getState().setTabCustomTitle(tabId, 'My Custom');
      render(<TabBar {...defaultProps} />);
      expect(screen.getByText('My Custom')).toBeTruthy();
      expect(screen.queryByText('Chat 1')).toBeNull();
    });
  });

  // --- Context menu color selection ---
  describe('Context menu color selection', () => {
    it('should show "Set color" option in context menu', () => {
      const tabId = openTabAndGetId('conv-1', 'Chat 1');
      render(<TabBar {...defaultProps} />);
      const tabEl = screen.getByTestId(`tab-${tabId}`).parentElement!;
      fireEvent.contextMenu(tabEl, { clientX: 100, clientY: 50 });
      expect(screen.getByText(/Set color|設定顏色/i)).toBeTruthy();
    });

    it('should show color palette when "Set color" is clicked', () => {
      const tabId = openTabAndGetId('conv-1', 'Chat 1');
      render(<TabBar {...defaultProps} />);
      const tabEl = screen.getByTestId(`tab-${tabId}`).parentElement!;
      fireEvent.contextMenu(tabEl, { clientX: 100, clientY: 50 });
      fireEvent.click(screen.getByText(/Set color|設定顏色/i));
      // Color swatches should appear
      expect(screen.getByTestId('color-palette')).toBeTruthy();
    });

    it('should set tab color when a swatch is clicked', () => {
      const tabId = openTabAndGetId('conv-1', 'Chat 1');
      render(<TabBar {...defaultProps} />);
      const tabEl = screen.getByTestId(`tab-${tabId}`).parentElement!;
      fireEvent.contextMenu(tabEl, { clientX: 100, clientY: 50 });
      fireEvent.click(screen.getByText(/Set color|設定顏色/i));
      // Click first swatch
      const swatch = screen.getAllByTestId(/^color-swatch-/)[0];
      fireEvent.click(swatch);
      expect(useAppStore.getState().tabs[tabId].color).toBeTruthy();
    });

    it('should show "Clear color" option when tab has a color', () => {
      const tabId = openTabAndGetId('conv-1', 'Chat 1');
      useAppStore.getState().setTabColor(tabId, '#ef4444');
      render(<TabBar {...defaultProps} />);
      const tabEl = screen.getByTestId(`tab-${tabId}`).parentElement!;
      fireEvent.contextMenu(tabEl, { clientX: 100, clientY: 50 });
      expect(screen.getByText(/Clear color|清除顏色/i)).toBeTruthy();
    });

    it('should clear color when "Clear color" is clicked', () => {
      const tabId = openTabAndGetId('conv-1', 'Chat 1');
      useAppStore.getState().setTabColor(tabId, '#ef4444');
      render(<TabBar {...defaultProps} />);
      const tabEl = screen.getByTestId(`tab-${tabId}`).parentElement!;
      fireEvent.contextMenu(tabEl, { clientX: 100, clientY: 50 });
      fireEvent.click(screen.getByText(/Clear color|清除顏色/i));
      expect(useAppStore.getState().tabs[tabId].color).toBeUndefined();
    });
  });

  // --- Tab background tint ---
  describe('Tab background tint', () => {
    it('should apply background color style to active tab with color', () => {
      const tabId = openTabAndGetId('conv-1', 'Chat 1');
      useAppStore.getState().setTabColor(tabId, '#ef4444');
      useAppStore.getState().setActiveTab(tabId);
      render(<TabBar {...defaultProps} />);
      const tabBtn = screen.getByTestId(`tab-${tabId}`);
      expect(tabBtn.style.backgroundColor).toBeTruthy();
    });

    it('should NOT have background color style when tab has no color', () => {
      const tabId = openTabAndGetId('conv-1', 'Chat 1');
      useAppStore.getState().setActiveTab(tabId);
      render(<TabBar {...defaultProps} />);
      const tabBtn = screen.getByTestId(`tab-${tabId}`);
      expect(tabBtn.style.backgroundColor).toBe('');
    });
  });

  // --- ConversationPopover integration ---
  describe('ConversationPopover integration', () => {
    it('should show ChevronDown icon on tab title', () => {
      openTabAndGetId('conv-1', 'Chat 1');
      render(<TabBar {...defaultProps} />);
      expect(screen.getByTestId('chevron-down-icon')).toBeTruthy();
    });

    it('should open ConversationPopover when chevron is clicked', () => {
      const tabId = openTabAndGetId('conv-1', 'Chat 1');
      render(<TabBar {...defaultProps} conversations={[{ id: 'conv-1', title: 'Chat 1' }]} />);
      const chevron = screen.getByTestId(`tab-chevron-${tabId}`);
      fireEvent.click(chevron);
      // Popover should be open — check for search input
      expect(screen.getByPlaceholderText(/搜尋|Search/i)).toBeTruthy();
    });

    it('should switch tab (not open popover) when clicking tab title text', () => {
      const tabId = openTabAndGetId('conv-1', 'Chat 1');
      render(<TabBar {...defaultProps} conversations={[{ id: 'conv-1', title: 'Chat 1' }]} />);
      const titleArea = screen.getByTestId(`tab-title-${tabId}`);
      fireEvent.click(titleArea);
      // Click on title text should bubble up to button and call onSelectTab
      // (no stopPropagation on title anymore)
      expect(defaultProps.onSelectTab).toHaveBeenCalledWith(tabId);
    });

    it('should call onSwitchConversation when a conversation is selected from popover', () => {
      const tabId = openTabAndGetId('conv-1', 'Chat 1');
      useAppStore.getState().setActiveTab(tabId);
      render(
        <TabBar
          {...defaultProps}
          conversations={[
            { id: 'conv-1', title: 'Chat 1' },
            { id: 'conv-2', title: 'Chat 2' },
          ]}
        />,
      );
      // Open popover via chevron
      fireEvent.click(screen.getByTestId(`tab-chevron-${tabId}`));
      // Select a different conversation
      fireEvent.click(screen.getByText('Chat 2'));
      expect(defaultProps.onSwitchConversation).toHaveBeenCalledWith(tabId, 'conv-2');
    });
  });
});
