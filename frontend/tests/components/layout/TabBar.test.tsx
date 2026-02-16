import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useAppStore } from '../../../src/store/index';
import { TabBar } from '../../../src/components/layout/TabBar';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Plus: (props: any) => <svg data-testid="plus-icon" {...props} />,
  X: (props: any) => <svg data-testid="x-icon" {...props} />,
  AlertTriangle: (props: any) => <svg data-testid="alert-triangle-icon" {...props} />,
  ChevronDown: (props: any) => <svg data-testid="chevron-down-icon" {...props} />,
  Search: (props: any) => <svg data-testid="search-icon" {...props} />,
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
