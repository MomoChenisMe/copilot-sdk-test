import type { Tool } from '@anthropic-ai/sdk';
import type { CronStore } from '../../cron/cron-store.js';
import type { CronScheduler } from '../../cron/cron-scheduler.js';

export function createCronTools(cronStore: CronStore, cronScheduler: CronScheduler): Tool[] {
  const manageCronJobs: Tool = {
    name: 'manage_cron_jobs',
    description: 'Manage scheduled cron jobs. Actions: list (list all jobs), get (get a job by id), create (create a new job), update (update an existing job), delete (delete a job), trigger (execute a job immediately).',
    parameters: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string' as const,
          description: 'The action to perform: list, get, create, update, delete, trigger',
          enum: ['list', 'get', 'create', 'update', 'delete', 'trigger'],
        },
        id: {
          type: 'string' as const,
          description: 'The job ID (required for get, update, delete, trigger)',
        },
        name: {
          type: 'string' as const,
          description: 'Job name (required for create)',
        },
        type: {
          type: 'string' as const,
          description: 'Job type: ai or shell (required for create)',
          enum: ['ai', 'shell'],
        },
        scheduleType: {
          type: 'string' as const,
          description: 'Schedule type: cron, interval, or once (required for create)',
          enum: ['cron', 'interval', 'once'],
        },
        scheduleValue: {
          type: 'string' as const,
          description: 'Schedule value: cron expression (e.g. "0 0 * * *"), interval in ms, or ISO timestamp for once',
        },
        config: {
          type: 'object' as const,
          description: 'Job configuration: { prompt, model, command, cwd, timeout }',
        },
        enabled: {
          type: 'boolean' as const,
          description: 'Whether the job is enabled (for create/update)',
        },
      },
      required: ['action'],
      additionalProperties: false,
    },
    handler: async (args: Record<string, unknown>) => {
      const action = args.action as string;

      switch (action) {
        case 'list': {
          const jobs = cronStore.listAll();
          return { jobs: jobs.map(summarizeJob) };
        }

        case 'get': {
          if (!args.id) return { error: 'id is required for get action' };
          const job = cronStore.getById(args.id as string);
          if (!job) return { error: `Job not found: ${args.id}` };
          return { job: summarizeJob(job) };
        }

        case 'create': {
          if (!args.name) return { error: 'name is required for create action' };
          if (!args.type) return { error: 'type is required for create action' };
          if (!args.scheduleType) return { error: 'scheduleType is required for create action' };
          if (!args.scheduleValue) return { error: 'scheduleValue is required for create action' };

          const job = cronStore.create({
            name: args.name as string,
            type: args.type as 'ai' | 'shell',
            scheduleType: args.scheduleType as 'cron' | 'interval' | 'once',
            scheduleValue: args.scheduleValue as string,
            config: (args.config as Record<string, unknown>) ?? {},
            enabled: args.enabled !== false,
          });

          if (job.enabled) {
            cronScheduler.registerJob(job);
          }

          return { ok: true, job: summarizeJob(job) };
        }

        case 'update': {
          if (!args.id) return { error: 'id is required for update action' };
          const updates: Record<string, unknown> = {};
          if (args.name !== undefined) updates.name = args.name;
          if (args.type !== undefined) updates.type = args.type;
          if (args.scheduleType !== undefined) updates.scheduleType = args.scheduleType;
          if (args.scheduleValue !== undefined) updates.scheduleValue = args.scheduleValue;
          if (args.config !== undefined) updates.config = args.config;
          if (args.enabled !== undefined) updates.enabled = args.enabled;

          const updated = cronStore.update(args.id as string, updates);
          if (!updated) return { error: `Job not found: ${args.id}` };

          // Re-register to apply schedule changes
          cronScheduler.unregisterJob(updated.id);
          if (updated.enabled) {
            cronScheduler.registerJob(updated);
          }

          return { ok: true, job: summarizeJob(updated) };
        }

        case 'delete': {
          if (!args.id) return { error: 'id is required for delete action' };
          cronScheduler.unregisterJob(args.id as string);
          const deleted = cronStore.delete(args.id as string);
          if (!deleted) return { error: `Job not found: ${args.id}` };
          return { ok: true };
        }

        case 'trigger': {
          if (!args.id) return { error: 'id is required for trigger action' };
          const triggerJob = cronStore.getById(args.id as string);
          if (!triggerJob) return { error: `Job not found: ${args.id}` };
          cronScheduler.triggerJob(args.id as string).catch(() => {});
          return { ok: true, message: `Job "${triggerJob.name}" triggered` };
        }

        default:
          return { error: `Unknown action: ${action}` };
      }
    },
  } as unknown as Tool;

  return [manageCronJobs];
}

function summarizeJob(job: { id: string; name: string; type: string; scheduleType: string; scheduleValue: string; enabled: boolean; lastRun: string | null; nextRun: string | null; config: Record<string, unknown> }) {
  return {
    id: job.id,
    name: job.name,
    type: job.type,
    scheduleType: job.scheduleType,
    scheduleValue: job.scheduleValue,
    enabled: job.enabled,
    lastRun: job.lastRun,
    nextRun: job.nextRun,
    config: job.config,
  };
}
