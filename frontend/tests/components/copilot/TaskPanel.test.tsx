import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskPanel } from '../../../src/components/copilot/TaskPanel';
import type { TaskItem } from '../../../src/store';

describe('TaskPanel', () => {
  const sampleTasks: TaskItem[] = [
    { id: 't1', title: 'Fix bug', description: 'Fix the login issue', status: 'done', created_at: '2025-01-01', updated_at: '2025-01-02' },
    { id: 't2', title: 'Add feature', description: 'New dashboard widget', status: 'in_progress', created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 't3', title: 'Write tests', description: null, status: 'pending', created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 't4', title: 'Blocked step', description: 'Waiting on API', status: 'blocked', created_at: '2025-01-01', updated_at: '2025-01-01' },
  ];

  it('renders nothing when tasks array is empty', () => {
    const { container } = render(<TaskPanel tasks={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders task panel with correct done count', () => {
    render(<TaskPanel tasks={sampleTasks} />);
    expect(screen.getByTestId('task-panel')).toBeTruthy();
    // 1 done out of 4
    expect(screen.getByTestId('task-panel-toggle').textContent).toContain('1/4');
  });

  it('renders all tasks with correct status icons', () => {
    render(<TaskPanel tasks={sampleTasks} />);
    expect(screen.getByTestId('task-status-done-t1')).toBeTruthy();
    expect(screen.getByTestId('task-status-in_progress-t2')).toBeTruthy();
    expect(screen.getByTestId('task-status-pending-t3')).toBeTruthy();
    expect(screen.getByTestId('task-status-blocked-t4')).toBeTruthy();
  });

  it('shows blocked label for blocked tasks', () => {
    render(<TaskPanel tasks={sampleTasks} />);
    expect(screen.getByTestId('task-blocked-label-t4')).toBeTruthy();
  });

  it('shows task titles', () => {
    render(<TaskPanel tasks={sampleTasks} />);
    expect(screen.getByText('Fix bug')).toBeTruthy();
    expect(screen.getByText('Add feature')).toBeTruthy();
    expect(screen.getByText('Write tests')).toBeTruthy();
    expect(screen.getByText('Blocked step')).toBeTruthy();
  });

  it('renders progress bar', () => {
    render(<TaskPanel tasks={sampleTasks} />);
    expect(screen.getByTestId('task-progress-bar')).toBeTruthy();
    const fill = screen.getByTestId('task-progress-fill');
    expect(fill.style.width).toBe('25%'); // 1/4 done
  });

  it('collapses task list when toggle is clicked', () => {
    render(<TaskPanel tasks={sampleTasks} />);
    expect(screen.getByTestId('task-list')).toBeTruthy();
    fireEvent.click(screen.getByTestId('task-panel-toggle'));
    expect(screen.queryByTestId('task-list')).toBeNull();
    expect(screen.queryByTestId('task-progress-bar')).toBeNull();
  });

  it('expands task list when toggle is clicked again', () => {
    render(<TaskPanel tasks={sampleTasks} />);
    fireEvent.click(screen.getByTestId('task-panel-toggle'));
    expect(screen.queryByTestId('task-list')).toBeNull();
    fireEvent.click(screen.getByTestId('task-panel-toggle'));
    expect(screen.getByTestId('task-list')).toBeTruthy();
  });

  it('expands description when task with description is clicked', () => {
    render(<TaskPanel tasks={sampleTasks} />);
    // Initially no description shown
    expect(screen.queryByTestId('task-description-t1')).toBeNull();
    // Click the done task which has a description
    fireEvent.click(screen.getByText('Fix bug'));
    expect(screen.getByTestId('task-description-t1')).toBeTruthy();
    expect(screen.getByText('Fix the login issue')).toBeTruthy();
  });

  it('collapses description on second click', () => {
    render(<TaskPanel tasks={sampleTasks} />);
    fireEvent.click(screen.getByText('Fix bug'));
    expect(screen.getByTestId('task-description-t1')).toBeTruthy();
    fireEvent.click(screen.getByText('Fix bug'));
    expect(screen.queryByTestId('task-description-t1')).toBeNull();
  });

  it('does not expand when task has no description', () => {
    render(<TaskPanel tasks={sampleTasks} />);
    fireEvent.click(screen.getByText('Write tests'));
    expect(screen.queryByTestId('task-description-t3')).toBeNull();
  });

  it('applies line-through style to done tasks', () => {
    render(<TaskPanel tasks={sampleTasks} />);
    const doneText = screen.getByText('Fix bug');
    expect(doneText.className).toContain('line-through');
  });
});
