import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../../src/lib/api', () => ({
  cronApi: {
    listJobs: vi.fn().mockResolvedValue({
      jobs: [
        {
          id: 'job-1',
          name: 'Daily Report',
          type: 'ai',
          scheduleType: 'cron',
          scheduleValue: '0 9 * * *',
          config: { prompt: 'Generate daily report', model: 'gpt-4o' },
          enabled: true,
          lastRun: '2026-02-18T09:00:00Z',
          nextRun: '2026-02-19T09:00:00Z',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-02-18T09:00:00Z',
        },
        {
          id: 'job-2',
          name: 'Backup DB',
          type: 'shell',
          scheduleType: 'interval',
          scheduleValue: '6h',
          config: { command: 'pg_dump mydb > backup.sql' },
          enabled: false,
          lastRun: null,
          nextRun: null,
          createdAt: '2026-01-02T00:00:00Z',
          updatedAt: '2026-01-02T00:00:00Z',
        },
      ],
    }),
    createJob: vi.fn().mockResolvedValue({
      job: {
        id: 'job-3',
        name: 'New Job',
        type: 'ai',
        scheduleType: 'cron',
        scheduleValue: '*/5 * * * *',
        config: { prompt: 'Do something', model: 'gpt-4o' },
        enabled: true,
        lastRun: null,
        nextRun: '2026-02-19T10:00:00Z',
        createdAt: '2026-02-19T00:00:00Z',
        updatedAt: '2026-02-19T00:00:00Z',
      },
    }),
    updateJob: vi.fn().mockResolvedValue({
      job: {
        id: 'job-1',
        name: 'Daily Report',
        type: 'ai',
        scheduleType: 'cron',
        scheduleValue: '0 9 * * *',
        config: { prompt: 'Generate daily report', model: 'gpt-4o' },
        enabled: false,
        lastRun: '2026-02-18T09:00:00Z',
        nextRun: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-02-19T00:00:00Z',
      },
    }),
    deleteJob: vi.fn().mockResolvedValue(undefined),
    triggerJob: vi.fn().mockResolvedValue(undefined),
    getHistory: vi.fn().mockResolvedValue({
      history: [
        {
          id: 'hist-1',
          jobId: 'job-1',
          startedAt: '2026-02-18T09:00:00Z',
          finishedAt: '2026-02-18T09:00:05Z',
          status: 'success',
          output: 'Report generated',
          createdAt: '2026-02-18T09:00:00Z',
        },
        {
          id: 'hist-2',
          jobId: 'job-1',
          startedAt: '2026-02-17T09:00:00Z',
          finishedAt: '2026-02-17T09:00:10Z',
          status: 'error',
          output: 'Connection timeout',
          createdAt: '2026-02-17T09:00:00Z',
        },
      ],
    }),
  },
}));

import { cronApi } from '../../../src/lib/api';
import { CronTab } from '../../../src/components/settings/CronTab';

describe('CronTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (cronApi.listJobs as ReturnType<typeof vi.fn>).mockResolvedValue({
      jobs: [
        {
          id: 'job-1',
          name: 'Daily Report',
          type: 'ai',
          scheduleType: 'cron',
          scheduleValue: '0 9 * * *',
          config: { prompt: 'Generate daily report', model: 'gpt-4o' },
          enabled: true,
          lastRun: '2026-02-18T09:00:00Z',
          nextRun: '2026-02-19T09:00:00Z',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-02-18T09:00:00Z',
        },
        {
          id: 'job-2',
          name: 'Backup DB',
          type: 'shell',
          scheduleType: 'interval',
          scheduleValue: '6h',
          config: { command: 'pg_dump mydb > backup.sql' },
          enabled: false,
          lastRun: null,
          nextRun: null,
          createdAt: '2026-01-02T00:00:00Z',
          updatedAt: '2026-01-02T00:00:00Z',
        },
      ],
    });
  });

  // === Renders job list ===
  it('should render job list on mount', async () => {
    render(<CronTab />);
    await waitFor(() => {
      expect(screen.getByText('Daily Report')).toBeTruthy();
      expect(screen.getByText('Backup DB')).toBeTruthy();
    });
    expect(cronApi.listJobs).toHaveBeenCalledOnce();
  });

  it('should display type badge for each job', async () => {
    render(<CronTab />);
    await waitFor(() => {
      expect(screen.getByTestId('job-type-job-1').textContent).toBe('AI');
      expect(screen.getByTestId('job-type-job-2').textContent).toBe('Shell');
    });
  });

  it('should display schedule info for each job', async () => {
    render(<CronTab />);
    await waitFor(() => {
      expect(screen.getByTestId('job-schedule-job-1').textContent).toContain('0 9 * * *');
      expect(screen.getByTestId('job-schedule-job-2').textContent).toContain('6h');
    });
  });

  it('should display last run time or Never', async () => {
    render(<CronTab />);
    await waitFor(() => {
      // job-1 has lastRun, should show date string
      expect(screen.getByTestId('job-lastrun-job-1')).toBeTruthy();
      expect(screen.getByTestId('job-lastrun-job-1').textContent).not.toContain('Never');
      // job-2 has lastRun = null, should show "Never"
      expect(screen.getByTestId('job-lastrun-job-2').textContent).toContain('Never');
    });
  });

  it('should show enabled toggle for each job', async () => {
    render(<CronTab />);
    await waitFor(() => {
      const toggle1 = screen.getByTestId('job-toggle-job-1');
      expect(toggle1.getAttribute('aria-checked')).toBe('true');
      const toggle2 = screen.getByTestId('job-toggle-job-2');
      expect(toggle2.getAttribute('aria-checked')).toBe('false');
    });
  });

  // === Empty state ===
  it('should show empty state when no jobs exist', async () => {
    (cronApi.listJobs as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ jobs: [] });
    render(<CronTab />);
    await waitFor(() => {
      expect(screen.getByText(/No cron jobs configured/)).toBeTruthy();
    });
  });

  // === Add Job form ===
  it('should show add job form when Add Job button is clicked', async () => {
    render(<CronTab />);
    await waitFor(() => {
      expect(screen.getByTestId('cron-add-job-button')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('cron-add-job-button'));
    expect(screen.getByTestId('cron-form-name')).toBeTruthy();
    expect(screen.getByTestId('cron-form-type')).toBeTruthy();
    expect(screen.getByTestId('cron-form-schedule-type')).toBeTruthy();
    expect(screen.getByTestId('cron-form-schedule-value')).toBeTruthy();
  });

  it('should show prompt and model fields when AI type is selected', async () => {
    render(<CronTab />);
    await waitFor(() => {
      expect(screen.getByTestId('cron-add-job-button')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('cron-add-job-button'));

    // Default type is 'ai'
    expect(screen.getByTestId('cron-form-prompt')).toBeTruthy();
    expect(screen.getByTestId('cron-form-model')).toBeTruthy();
    expect(screen.queryByTestId('cron-form-command')).toBeNull();
  });

  it('should show command field when Shell type is selected', async () => {
    render(<CronTab />);
    await waitFor(() => {
      expect(screen.getByTestId('cron-add-job-button')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('cron-add-job-button'));

    fireEvent.change(screen.getByTestId('cron-form-type'), {
      target: { value: 'shell' },
    });

    expect(screen.queryByTestId('cron-form-prompt')).toBeNull();
    expect(screen.queryByTestId('cron-form-model')).toBeNull();
    expect(screen.getByTestId('cron-form-command')).toBeTruthy();
  });

  it('should submit create job form to API', async () => {
    render(<CronTab />);
    await waitFor(() => {
      expect(screen.getByTestId('cron-add-job-button')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('cron-add-job-button'));

    fireEvent.change(screen.getByTestId('cron-form-name'), {
      target: { value: 'New Job' },
    });
    fireEvent.change(screen.getByTestId('cron-form-schedule-value'), {
      target: { value: '*/5 * * * *' },
    });
    fireEvent.change(screen.getByTestId('cron-form-prompt'), {
      target: { value: 'Do something' },
    });
    fireEvent.change(screen.getByTestId('cron-form-model'), {
      target: { value: 'gpt-4o' },
    });

    fireEvent.click(screen.getByTestId('cron-form-submit'));

    await waitFor(() => {
      expect(cronApi.createJob).toHaveBeenCalledWith({
        name: 'New Job',
        type: 'ai',
        scheduleType: 'cron',
        scheduleValue: '*/5 * * * *',
        config: { prompt: 'Do something', model: 'gpt-4o' },
        enabled: true,
      });
    });
  });

  it('should hide form and add job to list after successful create', async () => {
    render(<CronTab />);
    await waitFor(() => {
      expect(screen.getByTestId('cron-add-job-button')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('cron-add-job-button'));

    fireEvent.change(screen.getByTestId('cron-form-name'), {
      target: { value: 'New Job' },
    });
    fireEvent.change(screen.getByTestId('cron-form-schedule-value'), {
      target: { value: '*/5 * * * *' },
    });
    fireEvent.change(screen.getByTestId('cron-form-prompt'), {
      target: { value: 'Do something' },
    });

    fireEvent.click(screen.getByTestId('cron-form-submit'));

    await waitFor(() => {
      // Form should be hidden
      expect(screen.queryByTestId('cron-form-name')).toBeNull();
      // New job should appear in list
      expect(screen.getByText('New Job')).toBeTruthy();
    });
  });

  // === Delete job ===
  it('should show confirm delete text when delete is clicked', async () => {
    render(<CronTab />);
    await waitFor(() => {
      expect(screen.getByTestId('job-delete-job-1')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('job-delete-job-1'));

    expect(screen.getByTestId('job-confirm-delete-job-1')).toBeTruthy();
  });

  it('should call deleteJob API and remove from list when confirmed', async () => {
    render(<CronTab />);
    await waitFor(() => {
      expect(screen.getByTestId('job-delete-job-1')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('job-delete-job-1'));
    fireEvent.click(screen.getByTestId('job-confirm-delete-job-1'));

    await waitFor(() => {
      expect(cronApi.deleteJob).toHaveBeenCalledWith('job-1');
      expect(screen.queryByText('Daily Report')).toBeNull();
    });
  });

  // === Trigger job ===
  it('should call triggerJob API when trigger button is clicked', async () => {
    render(<CronTab />);
    await waitFor(() => {
      expect(screen.getByTestId('job-trigger-job-1')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('job-trigger-job-1'));

    await waitFor(() => {
      expect(cronApi.triggerJob).toHaveBeenCalledWith('job-1');
    });
  });

  // === Toggle enabled ===
  it('should call updateJob API when toggle is clicked', async () => {
    render(<CronTab />);
    await waitFor(() => {
      expect(screen.getByTestId('job-toggle-job-1')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('job-toggle-job-1'));

    await waitFor(() => {
      expect(cronApi.updateJob).toHaveBeenCalledWith('job-1', { enabled: false });
    });
  });

  it('should update toggle state after successful API call', async () => {
    render(<CronTab />);
    await waitFor(() => {
      expect(screen.getByTestId('job-toggle-job-1').getAttribute('aria-checked')).toBe('true');
    });

    fireEvent.click(screen.getByTestId('job-toggle-job-1'));

    await waitFor(() => {
      expect(screen.getByTestId('job-toggle-job-1').getAttribute('aria-checked')).toBe('false');
    });
  });

  // === View history ===
  it('should show history when history button is clicked', async () => {
    render(<CronTab />);
    await waitFor(() => {
      expect(screen.getByTestId('job-history-job-1')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('job-history-job-1'));

    await waitFor(() => {
      expect(cronApi.getHistory).toHaveBeenCalledWith('job-1');
      expect(screen.getByText('Success')).toBeTruthy();
      expect(screen.getByText('Error')).toBeTruthy();
    });
  });

  it('should collapse history when clicked again', async () => {
    render(<CronTab />);
    await waitFor(() => {
      expect(screen.getByTestId('job-history-job-1')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('job-history-job-1'));
    await waitFor(() => {
      expect(screen.getByText('Success')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('job-history-job-1'));
    expect(screen.queryByText('Report generated')).toBeNull();
  });

  // === Cancel form ===
  it('should hide form when cancel button is clicked', async () => {
    render(<CronTab />);
    await waitFor(() => {
      expect(screen.getByTestId('cron-add-job-button')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('cron-add-job-button'));
    expect(screen.getByTestId('cron-form-name')).toBeTruthy();

    fireEvent.click(screen.getByTestId('cron-form-cancel'));
    expect(screen.queryByTestId('cron-form-name')).toBeNull();
  });
});
