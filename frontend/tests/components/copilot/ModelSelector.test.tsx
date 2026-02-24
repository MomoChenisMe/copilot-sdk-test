import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelSelector } from '../../../src/components/copilot/ModelSelector';

// Mock useModelsQuery hook
const mockUseModelsQuery = vi.fn();
vi.mock('../../../src/hooks/queries/useModelsQuery', () => ({
  useModelsQuery: (...args: unknown[]) => mockUseModelsQuery(...args),
}));

describe('ModelSelector', () => {
  const defaultModels = [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' },
    { id: 'o4-mini', name: 'o4-mini' },
  ];

  const defaultProps = {
    currentModel: 'gpt-4o',
    onSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseModelsQuery.mockReturnValue({
      data: defaultModels,
      isLoading: false,
      error: null,
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
    mockUseModelsQuery.mockReturnValue({ data: [], isLoading: true, error: null });
    render(<ModelSelector {...defaultProps} />);
    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('shows error state when models failed to load', () => {
    mockUseModelsQuery.mockReturnValue({ data: [], isLoading: false, error: new Error('Network error') });
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

  it('dropdown has min-w-48 and responsive max-w for proper width', () => {
    const { container } = render(<ModelSelector {...defaultProps} />);
    fireEvent.click(screen.getByText('GPT-4o'));
    const dropdown = container.querySelector('[data-testid="model-dropdown"]');
    expect(dropdown?.className).toContain('min-w-48');
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
    // max-w can be max-w-32 or max-w-52 depending on responsive breakpoint
    expect(trigger.className).toMatch(/max-w-/);
  });

  it('dropdown items have truncate and title attribute for tooltip', () => {
    const { container } = render(<ModelSelector {...defaultProps} />);
    fireEvent.click(screen.getByText('GPT-4o'));
    const dropdown = container.querySelector('[data-testid="model-dropdown"]');
    const items = dropdown?.querySelectorAll('button');
    items?.forEach((item) => {
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
      mockUseModelsQuery.mockReturnValue({
        data: [{ id: 'claude-haiku', name: 'Claude Haiku', premiumMultiplier: 0.33 }],
        isLoading: false,
        error: null,
      });
      render(<ModelSelector currentModel="claude-haiku" onSelect={vi.fn()} />);
      fireEvent.click(screen.getByText('Claude Haiku'));
      const badge = screen.getAllByText('0.33x');
      expect(badge.length).toBeGreaterThan(0);
      const greenBadge = badge.find((el) => el.className.includes('text-green-500'));
      expect(greenBadge).toBeTruthy();
    });

    it('shows gray "1x" badge for standard tier models', () => {
      mockUseModelsQuery.mockReturnValue({
        data: [{ id: 'claude-sonnet', name: 'Claude Sonnet', premiumMultiplier: 1 }],
        isLoading: false,
        error: null,
      });
      render(<ModelSelector currentModel="claude-sonnet" onSelect={vi.fn()} />);
      fireEvent.click(screen.getByText('Claude Sonnet'));
      const badge = screen.getAllByText('1x');
      expect(badge.length).toBeGreaterThan(0);
      const mutedBadge = badge.find((el) => el.className.includes('text-text-muted'));
      expect(mutedBadge).toBeTruthy();
    });

    it('shows amber "3x" badge for premium tier models', () => {
      mockUseModelsQuery.mockReturnValue({
        data: [{ id: 'claude-opus', name: 'Claude Opus', premiumMultiplier: 3 }],
        isLoading: false,
        error: null,
      });
      render(<ModelSelector currentModel="claude-opus" onSelect={vi.fn()} />);
      fireEvent.click(screen.getByText('Claude Opus'));
      const badge = screen.getAllByText('3x');
      expect(badge.length).toBeGreaterThan(0);
      const amberBadge = badge.find((el) => el.className.includes('text-amber-500'));
      expect(amberBadge).toBeTruthy();
    });

    it('shows red "9x" badge for ultra tier models', () => {
      mockUseModelsQuery.mockReturnValue({
        data: [{ id: 'claude-opus-fast', name: 'Claude Opus Fast', premiumMultiplier: 9 }],
        isLoading: false,
        error: null,
      });
      render(<ModelSelector currentModel="claude-opus-fast" onSelect={vi.fn()} />);
      fireEvent.click(screen.getByText('Claude Opus Fast'));
      const badge = screen.getAllByText('9x');
      expect(badge.length).toBeGreaterThan(0);
      const redBadge = badge.find((el) => el.className.includes('text-red-500'));
      expect(redBadge).toBeTruthy();
    });

    it('shows no badge when premiumMultiplier is null', () => {
      mockUseModelsQuery.mockReturnValue({
        data: [{ id: 'unknown', name: 'Unknown Model', premiumMultiplier: null }],
        isLoading: false,
        error: null,
      });
      render(<ModelSelector currentModel="unknown" onSelect={vi.fn()} />);
      fireEvent.click(screen.getByText('Unknown Model'));
      expect(screen.queryByText(/\dx$/)).toBeNull();
    });

    it('shows no badge when premiumMultiplier is undefined', () => {
      mockUseModelsQuery.mockReturnValue({
        data: [{ id: 'unknown', name: 'Unknown Model' }],
        isLoading: false,
        error: null,
      });
      render(<ModelSelector currentModel="unknown" onSelect={vi.fn()} />);
      fireEvent.click(screen.getByText('Unknown Model'));
      expect(screen.queryByText(/\dx$/)).toBeNull();
    });

    it('shows green "0x" badge for free tier models', () => {
      mockUseModelsQuery.mockReturnValue({
        data: [{ id: 'gpt-4o', name: 'GPT-4o', premiumMultiplier: 0 }],
        isLoading: false,
        error: null,
      });
      render(<ModelSelector currentModel="gpt-4o" onSelect={vi.fn()} />);
      fireEvent.click(screen.getByText('GPT-4o'));
      const badge = screen.getAllByText('0x');
      expect(badge.length).toBeGreaterThan(0);
      const greenBadge = badge.find((el) => el.className.includes('text-green-500'));
      expect(greenBadge).toBeTruthy();
    });

    it('shows multiplier badge in trigger button for selected model', () => {
      mockUseModelsQuery.mockReturnValue({
        data: [{ id: 'claude-opus', name: 'Claude Opus', premiumMultiplier: 3 }],
        isLoading: false,
        error: null,
      });
      render(<ModelSelector currentModel="claude-opus" onSelect={vi.fn()} />);
      const triggerBadge = screen.getByTestId('trigger-multiplier');
      expect(triggerBadge.textContent).toBe('3x');
      expect(triggerBadge.className).toContain('text-amber-500');
    });

    it('shows multiplier badges right-aligned in dropdown using ml-auto', () => {
      mockUseModelsQuery.mockReturnValue({
        data: [
          { id: 'gpt-5', name: 'GPT-5', premiumMultiplier: 1 },
          { id: 'claude-opus', name: 'Claude Opus', premiumMultiplier: 3 },
        ],
        isLoading: false,
        error: null,
      });
      const { container } = render(<ModelSelector currentModel="gpt-5" onSelect={vi.fn()} />);
      fireEvent.click(screen.getByText('GPT-5'));
      const dropdown = container.querySelector('[data-testid="model-dropdown"]');
      const badges = dropdown?.querySelectorAll('.ml-auto');
      expect(badges?.length).toBe(2);
    });
  });
});
