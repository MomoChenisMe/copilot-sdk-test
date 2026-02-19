import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserInputDialog } from '../../../src/components/copilot/UserInputDialog';

describe('UserInputDialog', () => {
  const defaultProps = {
    question: 'Which approach do you prefer?',
    choices: ['Option A', 'Option B', 'Option C'],
    allowFreeform: true,
    onSubmit: vi.fn(),
  };

  it('should render the question text', () => {
    render(<UserInputDialog {...defaultProps} />);
    expect(screen.getByText('Which approach do you prefer?')).toBeInTheDocument();
  });

  it('should render choice buttons when choices are provided', () => {
    render(<UserInputDialog {...defaultProps} />);
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
    expect(screen.getByText('Option C')).toBeInTheDocument();
  });

  it('should call onSubmit with selected choice and wasFreeform=false when a choice is clicked', () => {
    const onSubmit = vi.fn();
    render(<UserInputDialog {...defaultProps} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText('Option B'));
    expect(onSubmit).toHaveBeenCalledWith('Option B', false);
  });

  it('should render freeform input when allowFreeform is true', () => {
    render(<UserInputDialog {...defaultProps} />);
    expect(screen.getByPlaceholderText(/type/i)).toBeInTheDocument();
  });

  it('should not render freeform input when allowFreeform is false', () => {
    render(<UserInputDialog {...defaultProps} allowFreeform={false} />);
    expect(screen.queryByPlaceholderText(/type/i)).not.toBeInTheDocument();
  });

  it('should call onSubmit with freeform text and wasFreeform=true on submit', () => {
    const onSubmit = vi.fn();
    render(<UserInputDialog {...defaultProps} onSubmit={onSubmit} />);
    const input = screen.getByPlaceholderText(/type/i);
    fireEvent.change(input, { target: { value: 'My custom answer' } });
    fireEvent.submit(input.closest('form')!);
    expect(onSubmit).toHaveBeenCalledWith('My custom answer', true);
  });

  it('should not submit empty freeform text', () => {
    const onSubmit = vi.fn();
    render(<UserInputDialog {...defaultProps} onSubmit={onSubmit} />);
    const input = screen.getByPlaceholderText(/type/i);
    fireEvent.submit(input.closest('form')!);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should render without choices when none provided', () => {
    render(
      <UserInputDialog
        question="What do you think?"
        allowFreeform={true}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText('What do you think?')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/type/i)).toBeInTheDocument();
  });

  it('should have a backdrop overlay', () => {
    render(<UserInputDialog {...defaultProps} />);
    expect(screen.getByTestId('user-input-overlay')).toBeInTheDocument();
  });

  it('should use i18n for placeholder text', () => {
    render(<UserInputDialog {...defaultProps} />);
    expect(screen.getByPlaceholderText('Type your response...')).toBeInTheDocument();
  });

  // --- Skip button ---

  it('should render Skip button when onSkip is provided', () => {
    const onSkip = vi.fn();
    render(<UserInputDialog {...defaultProps} onSkip={onSkip} />);
    expect(screen.getByTestId('skip-button')).toBeInTheDocument();
    expect(screen.getByText('Skip')).toBeInTheDocument();
  });

  it('should call onSkip when Skip button is clicked', () => {
    const onSkip = vi.fn();
    render(<UserInputDialog {...defaultProps} onSkip={onSkip} />);
    fireEvent.click(screen.getByTestId('skip-button'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('should not render Skip button when onSkip is not provided', () => {
    render(<UserInputDialog {...defaultProps} />);
    expect(screen.queryByTestId('skip-button')).not.toBeInTheDocument();
  });

  // --- Timeout state ---

  it('should show timeout banner when timedOut is true', () => {
    render(<UserInputDialog {...defaultProps} timedOut={true} onDismissTimeout={vi.fn()} />);
    expect(screen.getByTestId('timeout-banner')).toBeInTheDocument();
    // en.json: userInput.timedOut
    expect(screen.getByText(/timed out/i)).toBeInTheDocument();
  });

  it('should hide choices and freeform input when timed out', () => {
    render(<UserInputDialog {...defaultProps} timedOut={true} onDismissTimeout={vi.fn()} />);
    expect(screen.queryByText('Option A')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/type/i)).not.toBeInTheDocument();
  });

  it('should hide Skip button when timed out', () => {
    render(<UserInputDialog {...defaultProps} timedOut={true} onSkip={vi.fn()} onDismissTimeout={vi.fn()} />);
    expect(screen.queryByTestId('skip-button')).not.toBeInTheDocument();
  });

  it('should call onDismissTimeout when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(<UserInputDialog {...defaultProps} timedOut={true} onDismissTimeout={onDismiss} />);
    fireEvent.click(screen.getByTestId('dismiss-timeout'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
