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
    language: 'en',
    onLanguageToggle: vi.fn(),
    onLogout: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders New Chat button with Plus icon', () => {
    const { container } = render(<Sidebar {...defaultProps} />);
    const plusIcon = container.querySelector('.lucide-plus');
    expect(plusIcon).toBeTruthy();
  });

  it('calls onCreate when New Chat button is clicked', () => {
    const onCreate = vi.fn();
    render(<Sidebar {...defaultProps} onCreate={onCreate} />);
    fireEvent.click(screen.getByText('New Chat'));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('renders search input with Search icon', () => {
    const { container } = render(<Sidebar {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search...')).toBeTruthy();
    const searchIcon = container.querySelector('.lucide-search');
    expect(searchIcon).toBeTruthy();
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

  it('highlights active conversation with bg-accent-soft', () => {
    const { container } = render(<Sidebar {...defaultProps} />);
    const activeItem = container.querySelector('[data-active="true"]');
    expect(activeItem).toBeTruthy();
    expect(activeItem!.className).toContain('bg-accent-soft');
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
    const backdrop = screen.getByTestId('sidebar-backdrop');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('backdrop has backdrop-blur-sm', () => {
    render(<Sidebar {...defaultProps} />);
    const backdrop = screen.getByTestId('sidebar-backdrop');
    expect(backdrop.className).toContain('backdrop-blur-sm');
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

  it('uses Lucide icons for conversation actions (Pencil, Star, Trash2)', () => {
    const { container } = render(<Sidebar {...defaultProps} />);
    // Hover actions contain lucide icons
    const pencilIcons = container.querySelectorAll('.lucide-pencil');
    const starIcons = container.querySelectorAll('.lucide-star');
    const trash2Icons = container.querySelectorAll('.lucide-trash2');
    expect(pencilIcons.length).toBeGreaterThan(0);
    expect(starIcons.length).toBeGreaterThan(0);
    expect(trash2Icons.length).toBeGreaterThan(0);
  });

  it('renders close button with X icon', () => {
    const { container } = render(<Sidebar {...defaultProps} />);
    const xIcon = container.querySelector('.lucide-x');
    expect(xIcon).toBeTruthy();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<Sidebar {...defaultProps} onClose={onClose} />);
    const xIcon = container.querySelector('.lucide-x');
    const closeButton = xIcon?.closest('button');
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders bottom settings section with language toggle', () => {
    const { container } = render(<Sidebar {...defaultProps} />);
    const globeIcon = container.querySelector('.lucide-globe');
    expect(globeIcon).toBeTruthy();
  });

  it('calls onLanguageToggle when language button is clicked', () => {
    const onLanguageToggle = vi.fn();
    const { container } = render(<Sidebar {...defaultProps} onLanguageToggle={onLanguageToggle} />);
    const globeIcon = container.querySelector('.lucide-globe');
    const langButton = globeIcon?.closest('button');
    expect(langButton).toBeTruthy();
    fireEvent.click(langButton!);
    expect(onLanguageToggle).toHaveBeenCalledTimes(1);
  });

  it('renders logout button in settings section', () => {
    const { container } = render(<Sidebar {...defaultProps} />);
    const logoutIcon = container.querySelector('.lucide-log-out');
    expect(logoutIcon).toBeTruthy();
  });

  it('calls onLogout when logout button is clicked', () => {
    const onLogout = vi.fn();
    const { container } = render(<Sidebar {...defaultProps} onLogout={onLogout} />);
    const logoutIcon = container.querySelector('.lucide-log-out');
    const logoutButton = logoutIcon?.closest('button');
    expect(logoutButton).toBeTruthy();
    fireEvent.click(logoutButton!);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('has shadow-lg on sidebar panel', () => {
    const { container } = render(<Sidebar {...defaultProps} />);
    const sidebar = container.querySelector('[data-testid="sidebar-panel"]');
    expect(sidebar?.className).toContain('shadow-lg');
  });
});
