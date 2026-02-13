import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopBar } from '../../../src/components/layout/TopBar';

describe('TopBar', () => {
  const defaultProps = {
    title: 'Test Conversation',
    cwd: '/home/user',
    status: 'connected' as const,
    onMenuClick: vi.fn(),
    onCwdChange: vi.fn(),
  };

  it('renders the conversation title', () => {
    render(<TopBar {...defaultProps} />);
    expect(screen.getByText('Test Conversation')).toBeTruthy();
  });

  it('renders the current working directory', () => {
    render(<TopBar {...defaultProps} />);
    expect(screen.getByText('/home/user')).toBeTruthy();
  });

  it('calls onMenuClick when hamburger is clicked', () => {
    const onMenuClick = vi.fn();
    render(<TopBar {...defaultProps} onMenuClick={onMenuClick} />);
    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);
    expect(onMenuClick).toHaveBeenCalledTimes(1);
  });

  it('renders connection badge', () => {
    render(<TopBar {...defaultProps} status="connected" />);
    expect(screen.getByTitle('已連線')).toBeTruthy();
  });

  it('shows connecting status', () => {
    render(<TopBar {...defaultProps} status="connecting" />);
    expect(screen.getByTitle('連線中')).toBeTruthy();
  });

  it('shows disconnected status', () => {
    render(<TopBar {...defaultProps} status="disconnected" />);
    expect(screen.getByTitle('已斷線')).toBeTruthy();
  });

  it('allows editing cwd when clicking the cwd display', () => {
    const onCwdChange = vi.fn();
    render(<TopBar {...defaultProps} onCwdChange={onCwdChange} />);

    // Click on cwd to enter edit mode
    const cwdDisplay = screen.getByText('/home/user');
    fireEvent.click(cwdDisplay);

    // Should show an input
    const input = screen.getByRole('textbox');
    expect(input).toBeTruthy();
    expect((input as HTMLInputElement).value).toBe('/home/user');

    // Change value and submit
    fireEvent.change(input, { target: { value: '/tmp' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCwdChange).toHaveBeenCalledWith('/tmp');
  });

  it('cancels cwd edit on Escape', () => {
    const onCwdChange = vi.fn();
    render(<TopBar {...defaultProps} onCwdChange={onCwdChange} />);

    const cwdDisplay = screen.getByText('/home/user');
    fireEvent.click(cwdDisplay);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '/tmp' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    // Should not call onCwdChange
    expect(onCwdChange).not.toHaveBeenCalled();
    // Should show original cwd again
    expect(screen.getByText('/home/user')).toBeTruthy();
  });
});
