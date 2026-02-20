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

  it('dropdown has min-w-64 max-w-80 for proper width', () => {
    const { container } = render(<ModelSelector {...defaultProps} />);
    fireEvent.click(screen.getByText('GPT-4o'));
    const dropdown = container.querySelector('[data-testid="model-dropdown"]');
    expect(dropdown?.className).toContain('min-w-64');
    expect(dropdown?.className).toContain('max-w-80');
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

  it('trigger button has truncate and max-w-52', () => {
    render(<ModelSelector {...defaultProps} />);
    const trigger = screen.getByRole('button', { name: /GPT-4o/i });
    expect(trigger.className).toContain('truncate');
    expect(trigger.className).toContain('max-w-52');
  });

  it('dropdown items have truncate and title attribute for tooltip', () => {
    const { container } = render(<ModelSelector {...defaultProps} />);
    fireEvent.click(screen.getByText('GPT-4o'));
    const dropdown = container.querySelector('[data-testid="model-dropdown"]');
    const items = dropdown?.querySelectorAll('button');
    items?.forEach((item) => {
      // The truncate class is on the inner span (model name text), not the button itself
      const nameSpan = item.querySelector('.truncate');
      expect(nameSpan).toBeTruthy();
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

  describe('premium multiplier badges', () => {
    it('shows green "0.33x" badge for discount tier models', () => {
      useAppStore.setState({
        models: [
          { id: 'claude-haiku', name: 'Claude Haiku', premiumMultiplier: 0.33 },
        ],
        modelsLoading: false,
        modelsError: null,
      });
      render(<ModelSelector currentModel="claude-haiku" onSelect={vi.fn()} />);
      fireEvent.click(screen.getByText('Claude Haiku'));
      const badge = screen.getAllByText('0.33x');
      expect(badge.length).toBeGreaterThan(0);
      // Check at least one badge has green color
      const greenBadge = badge.find((el) => el.className.includes('text-green-500'));
      expect(greenBadge).toBeTruthy();
    });

    it('shows gray "1x" badge for standard tier models', () => {
      useAppStore.setState({
        models: [
          { id: 'claude-sonnet', name: 'Claude Sonnet', premiumMultiplier: 1 },
        ],
        modelsLoading: false,
        modelsError: null,
      });
      render(<ModelSelector currentModel="claude-sonnet" onSelect={vi.fn()} />);
      fireEvent.click(screen.getByText('Claude Sonnet'));
      const badge = screen.getAllByText('1x');
      expect(badge.length).toBeGreaterThan(0);
      const mutedBadge = badge.find((el) => el.className.includes('text-text-muted'));
      expect(mutedBadge).toBeTruthy();
    });

    it('shows amber "3x" badge for premium tier models', () => {
      useAppStore.setState({
        models: [
          { id: 'claude-opus', name: 'Claude Opus', premiumMultiplier: 3 },
        ],
        modelsLoading: false,
        modelsError: null,
      });
      render(<ModelSelector currentModel="claude-opus" onSelect={vi.fn()} />);
      fireEvent.click(screen.getByText('Claude Opus'));
      const badge = screen.getAllByText('3x');
      expect(badge.length).toBeGreaterThan(0);
      const amberBadge = badge.find((el) => el.className.includes('text-amber-500'));
      expect(amberBadge).toBeTruthy();
    });

    it('shows red "9x" badge for ultra tier models', () => {
      useAppStore.setState({
        models: [
          { id: 'claude-opus-fast', name: 'Claude Opus Fast', premiumMultiplier: 9 },
        ],
        modelsLoading: false,
        modelsError: null,
      });
      render(<ModelSelector currentModel="claude-opus-fast" onSelect={vi.fn()} />);
      fireEvent.click(screen.getByText('Claude Opus Fast'));
      const badge = screen.getAllByText('9x');
      expect(badge.length).toBeGreaterThan(0);
      const redBadge = badge.find((el) => el.className.includes('text-red-500'));
      expect(redBadge).toBeTruthy();
    });

    it('shows no badge when premiumMultiplier is null', () => {
      useAppStore.setState({
        models: [
          { id: 'unknown', name: 'Unknown Model', premiumMultiplier: null },
        ],
        modelsLoading: false,
        modelsError: null,
      });
      render(<ModelSelector currentModel="unknown" onSelect={vi.fn()} />);
      fireEvent.click(screen.getByText('Unknown Model'));
      // No multiplier text should be present
      expect(screen.queryByText(/\dx$/)).toBeNull();
    });

    it('shows no badge when premiumMultiplier is undefined', () => {
      useAppStore.setState({
        models: [
          { id: 'unknown', name: 'Unknown Model' },
        ],
        modelsLoading: false,
        modelsError: null,
      });
      render(<ModelSelector currentModel="unknown" onSelect={vi.fn()} />);
      fireEvent.click(screen.getByText('Unknown Model'));
      expect(screen.queryByText(/\dx$/)).toBeNull();
    });

    it('shows green "0x" badge for free tier models', () => {
      useAppStore.setState({
        models: [
          { id: 'gpt-4o', name: 'GPT-4o', premiumMultiplier: 0 },
        ],
        modelsLoading: false,
        modelsError: null,
      });
      render(<ModelSelector currentModel="gpt-4o" onSelect={vi.fn()} />);
      fireEvent.click(screen.getByText('GPT-4o'));
      const badge = screen.getAllByText('0x');
      expect(badge.length).toBeGreaterThan(0);
      const greenBadge = badge.find((el) => el.className.includes('text-green-500'));
      expect(greenBadge).toBeTruthy();
    });

    it('shows multiplier badge in trigger button for selected model', () => {
      useAppStore.setState({
        models: [
          { id: 'claude-opus', name: 'Claude Opus', premiumMultiplier: 3 },
        ],
        modelsLoading: false,
        modelsError: null,
      });
      render(<ModelSelector currentModel="claude-opus" onSelect={vi.fn()} />);
      // Trigger badge should be visible without opening dropdown
      const triggerBadge = screen.getByTestId('trigger-multiplier');
      expect(triggerBadge.textContent).toBe('3x');
      expect(triggerBadge.className).toContain('text-amber-500');
    });

    it('shows multiplier badges right-aligned in dropdown using ml-auto', () => {
      useAppStore.setState({
        models: [
          { id: 'gpt-5', name: 'GPT-5', premiumMultiplier: 1 },
          { id: 'claude-opus', name: 'Claude Opus', premiumMultiplier: 3 },
        ],
        modelsLoading: false,
        modelsError: null,
      });
      const { container } = render(<ModelSelector currentModel="gpt-5" onSelect={vi.fn()} />);
      fireEvent.click(screen.getByText('GPT-5'));
      const dropdown = container.querySelector('[data-testid="model-dropdown"]');
      const badges = dropdown?.querySelectorAll('.ml-auto');
      expect(badges?.length).toBe(2);
    });
  });
});
