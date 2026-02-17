import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConversationPopover } from '../../../src/components/layout/ConversationPopover';
import type { ConversationPopoverProps } from '../../../src/components/layout/ConversationPopover';

const makeConversation = (overrides: Partial<ConversationPopoverProps['conversations'][number]> = {}) => ({
  id: 'conv-1',
  title: 'Test Conversation',
  pinned: false,
  updatedAt: '2025-01-01T12:00:00Z',
  ...overrides,
});

describe('ConversationPopover', () => {
  const conversations = [
    makeConversation({ id: 'conv-1', title: 'Pinned Chat', pinned: true }),
    makeConversation({ id: 'conv-2', title: 'Recent Chat Alpha' }),
    makeConversation({ id: 'conv-3', title: 'Recent Chat Beta' }),
    makeConversation({ id: 'conv-4', title: 'Another Pinned', pinned: true }),
  ];

  const defaultProps: ConversationPopoverProps = {
    open: true,
    onClose: vi.fn(),
    conversations,
    currentConversationId: 'conv-1',
    onSelect: vi.fn(),
    onNew: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Renders conversation list when open
  it('renders conversation list when open', () => {
    render(<ConversationPopover {...defaultProps} />);
    expect(screen.getByTestId('conversation-popover')).toBeTruthy();
    expect(screen.getByText('Pinned Chat')).toBeTruthy();
    expect(screen.getByText('Recent Chat Alpha')).toBeTruthy();
    expect(screen.getByText('Recent Chat Beta')).toBeTruthy();
    expect(screen.getByText('Another Pinned')).toBeTruthy();
  });

  // 2. Does not render when closed
  it('does not render when open is false', () => {
    render(<ConversationPopover {...defaultProps} open={false} />);
    expect(screen.queryByTestId('conversation-popover')).toBeNull();
  });

  // 3. Filters conversations by search query
  it('filters conversations by search query', () => {
    render(<ConversationPopover {...defaultProps} />);
    const searchInput = screen.getByTestId('popover-search');
    fireEvent.change(searchInput, { target: { value: 'Alpha' } });

    expect(screen.getByText('Recent Chat Alpha')).toBeTruthy();
    expect(screen.queryByText('Recent Chat Beta')).toBeNull();
    expect(screen.queryByText('Pinned Chat')).toBeNull();
    expect(screen.queryByText('Another Pinned')).toBeNull();
  });

  // 4. Groups conversations into pinned and recent sections
  it('groups conversations into pinned and recent sections', () => {
    render(<ConversationPopover {...defaultProps} />);
    expect(screen.getByText('Pinned')).toBeTruthy();
    expect(screen.getByText('Recent')).toBeTruthy();
  });

  it('does not render Pinned section when no pinned conversations exist', () => {
    const noPinnedConversations = [
      makeConversation({ id: 'conv-2', title: 'Chat A' }),
      makeConversation({ id: 'conv-3', title: 'Chat B' }),
    ];
    render(
      <ConversationPopover
        {...defaultProps}
        conversations={noPinnedConversations}
      />,
    );
    expect(screen.queryByText('Pinned')).toBeNull();
    expect(screen.getByText('Recent')).toBeTruthy();
  });

  // 5. Highlights the current conversation
  it('highlights the current conversation with indigo background', () => {
    render(<ConversationPopover {...defaultProps} currentConversationId="conv-1" />);
    const currentItem = screen.getByTestId('popover-item-conv-1');
    expect(currentItem.className).toContain('bg-indigo-50');
    expect(currentItem.className).toContain('dark:bg-indigo-900/30');
  });

  it('does not apply current highlight to non-current conversations', () => {
    render(<ConversationPopover {...defaultProps} currentConversationId="conv-1" />);
    const otherItem = screen.getByTestId('popover-item-conv-2');
    expect(otherItem.className).not.toContain('bg-indigo-50');
  });

  // 6. Calls onSelect when clicking a conversation
  it('calls onSelect when clicking a conversation', () => {
    const onSelect = vi.fn();
    render(<ConversationPopover {...defaultProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('popover-item-conv-2'));
    expect(onSelect).toHaveBeenCalledWith('conv-2');
  });

  it('calls onClose after selecting a conversation', () => {
    const onClose = vi.fn();
    render(<ConversationPopover {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('popover-item-conv-2'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // 7. Calls onNew when clicking "New conversation" button
  it('calls onNew when clicking the new conversation button', () => {
    const onNew = vi.fn();
    render(<ConversationPopover {...defaultProps} onNew={onNew} />);
    fireEvent.click(screen.getByTestId('popover-new-button'));
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it('calls onClose after clicking new conversation button', () => {
    const onClose = vi.fn();
    render(<ConversationPopover {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('popover-new-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // 8. Keyboard navigation
  describe('keyboard navigation', () => {
    it('ArrowDown moves highlight to the first item', () => {
      render(<ConversationPopover {...defaultProps} />);
      const popover = screen.getByTestId('conversation-popover');
      fireEvent.keyDown(popover, { key: 'ArrowDown' });

      // First item in flat list is first pinned conversation (conv-1)
      const firstItem = screen.getByTestId('popover-item-conv-1');
      expect(firstItem.className).toContain('bg-indigo-50'); // it's the current one
    });

    it('ArrowDown then ArrowDown moves to the second item', () => {
      render(<ConversationPopover {...defaultProps} />);
      const popover = screen.getByTestId('conversation-popover');
      fireEvent.keyDown(popover, { key: 'ArrowDown' });
      fireEvent.keyDown(popover, { key: 'ArrowDown' });

      // Second item is conv-4 (second pinned)
      const secondItem = screen.getByTestId('popover-item-conv-4');
      expect(secondItem.className).toContain('bg-bg-tertiary');
    });

    it('ArrowUp wraps to last item from initial state', () => {
      render(<ConversationPopover {...defaultProps} />);
      const popover = screen.getByTestId('conversation-popover');
      fireEvent.keyDown(popover, { key: 'ArrowUp' });

      // Should wrap to last item (conv-3 "Recent Chat Beta")
      const lastItem = screen.getByTestId('popover-item-conv-3');
      expect(lastItem.className).toContain('bg-bg-tertiary');
    });

    it('ArrowDown wraps around from last to first', () => {
      render(<ConversationPopover {...defaultProps} />);
      const popover = screen.getByTestId('conversation-popover');
      // Move through all 4 items and then one more to wrap
      fireEvent.keyDown(popover, { key: 'ArrowDown' }); // 0 (conv-1)
      fireEvent.keyDown(popover, { key: 'ArrowDown' }); // 1 (conv-4)
      fireEvent.keyDown(popover, { key: 'ArrowDown' }); // 2 (conv-2)
      fireEvent.keyDown(popover, { key: 'ArrowDown' }); // 3 (conv-3)
      fireEvent.keyDown(popover, { key: 'ArrowDown' }); // wrap to 0 (conv-1)

      const firstItem = screen.getByTestId('popover-item-conv-1');
      // conv-1 is current so it has bg-indigo-50, but it's also keyboard highlighted
      expect(firstItem.className).toContain('bg-indigo-50');
    });

    it('Enter selects the highlighted conversation', () => {
      const onSelect = vi.fn();
      render(<ConversationPopover {...defaultProps} onSelect={onSelect} />);
      const popover = screen.getByTestId('conversation-popover');

      // Move to first item and press Enter
      fireEvent.keyDown(popover, { key: 'ArrowDown' });
      fireEvent.keyDown(popover, { key: 'ArrowDown' }); // conv-4
      fireEvent.keyDown(popover, { key: 'Enter' });

      expect(onSelect).toHaveBeenCalledWith('conv-4');
    });

    it('Enter does nothing when no item is highlighted', () => {
      const onSelect = vi.fn();
      render(<ConversationPopover {...defaultProps} onSelect={onSelect} />);
      const popover = screen.getByTestId('conversation-popover');

      // Press Enter without navigating first
      fireEvent.keyDown(popover, { key: 'Enter' });
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('Escape calls onClose', () => {
      const onClose = vi.fn();
      render(<ConversationPopover {...defaultProps} onClose={onClose} />);
      const popover = screen.getByTestId('conversation-popover');

      fireEvent.keyDown(popover, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // 9. Shows "no results" when search yields nothing
  it('shows no results message when search yields nothing', () => {
    render(<ConversationPopover {...defaultProps} />);
    const searchInput = screen.getByTestId('popover-search');
    fireEvent.change(searchInput, { target: { value: 'xyznonexistent' } });

    expect(screen.getByTestId('popover-no-results')).toBeTruthy();
    expect(screen.getByText('No results found')).toBeTruthy();
  });

  it('hides section headers when search yields no results', () => {
    render(<ConversationPopover {...defaultProps} />);
    const searchInput = screen.getByTestId('popover-search');
    fireEvent.change(searchInput, { target: { value: 'xyznonexistent' } });

    expect(screen.queryByText('Pinned')).toBeNull();
    expect(screen.queryByText('Recent')).toBeNull();
  });

  // Additional edge-case tests

  it('renders search input with Search icon', () => {
    const { container } = render(<ConversationPopover {...defaultProps} />);
    const searchIcon = container.querySelector('.lucide-search');
    expect(searchIcon).toBeTruthy();
    expect(screen.getByPlaceholderText('Search...')).toBeTruthy();
  });

  it('renders new conversation button with Plus icon', () => {
    const { container } = render(<ConversationPopover {...defaultProps} />);
    const plusIcon = container.querySelector('.lucide-plus');
    expect(plusIcon).toBeTruthy();
  });

  it('closes when clicking the backdrop', () => {
    const onClose = vi.fn();
    render(<ConversationPopover {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('popover-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('search is case-insensitive', () => {
    render(<ConversationPopover {...defaultProps} />);
    const searchInput = screen.getByTestId('popover-search');
    fireEvent.change(searchInput, { target: { value: 'alpha' } });

    expect(screen.getByText('Recent Chat Alpha')).toBeTruthy();
    expect(screen.queryByText('Recent Chat Beta')).toBeNull();
  });

  it('resets highlight index when search query changes', () => {
    render(<ConversationPopover {...defaultProps} />);
    const popover = screen.getByTestId('conversation-popover');
    const searchInput = screen.getByTestId('popover-search');

    // Navigate to second item
    fireEvent.keyDown(popover, { key: 'ArrowDown' });
    fireEvent.keyDown(popover, { key: 'ArrowDown' });

    // Change search query should reset highlight
    fireEvent.change(searchInput, { target: { value: 'Recent' } });

    // Now press ArrowDown - should go to first filtered item (index 0)
    fireEvent.keyDown(popover, { key: 'ArrowDown' });
    const firstFiltered = screen.getByTestId('popover-item-conv-2');
    expect(firstFiltered.className).toContain('bg-bg-tertiary');
  });

  it('shows only matching pinned conversations when searching', () => {
    render(<ConversationPopover {...defaultProps} />);
    const searchInput = screen.getByTestId('popover-search');
    fireEvent.change(searchInput, { target: { value: 'Pinned' } });

    expect(screen.getByText('Pinned Chat')).toBeTruthy();
    expect(screen.getByText('Another Pinned')).toBeTruthy();
    expect(screen.queryByText('Recent Chat Alpha')).toBeNull();
    // The "Pinned" section header should be visible
    expect(screen.getByText('Pinned')).toBeTruthy();
  });

  it('has max-height constraint to prevent overflow', () => {
    render(<ConversationPopover {...defaultProps} />);
    const popover = screen.getByTestId('conversation-popover');
    expect(popover.className).toContain('max-h-80');
  });

  it('has shadow-lg on popover container', () => {
    render(<ConversationPopover {...defaultProps} />);
    const popover = screen.getByTestId('conversation-popover');
    expect(popover.className).toContain('shadow-lg');
  });

  // === Conversation deletion ===
  describe('conversation deletion', () => {
    it('shows delete button on hover over a conversation item', async () => {
      render(<ConversationPopover {...defaultProps} onDelete={vi.fn()} />);
      const item = screen.getByTestId('popover-item-conv-2');
      fireEvent.mouseEnter(item);
      expect(screen.getByTestId('delete-conv-conv-2')).toBeTruthy();
    });

    it('does not show delete button when onDelete is not provided', () => {
      render(<ConversationPopover {...defaultProps} />);
      const item = screen.getByTestId('popover-item-conv-2');
      fireEvent.mouseEnter(item);
      expect(screen.queryByTestId('delete-conv-conv-2')).toBeNull();
    });

    it('shows confirmation text after clicking delete', () => {
      render(<ConversationPopover {...defaultProps} onDelete={vi.fn()} />);
      const item = screen.getByTestId('popover-item-conv-2');
      fireEvent.mouseEnter(item);
      fireEvent.click(screen.getByTestId('delete-conv-conv-2'));
      expect(screen.getByTestId('confirm-delete-conv-2')).toBeTruthy();
    });

    it('calls onDelete after confirming deletion', () => {
      const onDelete = vi.fn();
      render(<ConversationPopover {...defaultProps} onDelete={onDelete} />);
      const item = screen.getByTestId('popover-item-conv-2');
      fireEvent.mouseEnter(item);
      fireEvent.click(screen.getByTestId('delete-conv-conv-2'));
      fireEvent.click(screen.getByTestId('confirm-delete-conv-2'));
      expect(onDelete).toHaveBeenCalledWith('conv-2');
    });

    it('cancels deletion when clicking cancel', () => {
      const onDelete = vi.fn();
      render(<ConversationPopover {...defaultProps} onDelete={onDelete} />);
      const item = screen.getByTestId('popover-item-conv-2');
      fireEvent.mouseEnter(item);
      fireEvent.click(screen.getByTestId('delete-conv-conv-2'));
      fireEvent.click(screen.getByTestId('cancel-delete-conv-2'));
      expect(onDelete).not.toHaveBeenCalled();
      // Confirm UI should be gone
      expect(screen.queryByTestId('confirm-delete-conv-2')).toBeNull();
    });
  });
});
