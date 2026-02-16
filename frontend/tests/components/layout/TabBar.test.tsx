import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useAppStore } from '../../../src/store/index';
import { TabBar } from '../../../src/components/layout/TabBar';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Plus: (props: any) => <svg data-testid="plus-icon" {...props} />,
  X: (props: any) => <svg data-testid="x-icon" {...props} />,
  AlertTriangle: (props: any) => <svg data-testid="alert-triangle-icon" {...props} />,
}));

describe('TabBar', () => {
  const defaultProps = {
    onNewTab: vi.fn(),
    onSelectTab: vi.fn(),
    onCloseTab: vi.fn(),
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
    useAppStore.getState().openTab('conv-1', 'Chat 1');
    useAppStore.getState().openTab('conv-2', 'Chat 2');
    render(<TabBar {...defaultProps} />);
    expect(screen.getByTestId('tab-conv-1')).toBeTruthy();
    expect(screen.getByTestId('tab-conv-2')).toBeTruthy();
  });

  it('should display tab titles', () => {
    useAppStore.getState().openTab('conv-1', 'My Chat');
    render(<TabBar {...defaultProps} />);
    expect(screen.getByText('My Chat')).toBeTruthy();
  });

  it('should apply active styles to the active tab', () => {
    useAppStore.getState().openTab('conv-1', 'Chat 1');
    useAppStore.getState().openTab('conv-2', 'Chat 2');
    useAppStore.getState().setActiveTab('conv-1');
    render(<TabBar {...defaultProps} />);
    const tab1 = screen.getByTestId('tab-conv-1');
    expect(tab1.className).toContain('text-accent');
    expect(tab1.className).toContain('bg-accent-soft');
  });

  it('should apply inactive styles to non-active tabs', () => {
    useAppStore.getState().openTab('conv-1', 'Chat 1');
    useAppStore.getState().openTab('conv-2', 'Chat 2');
    useAppStore.getState().setActiveTab('conv-1');
    render(<TabBar {...defaultProps} />);
    const tab2 = screen.getByTestId('tab-conv-2');
    expect(tab2.className).toContain('text-text-muted');
  });

  it('should show streaming pulse indicator for active-streamed tabs', () => {
    useAppStore.getState().openTab('conv-1', 'Chat 1');
    useAppStore.setState({ activeStreams: { 'conv-1': 'running' } });
    render(<TabBar {...defaultProps} />);
    expect(screen.getByTestId('tab-streaming-conv-1')).toBeTruthy();
  });

  it('should NOT show streaming indicator for non-streaming tabs', () => {
    useAppStore.getState().openTab('conv-1', 'Chat 1');
    render(<TabBar {...defaultProps} />);
    expect(screen.queryByTestId('tab-streaming-conv-1')).toBeNull();
  });

  it('should call onSelectTab when a tab is clicked', () => {
    useAppStore.getState().openTab('conv-1', 'Chat 1');
    render(<TabBar {...defaultProps} />);
    fireEvent.click(screen.getByTestId('tab-conv-1'));
    expect(defaultProps.onSelectTab).toHaveBeenCalledWith('conv-1');
  });

  it('should call onCloseTab when close button is clicked', () => {
    useAppStore.getState().openTab('conv-1', 'Chat 1');
    render(<TabBar {...defaultProps} />);
    fireEvent.click(screen.getByTestId('tab-close-conv-1'));
    expect(defaultProps.onCloseTab).toHaveBeenCalledWith('conv-1');
  });

  it('should call onNewTab when + button is clicked', () => {
    render(<TabBar {...defaultProps} />);
    fireEvent.click(screen.getByTestId('new-tab-button'));
    expect(defaultProps.onNewTab).toHaveBeenCalled();
  });

  it('should close tab on middle-click (auxclick button=1)', () => {
    useAppStore.getState().openTab('conv-1', 'Chat 1');
    render(<TabBar {...defaultProps} />);
    fireEvent(screen.getByTestId('tab-conv-1'), new MouseEvent('auxclick', { button: 1, bubbles: true }));
    expect(defaultProps.onCloseTab).toHaveBeenCalledWith('conv-1');
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
});
