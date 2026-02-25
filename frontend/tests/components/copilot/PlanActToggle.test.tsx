import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PlanAutopilotToggle from '../../../src/components/copilot/PlanAutopilotToggle';

describe('PlanAutopilotToggle', () => {
  it('should render Plan and Autopilot buttons', () => {
    render(<PlanAutopilotToggle planMode={false} onToggle={() => {}} />);
    expect(screen.getByText('Plan')).toBeInTheDocument();
    expect(screen.getByText('Autopilot')).toBeInTheDocument();
  });

  it('should highlight Autopilot button when planMode is false', () => {
    render(<PlanAutopilotToggle planMode={false} onToggle={() => {}} />);
    const autopilotBtn = screen.getByText('Autopilot').closest('button')!;
    expect(autopilotBtn.className).toMatch(/bg-/);
  });

  it('should highlight Plan button when planMode is true', () => {
    render(<PlanAutopilotToggle planMode={true} onToggle={() => {}} />);
    const planBtn = screen.getByText('Plan').closest('button')!;
    expect(planBtn.className).toMatch(/bg-/);
  });

  it('should call onToggle with true when Plan is clicked', () => {
    const onToggle = vi.fn();
    render(<PlanAutopilotToggle planMode={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByText('Plan'));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('should call onToggle with false when Autopilot is clicked', () => {
    const onToggle = vi.fn();
    render(<PlanAutopilotToggle planMode={true} onToggle={onToggle} />);
    fireEvent.click(screen.getByText('Autopilot'));
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('should use outline style (border-accent bg-accent/10) for active button', () => {
    render(<PlanAutopilotToggle planMode={true} onToggle={() => {}} />);
    const planBtn = screen.getByText('Plan').closest('button')!;
    expect(planBtn.className).toContain('border-accent');
    expect(planBtn.className).toContain('text-accent');
    expect(planBtn.className).toContain('bg-accent/10');
    expect(planBtn.className).not.toContain('text-white');
  });

  it('should use outline style for active Autopilot button', () => {
    render(<PlanAutopilotToggle planMode={false} onToggle={() => {}} />);
    const autopilotBtn = screen.getByText('Autopilot').closest('button')!;
    expect(autopilotBtn.className).toContain('border-accent');
    expect(autopilotBtn.className).toContain('text-accent');
    expect(autopilotBtn.className).toContain('bg-accent/10');
    expect(autopilotBtn.className).not.toContain('text-white');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<PlanAutopilotToggle planMode={false} onToggle={() => {}} disabled />);
    const planBtn = screen.getByText('Plan').closest('button')!;
    const autopilotBtn = screen.getByText('Autopilot').closest('button')!;
    expect(planBtn).toBeDisabled();
    expect(autopilotBtn).toBeDisabled();
  });
});
