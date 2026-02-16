import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../../../src/components/shared/Input';
import type { SlashCommand } from '../../../src/components/shared/SlashCommandMenu';

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

  // === Attachment integration ===
  describe('attachments', () => {
    it('renders Paperclip button when enableAttachments is true', () => {
      render(<Input {...defaultProps} enableAttachments={true} />);
      expect(screen.getByTestId('attach-button')).toBeTruthy();
    });

    it('does not render Paperclip button when enableAttachments is not set', () => {
      render(<Input {...defaultProps} />);
      expect(screen.queryByTestId('attach-button')).toBeNull();
    });

    it('calls onSend with text and attachments', () => {
      const onSend = vi.fn();
      render(<Input {...defaultProps} onSend={onSend} enableAttachments={true} />);
      const textarea = screen.getByPlaceholderText('Message AI Terminal...');
      fireEvent.change(textarea, { target: { value: 'check this' } });
      fireEvent.keyDown(textarea, { key: 'Enter' });
      // When no attachments, should still call onSend with just text
      expect(onSend).toHaveBeenCalledWith('check this', []);
    });

    it('renders attachment preview when files are added via hidden input', async () => {
      render(<Input {...defaultProps} enableAttachments={true} />);
      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
      const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
      fireEvent.change(fileInput, { target: { files: [file] } });
      expect(await screen.findByText('test.txt')).toBeTruthy();
    });

    it('removes attachment when X button is clicked', async () => {
      render(<Input {...defaultProps} enableAttachments={true} />);
      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
      const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
      fireEvent.change(fileInput, { target: { files: [file] } });
      const removeBtn = await screen.findByTestId(/attachment-remove-/);
      fireEvent.click(removeBtn);
      expect(screen.queryByText('test.txt')).toBeNull();
    });

    it('clears attachments after sending', () => {
      const onSend = vi.fn();
      render(<Input {...defaultProps} onSend={onSend} enableAttachments={true} />);
      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
      const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
      fireEvent.change(fileInput, { target: { files: [file] } });
      const textarea = screen.getByPlaceholderText('Message AI Terminal...');
      fireEvent.change(textarea, { target: { value: 'check' } });
      fireEvent.keyDown(textarea, { key: 'Enter' });
      expect(screen.queryByText('test.txt')).toBeNull();
    });
  });

  // === Slash command integration ===
  describe('slash commands', () => {
    const slashCommands: SlashCommand[] = [
      { name: 'clear', description: 'Clear conversation', type: 'builtin' },
      { name: 'settings', description: 'Open settings', type: 'builtin' },
      { name: 'code-review', description: 'Review code', type: 'skill' },
    ];

    it('shows slash command menu when "/" is typed at start', () => {
      render(
        <Input
          {...defaultProps}
          slashCommands={slashCommands}
          onSlashCommand={vi.fn()}
        />,
      );
      const textarea = screen.getByPlaceholderText('Message AI Terminal...');
      fireEvent.change(textarea, { target: { value: '/' } });
      expect(screen.getByRole('listbox')).toBeTruthy();
    });

    it('does not show slash command menu for "/" in the middle of text', () => {
      render(
        <Input
          {...defaultProps}
          slashCommands={slashCommands}
          onSlashCommand={vi.fn()}
        />,
      );
      const textarea = screen.getByPlaceholderText('Message AI Terminal...');
      fireEvent.change(textarea, { target: { value: 'hello / world' } });
      expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('filters commands as user types after /', () => {
      render(
        <Input
          {...defaultProps}
          slashCommands={slashCommands}
          onSlashCommand={vi.fn()}
        />,
      );
      const textarea = screen.getByPlaceholderText('Message AI Terminal...');
      fireEvent.change(textarea, { target: { value: '/code' } });
      expect(screen.getByText('/code-review')).toBeTruthy();
      expect(screen.queryByText('/clear')).toBeNull();
    });

    it('calls onSlashCommand for builtin command selection', () => {
      const onSlashCommand = vi.fn();
      render(
        <Input
          {...defaultProps}
          slashCommands={slashCommands}
          onSlashCommand={onSlashCommand}
        />,
      );
      const textarea = screen.getByPlaceholderText('Message AI Terminal...');
      fireEvent.change(textarea, { target: { value: '/' } });
      fireEvent.click(screen.getByText('/clear'));
      expect(onSlashCommand).toHaveBeenCalledWith(slashCommands[0]);
    });

    it('inserts skill name into textarea for skill command selection', () => {
      const onSlashCommand = vi.fn();
      render(
        <Input
          {...defaultProps}
          slashCommands={slashCommands}
          onSlashCommand={onSlashCommand}
        />,
      );
      const textarea = screen.getByPlaceholderText('Message AI Terminal...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: '/' } });
      fireEvent.click(screen.getByText('/code-review'));
      expect(textarea.value).toBe('/code-review ');
    });
  });
});
