import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SlashCommandMenu } from '../../../src/components/shared/SlashCommandMenu';
import type { SlashCommand } from '../../../src/components/shared/SlashCommandMenu';

describe('SlashCommandMenu', () => {
  const commands: SlashCommand[] = [
    { name: 'clear', description: 'Clear conversation', type: 'builtin' },
    { name: 'settings', description: 'Open settings', type: 'builtin' },
    { name: 'new', description: 'New conversation', type: 'builtin' },
    { name: 'code-review', description: 'Review code changes', type: 'skill' },
    { name: 'brainstorm', description: 'Brainstorm ideas', type: 'skill' },
  ];

  const defaultProps = {
    commands,
    filter: '',
    onSelect: vi.fn(),
    onClose: vi.fn(),
    selectedIndex: 0,
  };

  it('renders all commands grouped by type', () => {
    render(<SlashCommandMenu {...defaultProps} />);
    expect(screen.getByText('Commands')).toBeTruthy();
    expect(screen.getByText('Skills')).toBeTruthy();
    expect(screen.getByText('/clear')).toBeTruthy();
    expect(screen.getByText('/code-review')).toBeTruthy();
  });

  it('filters commands by name', () => {
    render(<SlashCommandMenu {...defaultProps} filter="code" />);
    expect(screen.getByText('/code-review')).toBeTruthy();
    expect(screen.queryByText('/clear')).toBeNull();
    expect(screen.queryByText('/settings')).toBeNull();
  });

  it('shows no results message when filter matches nothing', () => {
    render(<SlashCommandMenu {...defaultProps} filter="zzzzz" />);
    expect(screen.getByText('No matching commands')).toBeTruthy();
  });

  it('highlights selected item', () => {
    render(<SlashCommandMenu {...defaultProps} selectedIndex={1} />);
    const items = screen.getAllByRole('option');
    expect(items[1].getAttribute('aria-selected')).toBe('true');
  });

  it('calls onSelect when command is clicked', () => {
    const onSelect = vi.fn();
    render(<SlashCommandMenu {...defaultProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('/clear'));
    expect(onSelect).toHaveBeenCalledWith(commands[0]);
  });

  it('shows descriptions for each command', () => {
    render(<SlashCommandMenu {...defaultProps} />);
    expect(screen.getByText('Clear conversation')).toBeTruthy();
    expect(screen.getByText('Review code changes')).toBeTruthy();
  });

  it('hides group header when no commands match in that group', () => {
    render(<SlashCommandMenu {...defaultProps} filter="clear" />);
    expect(screen.getByText('Commands')).toBeTruthy();
    expect(screen.queryByText('Skills')).toBeNull();
  });

  it('renders SDK commands section when sdk type commands present', () => {
    const withSdk: SlashCommand[] = [
      ...commands,
      { name: 'explain', description: 'Explain code', type: 'sdk' },
      { name: 'fix', description: 'Fix code', type: 'sdk' },
    ];
    render(<SlashCommandMenu {...defaultProps} commands={withSdk} />);
    expect(screen.getByText('Commands')).toBeTruthy();
    expect(screen.getByText('Skills')).toBeTruthy();
    expect(screen.getByText('Copilot')).toBeTruthy();
    expect(screen.getByText('/explain')).toBeTruthy();
    expect(screen.getByText('/fix')).toBeTruthy();
  });

  it('hides SDK section header when no sdk commands match filter', () => {
    const withSdk: SlashCommand[] = [
      ...commands,
      { name: 'explain', description: 'Explain code', type: 'sdk' },
    ];
    render(<SlashCommandMenu {...defaultProps} commands={withSdk} filter="clear" />);
    expect(screen.getByText('Commands')).toBeTruthy();
    expect(screen.queryByText('Copilot')).toBeNull();
  });

  it('correctly indexes across all three sections for selectedIndex', () => {
    const withSdk: SlashCommand[] = [
      { name: 'clear', description: 'Clear', type: 'builtin' },
      { name: 'review', description: 'Review', type: 'skill' },
      { name: 'explain', description: 'Explain', type: 'sdk' },
    ];
    // selectedIndex=2 should select the sdk command (3rd item: builtin=0, skill=1, sdk=2)
    render(<SlashCommandMenu {...defaultProps} commands={withSdk} selectedIndex={2} />);
    const items = screen.getAllByRole('option');
    expect(items[2].getAttribute('aria-selected')).toBe('true');
  });
});
