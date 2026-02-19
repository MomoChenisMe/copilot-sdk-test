import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskPanel } from '../../../src/components/copilot/TaskPanel';
import type { TaskItem } from '../../../src/store';

describe('TaskPanel', () => {
  const sampleTasks: TaskItem[] = [
    { id: 't1', subject: 'Fix bug', description: '', activeForm: 'Fixing bug', status: 'completed', blockedBy: [] },
    { id: 't2', subject: 'Add feature', description: '', activeForm: 'Adding feature', status: 'in_progress', blockedBy: [] },
    { id: 't3', subject: 'Write tests', description: '', activeForm: '', status: 'pending', blockedBy: [] },
  ];

  it('renders nothing when tasks array is empty', () => {
    const { container } = render(<TaskPanel tasks={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders task panel with correct count', () => {
    render(<TaskPanel tasks={sampleTasks} />);
    expect(screen.getByTestId('task-panel')).toBeTruthy();
    // 1 completed out of 3
    expect(screen.getByTestId('task-panel-toggle').textContent).toContain('1/3');
  });

  it('renders all tasks with correct status icons', () => {
    render(<TaskPanel tasks={sampleTasks} />);
    expect(screen.getByTestId('task-status-completed-t1')).toBeTruthy();
    expect(screen.getByTestId('task-status-in_progress-t2')).toBeTruthy();
    expect(screen.getByTestId('task-status-pending-t3')).toBeTruthy();
  });

  it('shows activeForm for in_progress tasks', () => {
    render(<TaskPanel tasks={sampleTasks} />);
    expect(screen.getByText('Adding feature')).toBeTruthy();
  });

  it('shows subject for pending tasks', () => {
    render(<TaskPanel tasks={sampleTasks} />);
    expect(screen.getByText('Write tests')).toBeTruthy();
  });

  it('shows subject for completed tasks', () => {
    render(<TaskPanel tasks={sampleTasks} />);
    expect(screen.getByText('Fix bug')).toBeTruthy();
  });

  it('collapses task list when toggle is clicked', () => {
    render(<TaskPanel tasks={sampleTasks} />);
    expect(screen.getByTestId('task-list')).toBeTruthy();
    fireEvent.click(screen.getByTestId('task-panel-toggle'));
    expect(screen.queryByTestId('task-list')).toBeNull();
  });

  it('expands task list when toggle is clicked again', () => {
    render(<TaskPanel tasks={sampleTasks} />);
    fireEvent.click(screen.getByTestId('task-panel-toggle'));
    expect(screen.queryByTestId('task-list')).toBeNull();
    fireEvent.click(screen.getByTestId('task-panel-toggle'));
    expect(screen.getByTestId('task-list')).toBeTruthy();
  });
});
