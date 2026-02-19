import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToggleSwitch } from '../../../src/components/shared/ToggleSwitch';

describe('ToggleSwitch', () => {
  // --- Rendering ---
  it('should render a button with role="switch"', () => {
    render(<ToggleSwitch checked={false} onChange={() => {}} />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeTruthy();
  });

  it('should set aria-checked to true when checked', () => {
    render(<ToggleSwitch checked={true} onChange={() => {}} />);
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
  });

  it('should set aria-checked to false when unchecked', () => {
    render(<ToggleSwitch checked={false} onChange={() => {}} />);
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false');
  });

  // --- Colors ---
  it('should use accent track color when checked', () => {
    render(<ToggleSwitch checked={true} onChange={() => {}} />);
    const toggle = screen.getByRole('switch');
    expect(toggle.className).toContain('bg-accent');
    expect(toggle.className).not.toContain('bg-bg-tertiary');
  });

  it('should use neutral (bg-tertiary) track color when unchecked', () => {
    render(<ToggleSwitch checked={false} onChange={() => {}} />);
    const toggle = screen.getByRole('switch');
    expect(toggle.className).toContain('bg-bg-tertiary');
    expect(toggle.className).not.toContain('bg-accent');
  });

  // --- Interaction ---
  it('should call onChange when clicked', () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledOnce();
  });

  // --- Disabled state ---
  it('should not call onChange when disabled', () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} onChange={onChange} disabled />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should have reduced opacity when disabled', () => {
    render(<ToggleSwitch checked={false} onChange={() => {}} disabled />);
    const toggle = screen.getByRole('switch');
    expect(toggle.className).toContain('opacity-50');
  });

  // --- iOS-style proportions ---
  it('should have iOS-style proportions (w-11 h-6)', () => {
    render(<ToggleSwitch checked={false} onChange={() => {}} />);
    const toggle = screen.getByRole('switch');
    expect(toggle.className).toContain('w-11');
    expect(toggle.className).toContain('h-6');
  });

  // --- Thumb ---
  it('should render a thumb element', () => {
    const { container } = render(<ToggleSwitch checked={false} onChange={() => {}} />);
    const thumb = container.querySelector('[data-testid="toggle-thumb"]');
    expect(thumb).toBeTruthy();
  });

  it('should translate thumb when checked', () => {
    const { container } = render(<ToggleSwitch checked={true} onChange={() => {}} />);
    const thumb = container.querySelector('[data-testid="toggle-thumb"]');
    expect(thumb?.className).toContain('translate-x-5');
  });

  it('should not translate thumb when unchecked', () => {
    const { container } = render(<ToggleSwitch checked={false} onChange={() => {}} />);
    const thumb = container.querySelector('[data-testid="toggle-thumb"]');
    expect(thumb?.className).not.toContain('translate-x-5');
    expect(thumb?.className).toContain('translate-x-0');
  });
});
