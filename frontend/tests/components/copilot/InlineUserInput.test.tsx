import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InlineUserInput } from '../../../src/components/copilot/InlineUserInput';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('InlineUserInput', () => {
  const defaultProps = {
    question: 'Which approach?',
    choices: ['Option A', 'Option B', 'Option C'],
    allowFreeform: true,
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Rendering ---
  describe('rendering', () => {
    it('should render the question text', () => {
      render(<InlineUserInput {...defaultProps} />);
      expect(screen.getByText('Which approach?')).toBeDefined();
    });

    it('should render as an inline card (not a modal overlay)', () => {
      const { container } = render(<InlineUserInput {...defaultProps} />);
      expect(container.querySelector('[data-testid="inline-user-input"]')).toBeDefined();
      // Should NOT have fixed/modal overlay classes
      expect(container.querySelector('.fixed')).toBeNull();
    });

    it('should render radio buttons for single-select (default)', () => {
      render(<InlineUserInput {...defaultProps} />);
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(3);
    });

    it('should render checkboxes for multi-select', () => {
      render(<InlineUserInput {...defaultProps} multiSelect />);
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(3);
    });

    it('should render freeform input when allowFreeform is true', () => {
      render(<InlineUserInput {...defaultProps} />);
      expect(screen.getByPlaceholderText('userInput.typeResponse')).toBeDefined();
    });

    it('should not render freeform input when allowFreeform is false', () => {
      render(<InlineUserInput {...defaultProps} allowFreeform={false} />);
      expect(screen.queryByPlaceholderText('userInput.typeResponse')).toBeNull();
    });

    it('should not render choices when no choices are provided', () => {
      render(<InlineUserInput {...defaultProps} choices={undefined} />);
      expect(screen.queryByRole('radio')).toBeNull();
    });
  });

  // --- Single-select (radio) ---
  describe('single-select (radio)', () => {
    it('should call onSubmit with the selected choice on radio click', () => {
      const onSubmit = vi.fn();
      render(<InlineUserInput {...defaultProps} onSubmit={onSubmit} />);

      const radios = screen.getAllByRole('radio');
      fireEvent.click(radios[0]);

      expect(onSubmit).toHaveBeenCalledWith('Option A', false);
    });

    it('should call onSubmit immediately on radio click (no submit button needed)', () => {
      const onSubmit = vi.fn();
      render(<InlineUserInput {...defaultProps} onSubmit={onSubmit} />);

      fireEvent.click(screen.getAllByRole('radio')[1]);
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith('Option B', false);
    });
  });

  // --- Multi-select (checkbox) ---
  describe('multi-select (checkbox)', () => {
    it('should render a submit button in multi-select mode', () => {
      render(<InlineUserInput {...defaultProps} multiSelect />);
      expect(screen.getByTestId('multi-submit-btn')).toBeDefined();
    });

    it('should submit selected choices as JSON array on submit button click', () => {
      const onSubmit = vi.fn();
      render(<InlineUserInput {...defaultProps} multiSelect onSubmit={onSubmit} />);

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]); // Select Option A
      fireEvent.click(checkboxes[2]); // Select Option C

      fireEvent.click(screen.getByTestId('multi-submit-btn'));
      expect(onSubmit).toHaveBeenCalledWith(JSON.stringify(['Option A', 'Option C']), false);
    });

    it('should disable submit button when no checkboxes are selected', () => {
      render(<InlineUserInput {...defaultProps} multiSelect />);
      const btn = screen.getByTestId('multi-submit-btn');
      expect(btn.hasAttribute('disabled')).toBe(true);
    });
  });

  // --- Freeform ---
  describe('freeform input', () => {
    it('should call onSubmit with freeform text and wasFreeform=true', () => {
      const onSubmit = vi.fn();
      render(<InlineUserInput {...defaultProps} onSubmit={onSubmit} />);

      const input = screen.getByPlaceholderText('userInput.typeResponse');
      fireEvent.change(input, { target: { value: 'My custom answer' } });
      fireEvent.submit(input.closest('form')!);

      expect(onSubmit).toHaveBeenCalledWith('My custom answer', true);
    });

    it('should not submit when freeform text is empty', () => {
      const onSubmit = vi.fn();
      render(<InlineUserInput {...defaultProps} onSubmit={onSubmit} />);

      const input = screen.getByPlaceholderText('userInput.typeResponse');
      fireEvent.submit(input.closest('form')!);

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});
