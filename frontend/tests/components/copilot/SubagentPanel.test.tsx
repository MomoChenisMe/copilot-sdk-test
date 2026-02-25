import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubagentPanel } from '../../../src/components/copilot/SubagentPanel';
import type { SubagentItem } from '../../../src/store';

describe('SubagentPanel', () => {
  const makeAgent = (overrides: Partial<SubagentItem> = {}): SubagentItem => ({
    toolCallId: 'sa-1',
    agentName: 'researcher',
    displayName: 'Researcher',
    status: 'running',
    ...overrides,
  });

  it('should not render when subagents array is empty', () => {
    const { container } = render(<SubagentPanel subagents={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('should render panel when subagents exist', () => {
    render(<SubagentPanel subagents={[makeAgent()]} />);
    expect(screen.getByTestId('subagent-panel')).toBeInTheDocument();
  });

  it('should display subagent count in header', () => {
    render(<SubagentPanel subagents={[makeAgent(), makeAgent({ toolCallId: 'sa-2', agentName: 'coder', displayName: 'Coder', status: 'completed' })]} />);
    expect(screen.getByTestId('subagent-panel-toggle')).toHaveTextContent('1/2');
  });

  it('should show running icon for running subagent', () => {
    render(<SubagentPanel subagents={[makeAgent({ status: 'running' })]} />);
    expect(screen.getByTestId('subagent-status-running-sa-1')).toBeInTheDocument();
  });

  it('should show completed icon for completed subagent', () => {
    render(<SubagentPanel subagents={[makeAgent({ status: 'completed' })]} />);
    expect(screen.getByTestId('subagent-status-completed-sa-1')).toBeInTheDocument();
  });

  it('should show failed icon for failed subagent', () => {
    render(<SubagentPanel subagents={[makeAgent({ status: 'failed', error: 'Timed out' })]} />);
    expect(screen.getByTestId('subagent-status-failed-sa-1')).toBeInTheDocument();
  });

  it('should show progress bar with correct percentage', () => {
    const agents = [
      makeAgent({ toolCallId: 'sa-1', status: 'completed' }),
      makeAgent({ toolCallId: 'sa-2', status: 'running' }),
      makeAgent({ toolCallId: 'sa-3', status: 'failed' }),
    ];
    render(<SubagentPanel subagents={agents} />);
    const fill = screen.getByTestId('subagent-progress-fill');
    // 2 out of 3 are done (completed + failed)
    expect(fill.style.width).toBe('67%');
  });

  it('should toggle collapse on click', () => {
    render(<SubagentPanel subagents={[makeAgent()]} />);
    expect(screen.getByTestId('subagent-list')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('subagent-panel-toggle'));
    expect(screen.queryByTestId('subagent-list')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('subagent-panel-toggle'));
    expect(screen.getByTestId('subagent-list')).toBeInTheDocument();
  });

  it('should display agent display name', () => {
    render(<SubagentPanel subagents={[makeAgent({ displayName: 'My Agent' })]} />);
    expect(screen.getByText('My Agent')).toBeInTheDocument();
  });

  it('should display description when present', () => {
    render(<SubagentPanel subagents={[makeAgent({ description: 'Researches topics' })]} />);
    expect(screen.getByText('Researches topics')).toBeInTheDocument();
  });
});
