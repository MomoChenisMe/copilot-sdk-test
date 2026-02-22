import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopBar } from '../../../src/components/layout/TopBar';

describe('TopBar', () => {
  const defaultProps = {
    title: 'Test Conversation',
    status: 'connected' as const,
    theme: 'light' as const,
    onThemeToggle: vi.fn(),
    onHomeClick: vi.fn(),
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

  it('does NOT render hamburger menu button', () => {
    render(<TopBar {...defaultProps} />);
    expect(screen.queryByRole('button', { name: /menu/i })).toBeNull();
  });

  it('does not render new chat / Plus button', () => {
    render(<TopBar {...defaultProps} />);
    expect(screen.queryByRole('button', { name: /new chat/i })).toBeNull();
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

  // === Title overflow protection ===
  it('title button has overflow-hidden to prevent text overflow', () => {
    const { container } = render(<TopBar {...defaultProps} title="A very long conversation title that should be truncated on mobile screens" />);
    const titleBtn = container.querySelector('button.flex-1');
    expect(titleBtn?.className).toContain('overflow-hidden');
  });

  it('title span has block class for truncate to work', () => {
    const { container } = render(<TopBar {...defaultProps} />);
    const titleSpan = container.querySelector('span.truncate');
    expect(titleSpan?.className).toContain('block');
  });

  it('right-side buttons container has shrink-0 to prevent compression', () => {
    const { container } = render(<TopBar {...defaultProps} onSettingsClick={vi.fn()} />);
    // The right-side div is the last div child of header
    const header = container.querySelector('header');
    const rightDiv = header?.querySelector('div.flex.items-center');
    expect(rightDiv?.className).toContain('shrink-0');
  });
});
