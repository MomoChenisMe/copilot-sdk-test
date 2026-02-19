import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScrollToBottom } from '../../../src/components/copilot/ScrollToBottom';

describe('ScrollToBottom', () => {
  it('renders button when visible is true', () => {
    render(<ScrollToBottom visible={true} unreadCount={0} onClick={vi.fn()} />);
    expect(screen.getByTestId('scroll-to-bottom')).toBeTruthy();
  });

  it('applies hidden styles when visible is false', () => {
    render(<ScrollToBottom visible={false} unreadCount={0} onClick={vi.fn()} />);
    const btn = screen.getByTestId('scroll-to-bottom');
    expect(btn.className).toContain('opacity-0');
    expect(btn.className).toContain('pointer-events-none');
  });

  it('applies visible styles when visible is true', () => {
    render(<ScrollToBottom visible={true} unreadCount={0} onClick={vi.fn()} />);
    const btn = screen.getByTestId('scroll-to-bottom');
    expect(btn.className).toContain('opacity-100');
    expect(btn.className).not.toContain('pointer-events-none');
  });

  it('shows unread count badge when unreadCount > 0', () => {
    render(<ScrollToBottom visible={true} unreadCount={3} onClick={vi.fn()} />);
    expect(screen.getByTestId('unread-badge')).toBeTruthy();
    expect(screen.getByTestId('unread-badge').textContent).toBe('3');
  });

  it('does not show badge when unreadCount is 0', () => {
    render(<ScrollToBottom visible={true} unreadCount={0} onClick={vi.fn()} />);
    expect(screen.queryByTestId('unread-badge')).toBeNull();
  });

  it('calls onClick when button is clicked', () => {
    const onClick = vi.fn();
    render(<ScrollToBottom visible={true} unreadCount={0} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('scroll-to-bottom'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('has ArrowDown icon', () => {
    render(<ScrollToBottom visible={true} unreadCount={0} onClick={vi.fn()} />);
    const btn = screen.getByTestId('scroll-to-bottom');
    // lucide-react renders SVG
    const svg = btn.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('uses i18n for aria-label', () => {
    render(<ScrollToBottom visible={true} unreadCount={0} onClick={vi.fn()} />);
    const btn = screen.getByTestId('scroll-to-bottom');
    // en.json: scrollToBottom.label = "Scroll to bottom"
    expect(btn).toHaveAttribute('aria-label', 'Scroll to bottom');
  });
});
