import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useAppStore } from '../../../src/store/index';
import { ModelSelector } from '../../../src/components/copilot/ModelSelector';

describe('ModelSelector', () => {
  const defaultProps = {
    currentModel: 'gpt-4o',
    onSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      models: [
        { id: 'gpt-4o', name: 'GPT-4o' },
        { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' },
        { id: 'o4-mini', name: 'o4-mini' },
      ],
      modelsLoading: false,
      modelsError: null,
    });
  });

  it('shows current model name', () => {
    render(<ModelSelector {...defaultProps} />);
    expect(screen.getByText('GPT-4o')).toBeTruthy();
  });

  it('opens dropdown on click', () => {
    render(<ModelSelector {...defaultProps} />);
    fireEvent.click(screen.getByText('GPT-4o'));
    expect(screen.getByText('Claude Sonnet 4.5')).toBeTruthy();
    expect(screen.getByText('o4-mini')).toBeTruthy();
  });

  it('opens dropdown upward (bottom-full)', () => {
    const { container } = render(<ModelSelector {...defaultProps} />);
    fireEvent.click(screen.getByText('GPT-4o'));
    const dropdown = container.querySelector('[data-testid="model-dropdown"]');
    expect(dropdown?.className).toContain('bottom-full');
  });

  it('calls onSelect when a model is clicked', () => {
    const onSelect = vi.fn();
    render(<ModelSelector {...defaultProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('GPT-4o'));
    fireEvent.click(screen.getByText('Claude Sonnet 4.5'));
    expect(onSelect).toHaveBeenCalledWith('claude-sonnet-4-5-20250929');
  });

  it('closes dropdown after selecting a model', () => {
    render(<ModelSelector {...defaultProps} />);
    fireEvent.click(screen.getByText('GPT-4o'));
    fireEvent.click(screen.getByText('o4-mini'));
    expect(screen.queryByText('Claude Sonnet 4.5')).toBeNull();
  });

  it('highlights the current model with accent styles', () => {
    render(<ModelSelector {...defaultProps} />);
    fireEvent.click(screen.getByText('GPT-4o'));
    const modelButtons = screen.getAllByRole('button');
    const currentModelButton = modelButtons.find(
      (b) => b.textContent === 'GPT-4o' && b.className.includes('text-accent') && b.className.includes('bg-accent-soft')
    );
    expect(currentModelButton).toBeTruthy();
  });

  it('shows loading state when models are loading', () => {
    useAppStore.setState({ models: [], modelsLoading: true });
    render(<ModelSelector {...defaultProps} />);
    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('shows error state when models failed to load', () => {
    useAppStore.setState({ models: [], modelsError: 'Network error' });
    render(<ModelSelector {...defaultProps} />);
    expect(screen.getByText('Error')).toBeTruthy();
  });

  it('dropdown has max-h-60 overflow-y-auto for scrollable list', () => {
    const { container } = render(<ModelSelector {...defaultProps} />);
    fireEvent.click(screen.getByText('GPT-4o'));
    const dropdown = container.querySelector('[data-testid="model-dropdown"]');
    expect(dropdown?.className).toContain('max-h-60');
    expect(dropdown?.className).toContain('overflow-y-auto');
  });

  it('dropdown has min-w-48 max-w-72 for proper width', () => {
    const { container } = render(<ModelSelector {...defaultProps} />);
    fireEvent.click(screen.getByText('GPT-4o'));
    const dropdown = container.querySelector('[data-testid="model-dropdown"]');
    expect(dropdown?.className).toContain('min-w-48');
    expect(dropdown?.className).toContain('max-w-72');
  });

  it('dropdown shows "GitHub Copilot Models" source title', () => {
    render(<ModelSelector {...defaultProps} />);
    fireEvent.click(screen.getByText('GPT-4o'));
    expect(screen.getByText('GitHub Copilot Models')).toBeTruthy();
  });

  it('trigger button has pill style (bg-bg-tertiary rounded-lg)', () => {
    render(<ModelSelector {...defaultProps} />);
    const trigger = screen.getByRole('button', { name: /GPT-4o/i });
    expect(trigger.className).toContain('bg-bg-tertiary');
    expect(trigger.className).toContain('rounded-lg');
  });

  it('trigger button has truncate and max-w-40', () => {
    render(<ModelSelector {...defaultProps} />);
    const trigger = screen.getByRole('button', { name: /GPT-4o/i });
    expect(trigger.className).toContain('truncate');
    expect(trigger.className).toContain('max-w-40');
  });

  it('dropdown items have truncate and title attribute for tooltip', () => {
    const { container } = render(<ModelSelector {...defaultProps} />);
    fireEvent.click(screen.getByText('GPT-4o'));
    const dropdown = container.querySelector('[data-testid="model-dropdown"]');
    const items = dropdown?.querySelectorAll('button');
    items?.forEach((item) => {
      expect(item.className).toContain('truncate');
      expect(item.getAttribute('title')).toBeTruthy();
    });
  });

  it('dropdown has rounded-xl shadow style', () => {
    const { container } = render(<ModelSelector {...defaultProps} />);
    fireEvent.click(screen.getByText('GPT-4o'));
    const dropdown = container.querySelector('[data-testid="model-dropdown"]');
    expect(dropdown?.className).toContain('rounded-xl');
  });

  it('closes dropdown on click outside', () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <ModelSelector {...defaultProps} />
      </div>
    );
    fireEvent.click(screen.getByText('GPT-4o'));
    expect(screen.getByText('Claude Sonnet 4.5')).toBeTruthy();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByText('Claude Sonnet 4.5')).toBeNull();
  });
});
