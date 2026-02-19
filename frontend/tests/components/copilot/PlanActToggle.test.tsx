import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PlanActToggle from '../../../src/components/copilot/PlanActToggle';

describe('PlanActToggle', () => {
  it('should render Plan and Act buttons', () => {
    render(<PlanActToggle planMode={false} onToggle={() => {}} />);
    expect(screen.getByText('Plan')).toBeInTheDocument();
    expect(screen.getByText('Act')).toBeInTheDocument();
  });

  it('should highlight Act button when planMode is false', () => {
    render(<PlanActToggle planMode={false} onToggle={() => {}} />);
    const actBtn = screen.getByText('Act').closest('button')!;
    expect(actBtn.className).toMatch(/bg-/);
  });

  it('should highlight Plan button when planMode is true', () => {
    render(<PlanActToggle planMode={true} onToggle={() => {}} />);
    const planBtn = screen.getByText('Plan').closest('button')!;
    expect(planBtn.className).toMatch(/bg-/);
  });

  it('should call onToggle with true when Plan is clicked', () => {
    const onToggle = vi.fn();
    render(<PlanActToggle planMode={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByText('Plan'));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('should call onToggle with false when Act is clicked', () => {
    const onToggle = vi.fn();
    render(<PlanActToggle planMode={true} onToggle={onToggle} />);
    fireEvent.click(screen.getByText('Act'));
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('should use outline style (border-accent bg-accent/10) for active button, not solid bg-accent', () => {
    render(<PlanActToggle planMode={true} onToggle={() => {}} />);
    const planBtn = screen.getByText('Plan').closest('button')!;
    // Active should use outline style, not solid background
    expect(planBtn.className).toContain('border-accent');
    expect(planBtn.className).toContain('text-accent');
    expect(planBtn.className).toContain('bg-accent/10');
    // Should NOT have solid white text (old style was bg-accent text-white)
    expect(planBtn.className).not.toContain('text-white');
  });

  it('should use outline style for active Act button', () => {
    render(<PlanActToggle planMode={false} onToggle={() => {}} />);
    const actBtn = screen.getByText('Act').closest('button')!;
    expect(actBtn.className).toContain('border-accent');
    expect(actBtn.className).toContain('text-accent');
    expect(actBtn.className).toContain('bg-accent/10');
    expect(actBtn.className).not.toContain('text-white');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<PlanActToggle planMode={false} onToggle={() => {}} disabled />);
    const planBtn = screen.getByText('Plan').closest('button')!;
    const actBtn = screen.getByText('Act').closest('button')!;
    expect(planBtn).toBeDisabled();
    expect(actBtn).toBeDisabled();
  });
});
