import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomBar } from '../../../src/components/layout/BottomBar';

vi.mock('../../../src/components/copilot/ModelSelector', () => ({
  ModelSelector: ({ currentModel, onSelect }: { currentModel: string; onSelect: (id: string) => void }) => (
    <button data-testid="model-selector" onClick={() => onSelect('gpt-4.1')}>
      {currentModel}
    </button>
  ),
}));

describe('BottomBar', () => {
  const defaultProps = {
    activeTab: 'copilot' as const,
    onTabChange: vi.fn(),
    onSend: vi.fn(),
    onAbort: vi.fn(),
    isStreaming: false,
    disabled: false,
    currentModel: 'gpt-5',
    onModelChange: vi.fn(),
  };

  it('renders Copilot and Terminal tabs', () => {
    render(<BottomBar {...defaultProps} />);
    expect(screen.getByText('Copilot')).toBeTruthy();
    expect(screen.getByText('Terminal')).toBeTruthy();
  });

  it('highlights the active tab', () => {
    render(<BottomBar {...defaultProps} activeTab="copilot" />);
    const copilotTab = screen.getByText('Copilot').closest('button');
    expect(copilotTab?.className).toContain('text-accent');
  });

  it('calls onTabChange when clicking a tab', () => {
    const onTabChange = vi.fn();
    render(<BottomBar {...defaultProps} onTabChange={onTabChange} />);
    fireEvent.click(screen.getByText('Terminal'));
    expect(onTabChange).toHaveBeenCalledWith('terminal');
  });

  it('shows the input area when copilot tab is active', () => {
    render(<BottomBar {...defaultProps} activeTab="copilot" />);
    expect(screen.getByPlaceholderText('Send a message...')).toBeTruthy();
  });

  it('hides the input area when terminal tab is active', () => {
    render(<BottomBar {...defaultProps} activeTab="terminal" />);
    expect(screen.queryByPlaceholderText('Send a message...')).toBeNull();
  });

  it('calls onSend when Enter is pressed', () => {
    const onSend = vi.fn();
    render(<BottomBar {...defaultProps} onSend={onSend} />);
    const textarea = screen.getByPlaceholderText('Send a message...');
    fireEvent.change(textarea, { target: { value: 'hello' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('hello');
  });

  it('shows Stop button when streaming', () => {
    render(<BottomBar {...defaultProps} isStreaming={true} />);
    expect(screen.getByText('Stop')).toBeTruthy();
  });

  it('calls onAbort when Stop is clicked', () => {
    const onAbort = vi.fn();
    render(<BottomBar {...defaultProps} isStreaming={true} onAbort={onAbort} />);
    fireEvent.click(screen.getByText('Stop'));
    expect(onAbort).toHaveBeenCalledTimes(1);
  });

  it('disables input when disabled prop is true', () => {
    render(<BottomBar {...defaultProps} disabled={true} />);
    const textarea = screen.getByPlaceholderText('Send a message...');
    expect(textarea).toBeDisabled();
  });

  it('renders ModelSelector in copilot tab', () => {
    render(<BottomBar {...defaultProps} activeTab="copilot" currentModel="gpt-5" />);
    const selector = screen.getByTestId('model-selector');
    expect(selector).toBeTruthy();
    expect(selector.textContent).toBe('gpt-5');
  });

  it('calls onModelChange when model is selected', () => {
    const onModelChange = vi.fn();
    render(<BottomBar {...defaultProps} onModelChange={onModelChange} />);
    fireEvent.click(screen.getByTestId('model-selector'));
    expect(onModelChange).toHaveBeenCalledWith('gpt-4.1');
  });

  it('hides ModelSelector when terminal tab is active', () => {
    render(<BottomBar {...defaultProps} activeTab="terminal" />);
    expect(screen.queryByTestId('model-selector')).toBeNull();
  });
});
