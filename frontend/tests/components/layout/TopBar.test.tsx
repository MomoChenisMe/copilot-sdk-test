import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopBar } from '../../../src/components/layout/TopBar';

describe('TopBar', () => {
  const defaultProps = {
    title: 'Test Conversation',
    status: 'connected' as const,
    theme: 'light' as const,
    onMenuClick: vi.fn(),
    onThemeToggle: vi.fn(),
    onHomeClick: vi.fn(),
    onNewChat: vi.fn(),
  };

  it('renders the conversation title', () => {
    render(<TopBar {...defaultProps} />);
    expect(screen.getByText('Test Conversation')).toBeTruthy();
  });

  it('title is clickable and calls onHomeClick', () => {
    const onHomeClick = vi.fn();
    render(<TopBar {...defaultProps} onHomeClick={onHomeClick} />);
    fireEvent.click(screen.getByText('Test Conversation'));
    expect(onHomeClick).toHaveBeenCalledTimes(1);
  });

  it('calls onMenuClick when hamburger is clicked', () => {
    const onMenuClick = vi.fn();
    render(<TopBar {...defaultProps} onMenuClick={onMenuClick} />);
    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);
    expect(onMenuClick).toHaveBeenCalledTimes(1);
  });

  it('renders new chat button and calls onNewChat when clicked', () => {
    const onNewChat = vi.fn();
    render(<TopBar {...defaultProps} onNewChat={onNewChat} />);
    const newChatBtn = screen.getByRole('button', { name: /new chat/i });
    fireEvent.click(newChatBtn);
    expect(onNewChat).toHaveBeenCalledTimes(1);
  });

  it('renders connection badge with connected status', () => {
    render(<TopBar {...defaultProps} status="connected" />);
    expect(screen.getByTitle('Connected')).toBeTruthy();
  });

  it('renders connection badge with connecting status', () => {
    render(<TopBar {...defaultProps} status="connecting" />);
    expect(screen.getByTitle('Connecting')).toBeTruthy();
  });

  it('renders connection badge with disconnected status', () => {
    render(<TopBar {...defaultProps} status="disconnected" />);
    expect(screen.getByTitle('Disconnected')).toBeTruthy();
  });

  it('renders theme toggle button', () => {
    render(<TopBar {...defaultProps} />);
    const themeButton = screen.getByRole('button', { name: /theme/i });
    expect(themeButton).toBeTruthy();
  });

  it('calls onThemeToggle when theme button is clicked', () => {
    const onThemeToggle = vi.fn();
    render(<TopBar {...defaultProps} onThemeToggle={onThemeToggle} />);
    const themeButton = screen.getByRole('button', { name: /theme/i });
    fireEvent.click(themeButton);
    expect(onThemeToggle).toHaveBeenCalledTimes(1);
  });

  it('has h-12 height and border-b', () => {
    const { container } = render(<TopBar {...defaultProps} />);
    const header = container.querySelector('header');
    expect(header?.className).toContain('h-12');
    expect(header?.className).toContain('border-b');
  });

  it('does not render language toggle or model name', () => {
    render(<TopBar {...defaultProps} />);
    // Language and model name are no longer in TopBar
    expect(screen.queryByRole('button', { name: /language/i })).toBeNull();
    expect(screen.queryByTestId('model-name')).toBeNull();
  });

  // === Settings gear button ===
  it('renders settings gear button', () => {
    render(<TopBar {...defaultProps} onSettingsClick={vi.fn()} />);
    const settingsBtn = screen.getByRole('button', { name: /settings/i });
    expect(settingsBtn).toBeTruthy();
  });

  it('calls onSettingsClick when settings button is clicked', () => {
    const onSettingsClick = vi.fn();
    render(<TopBar {...defaultProps} onSettingsClick={onSettingsClick} />);
    const settingsBtn = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsBtn);
    expect(onSettingsClick).toHaveBeenCalledOnce();
  });
});
