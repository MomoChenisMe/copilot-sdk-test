import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../../../src/components/shared/Input';

describe('Input', () => {
  const defaultProps = {
    onSend: vi.fn(),
    onAbort: vi.fn(),
    isStreaming: false,
  };

  it('renders textarea with placeholder "Message AI Terminal..."', () => {
    render(<Input {...defaultProps} />);
    expect(screen.getByPlaceholderText('Message AI Terminal...')).toBeTruthy();
  });

  it('renders textarea with 1 row (auto-grow)', () => {
    render(<Input {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('Message AI Terminal...');
    expect(textarea.getAttribute('rows')).toBe('1');
  });

  it('sends message on Enter (not Shift+Enter)', () => {
    const onSend = vi.fn();
    render(<Input {...defaultProps} onSend={onSend} />);
    const textarea = screen.getByPlaceholderText('Message AI Terminal...');
    fireEvent.change(textarea, { target: { value: 'hello' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('hello');
  });

  it('does not send on Shift+Enter', () => {
    const onSend = vi.fn();
    render(<Input {...defaultProps} onSend={onSend} />);
    const textarea = screen.getByPlaceholderText('Message AI Terminal...');
    fireEvent.change(textarea, { target: { value: 'hello' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('shows Stop button (icon-only) when streaming', () => {
    render(<Input {...defaultProps} isStreaming={true} />);
    expect(screen.getByRole('button', { name: /stop/i })).toBeTruthy();
  });

  it('shows Send button (icon-only) when not streaming', () => {
    render(<Input {...defaultProps} />);
    expect(screen.getByRole('button', { name: /send/i })).toBeTruthy();
  });

  it('disables textarea when disabled prop is true', () => {
    render(<Input {...defaultProps} disabled={true} />);
    const textarea = screen.getByPlaceholderText('Message AI Terminal...');
    expect(textarea).toBeDisabled();
  });

  it('clears input after sending', () => {
    const onSend = vi.fn();
    render(<Input {...defaultProps} onSend={onSend} />);
    const textarea = screen.getByPlaceholderText('Message AI Terminal...') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'hello' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(textarea.value).toBe('');
  });

  it('has floating card style (rounded-2xl bg-bg-elevated)', () => {
    const { container } = render(<Input {...defaultProps} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('rounded-2xl');
    expect(card.className).toContain('bg-bg-elevated');
  });

  it('calls onAbort when Stop button is clicked', () => {
    const onAbort = vi.fn();
    render(<Input {...defaultProps} isStreaming={true} onAbort={onAbort} />);
    fireEvent.click(screen.getByRole('button', { name: /stop/i }));
    expect(onAbort).toHaveBeenCalledTimes(1);
  });
});
