import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TabBar } from '../../../src/components/layout/TabBar';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Sparkles: (props: any) => <svg data-testid="sparkles-icon" {...props} />,
  TerminalSquare: (props: any) => <svg data-testid="terminal-icon" {...props} />,
}));

describe('TabBar', () => {
  const defaultProps = {
    activeTab: 'copilot' as const,
    onTabChange: vi.fn(),
  };

  it('renders Copilot and Terminal tabs', () => {
    render(<TabBar {...defaultProps} />);
    expect(screen.getByText('Copilot')).toBeTruthy();
    expect(screen.getByText('Terminal')).toBeTruthy();
  });

  it('renders Sparkles icon for Copilot tab', () => {
    render(<TabBar {...defaultProps} />);
    expect(screen.getByTestId('sparkles-icon')).toBeTruthy();
  });

  it('renders TerminalSquare icon for Terminal tab', () => {
    render(<TabBar {...defaultProps} />);
    expect(screen.getByTestId('terminal-icon')).toBeTruthy();
  });

  it('applies active styles to Copilot tab when active', () => {
    render(<TabBar {...defaultProps} activeTab="copilot" />);
    const copilotBtn = screen.getByText('Copilot').closest('button');
    expect(copilotBtn?.className).toContain('text-accent');
    expect(copilotBtn?.className).toContain('bg-accent-soft');
  });

  it('applies inactive styles to Terminal tab when copilot is active', () => {
    render(<TabBar {...defaultProps} activeTab="copilot" />);
    const terminalBtn = screen.getByText('Terminal').closest('button');
    expect(terminalBtn?.className).toContain('text-text-muted');
  });

  it('applies active styles to Terminal tab when active', () => {
    render(<TabBar {...defaultProps} activeTab="terminal" />);
    const terminalBtn = screen.getByText('Terminal').closest('button');
    expect(terminalBtn?.className).toContain('text-accent');
    expect(terminalBtn?.className).toContain('bg-accent-soft');
  });

  it('calls onTabChange with "copilot" when Copilot tab is clicked', () => {
    const onTabChange = vi.fn();
    render(<TabBar {...defaultProps} onTabChange={onTabChange} activeTab="terminal" />);
    fireEvent.click(screen.getByText('Copilot'));
    expect(onTabChange).toHaveBeenCalledWith('copilot');
  });

  it('calls onTabChange with "terminal" when Terminal tab is clicked', () => {
    const onTabChange = vi.fn();
    render(<TabBar {...defaultProps} onTabChange={onTabChange} />);
    fireEvent.click(screen.getByText('Terminal'));
    expect(onTabChange).toHaveBeenCalledWith('terminal');
  });

  it('has h-10 height and border-b border-border-subtle', () => {
    const { container } = render(<TabBar {...defaultProps} />);
    const tabBar = container.firstChild as HTMLElement;
    expect(tabBar.className).toContain('h-10');
    expect(tabBar.className).toContain('border-b');
    expect(tabBar.className).toContain('border-border-subtle');
  });
});
