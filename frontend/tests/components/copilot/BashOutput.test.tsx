import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BashOutput } from '../../../src/components/copilot/BashOutput';

describe('BashOutput', () => {
  it('renders output with line numbers', () => {
    render(<BashOutput content={'line1\nline2\nline3'} exitCode={0} />);
    const lines = screen.getAllByTestId(/^bash-line-/);
    expect(lines.length).toBe(3);
  });

  it('shows line number for each line', () => {
    render(<BashOutput content={'hello\nworld'} exitCode={0} />);
    expect(screen.getByTestId('bash-line-1').textContent).toContain('1');
    expect(screen.getByTestId('bash-line-1').textContent).toContain('hello');
    expect(screen.getByTestId('bash-line-2').textContent).toContain('2');
    expect(screen.getByTestId('bash-line-2').textContent).toContain('world');
  });

  it('collapses output longer than 20 lines', () => {
    const longOutput = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`).join('\n');
    render(<BashOutput content={longOutput} exitCode={0} />);
    // Should show only first 20 lines by default
    const visibleLines = screen.getAllByTestId(/^bash-line-/);
    expect(visibleLines.length).toBe(20);
    // Should show "show all" button
    expect(screen.getByTestId('bash-show-all')).toBeTruthy();
  });

  it('expands collapsed output when clicking show all', () => {
    const longOutput = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`).join('\n');
    render(<BashOutput content={longOutput} exitCode={0} />);
    fireEvent.click(screen.getByTestId('bash-show-all'));
    const lines = screen.getAllByTestId(/^bash-line-/);
    expect(lines.length).toBe(30);
  });

  it('shows green success badge for exit code 0', () => {
    render(<BashOutput content={'ok'} exitCode={0} />);
    const badge = screen.getByTestId('exit-code-badge');
    expect(badge.textContent).toContain('✓');
    expect(badge.className).toContain('green');
  });

  it('shows red error badge for non-zero exit code', () => {
    render(<BashOutput content={'fail'} exitCode={1} />);
    const badge = screen.getByTestId('exit-code-badge');
    expect(badge.textContent).toContain('exit 1');
    expect(badge.className).toContain('error');
  });

  it('shows error badge for exit code 127', () => {
    render(<BashOutput content={'command not found'} exitCode={127} />);
    const badge = screen.getByTestId('exit-code-badge');
    expect(badge.textContent).toContain('exit 127');
  });

  it('renders empty content gracefully', () => {
    render(<BashOutput content={''} exitCode={0} />);
    const badge = screen.getByTestId('exit-code-badge');
    expect(badge.textContent).toContain('✓');
  });

  it('does not show collapse button for short output (<=20 lines)', () => {
    const shortOutput = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`).join('\n');
    render(<BashOutput content={shortOutput} exitCode={0} />);
    expect(screen.queryByTestId('bash-show-all')).toBeNull();
  });
});
