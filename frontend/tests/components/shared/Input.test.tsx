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

  it('renders textarea with 3 rows by default', () => {
    render(<Input {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('Message AI Terminal...');
    expect(textarea.getAttribute('rows')).toBe('3');
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

  it('shows Stop button when streaming', () => {
    render(<Input {...defaultProps} isStreaming={true} />);
    expect(screen.getByText('Stop')).toBeTruthy();
  });

  it('shows Send button when not streaming', () => {
    render(<Input {...defaultProps} />);
    expect(screen.getByText('Send')).toBeTruthy();
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
});
