import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../../../src/components/layout/Sidebar';
import type { Conversation } from '../../../src/lib/api';

const makeConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 'conv-1',
  title: 'Test Conversation',
  sdkSessionId: null,
  model: 'gpt-4o',
  cwd: '/home',
  pinned: false,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T12:00:00Z',
  ...overrides,
});

describe('Sidebar', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    conversations: [
      makeConversation({ id: 'conv-1', title: 'First Chat', pinned: true }),
      makeConversation({ id: 'conv-2', title: 'Second Chat', pinned: false }),
      makeConversation({ id: 'conv-3', title: 'Third Chat', pinned: false }),
    ],
    activeConversationId: 'conv-1',
    onSelect: vi.fn(),
    onCreate: vi.fn(),
    onDelete: vi.fn(),
    onPin: vi.fn(),
    onRename: vi.fn(),
    onSearch: vi.fn().mockResolvedValue([]),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders New Conversation button', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('+ New')).toBeTruthy();
  });

  it('calls onCreate when New Conversation button is clicked', () => {
    const onCreate = vi.fn();
    render(<Sidebar {...defaultProps} onCreate={onCreate} />);
    fireEvent.click(screen.getByText('+ New'));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('renders search input', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search...')).toBeTruthy();
  });

  it('renders Pinned section when pinned conversations exist', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Pinned')).toBeTruthy();
  });

  it('renders Recent section', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Recent')).toBeTruthy();
  });

  it('shows pinned conversations in Pinned section', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('First Chat')).toBeTruthy();
  });

  it('shows unpinned conversations in Recent section', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Second Chat')).toBeTruthy();
    expect(screen.getByText('Third Chat')).toBeTruthy();
  });

  it('highlights the active conversation', () => {
    const { container } = render(<Sidebar {...defaultProps} />);
    // The active conversation should have accent-related styling
    const activeItem = container.querySelector('[data-active="true"]');
    expect(activeItem).toBeTruthy();
  });

  it('calls onSelect when clicking a conversation', () => {
    const onSelect = vi.fn();
    render(<Sidebar {...defaultProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Second Chat'));
    expect(onSelect).toHaveBeenCalledWith('conv-2');
  });

  it('calls onClose when clicking the backdrop', () => {
    const onClose = vi.fn();
    render(<Sidebar {...defaultProps} onClose={onClose} />);
    // Click the backdrop
    const backdrop = screen.getByTestId('sidebar-backdrop');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render Pinned section when no pinned conversations', () => {
    const conversations = [
      makeConversation({ id: 'conv-1', title: 'Chat 1', pinned: false }),
    ];
    render(<Sidebar {...defaultProps} conversations={conversations} />);
    expect(screen.queryByText('Pinned')).toBeNull();
  });

  it('hides sidebar when open is false', () => {
    const { container } = render(<Sidebar {...defaultProps} open={false} />);
    const sidebar = container.querySelector('[data-testid="sidebar-panel"]');
    expect(sidebar?.className).toContain('-translate-x-full');
  });
});
