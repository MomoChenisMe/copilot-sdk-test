import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CwdSelector } from '../../../src/components/copilot/CwdSelector';

describe('CwdSelector', () => {
  const defaultProps = {
    currentCwd: '/home/user/projects',
    onCwdChange: vi.fn(),
  };

  it('renders pill with FolderOpen icon and path text', () => {
    render(<CwdSelector {...defaultProps} />);
    expect(screen.getByText('/home/user/projects')).toBeTruthy();
    expect(screen.getByTestId('cwd-selector')).toBeTruthy();
  });

  it('truncates path longer than 25 characters', () => {
    render(<CwdSelector {...defaultProps} currentCwd="/very/long/path/to/my/awesome/project/directory" />);
    const pill = screen.getByTestId('cwd-selector');
    // Should show "..." prefix with last 25 chars
    expect(pill.textContent).toContain('...');
    // Full path in tooltip
    expect(pill.getAttribute('title')).toBe('/very/long/path/to/my/awesome/project/directory');
  });

  it('does not truncate path with 25 or fewer characters', () => {
    render(<CwdSelector {...defaultProps} currentCwd="/home/user/projects" />);
    const pill = screen.getByTestId('cwd-selector');
    expect(pill.textContent).not.toContain('...');
  });

  it('enters edit mode on click', () => {
    render(<CwdSelector {...defaultProps} />);
    fireEvent.click(screen.getByTestId('cwd-selector'));
    const input = screen.getByRole('textbox');
    expect(input).toBeTruthy();
    expect((input as HTMLInputElement).value).toBe('/home/user/projects');
  });

  it('confirms path change on Enter', () => {
    const onCwdChange = vi.fn();
    render(<CwdSelector {...defaultProps} onCwdChange={onCwdChange} />);
    fireEvent.click(screen.getByTestId('cwd-selector'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '/new/path' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCwdChange).toHaveBeenCalledWith('/new/path');
    // Should return to display mode
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('cancels edit on Escape', () => {
    const onCwdChange = vi.fn();
    render(<CwdSelector {...defaultProps} onCwdChange={onCwdChange} />);
    fireEvent.click(screen.getByTestId('cwd-selector'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '/changed/path' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onCwdChange).not.toHaveBeenCalled();
    // Should return to display mode with original path
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText('/home/user/projects')).toBeTruthy();
  });

  it('does not call onCwdChange when Enter pressed with empty value', () => {
    const onCwdChange = vi.fn();
    render(<CwdSelector {...defaultProps} onCwdChange={onCwdChange} />);
    fireEvent.click(screen.getByTestId('cwd-selector'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCwdChange).not.toHaveBeenCalled();
  });

  it('does not call onCwdChange when Enter pressed with same value', () => {
    const onCwdChange = vi.fn();
    render(<CwdSelector {...defaultProps} onCwdChange={onCwdChange} />);
    fireEvent.click(screen.getByTestId('cwd-selector'));
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCwdChange).not.toHaveBeenCalled();
  });

  it('uses pill styling similar to ModelSelector', () => {
    render(<CwdSelector {...defaultProps} />);
    const pill = screen.getByTestId('cwd-selector');
    expect(pill.className).toContain('text-xs');
    expect(pill.className).toContain('rounded-lg');
  });
});
