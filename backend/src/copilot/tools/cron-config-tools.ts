import type { Tool } from '@github/copilot-sdk';
import type { ConversationRepository } from '../../conversation/repository.js';

export interface CronConfigToolsDeps {
  repo: ConversationRepository;
  sessionConversationMap: Map<string, string>;
  onCronUpdated: (conversationId: string, enabled: boolean) => void;
}

export function createCronConfigTools(deps: CronConfigToolsDeps): Tool[] {
  const { repo, sessionConversationMap, onCronUpdated } = deps;

  function getConversationId(invocation?: any): string | null {
    if (!invocation?.sessionId) return null;
    return sessionConversationMap.get(invocation.sessionId) ?? null;
  }

  const configureCron: Tool = {
    name: 'configure_cron',
    description:
      'Configure a scheduled cron job for the current conversation. ' +
      'When enabled, the system will automatically send the specified prompt at the scheduled interval and generate an AI response. ' +
      'Use scheduleType "cron" with a cron expression (e.g. "*/5 * * * *" for every 5 minutes) ' +
      'or scheduleType "interval" with milliseconds (e.g. 300000 for 5 minutes).',
    parameters: {
      type: 'object',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Whether the cron schedule is enabled',
        },
        scheduleType: {
          type: 'string',
          enum: ['cron', 'interval'],
          description: 'Schedule type: "cron" for cron expressions, "interval" for millisecond intervals',
        },
        scheduleValue: {
          type: 'string',
          description: 'The schedule value. For cron: a cron expression (e.g. "*/5 * * * *"). For interval: milliseconds as string (e.g. "300000")',
        },
        prompt: {
          type: 'string',
          description: 'The message prompt to send on each trigger',
        },
        model: {
          type: 'string',
          description: 'Optional model ID to use for cron responses. If omitted, uses the conversation model.',
        },
      },
      required: ['enabled'],
      additionalProperties: false,
    },
    handler: async (args: any, invocation?: any) => {
      const conversationId = getConversationId(invocation);
      if (!conversationId) return { error: 'Cannot determine conversation context.' };

      const conv = repo.getById(conversationId);
      if (!conv) return { error: 'Conversation not found.' };

      const updated = repo.update(conversationId, {
        cronEnabled: args.enabled,
        cronScheduleType: args.scheduleType ?? null,
        cronScheduleValue: args.scheduleValue ?? null,
        cronPrompt: args.prompt ?? null,
        cronModel: args.model ?? null,
      });

      if (!updated) return { error: 'Failed to update cron configuration.' };

      onCronUpdated(conversationId, args.enabled);

      return {
        ok: true,
        cronEnabled: updated.cronEnabled,
        cronScheduleType: updated.cronScheduleType,
        cronScheduleValue: updated.cronScheduleValue,
        cronPrompt: updated.cronPrompt,
        cronModel: updated.cronModel,
      };
    },
  };

  const getCronConfig: Tool = {
    name: 'get_cron_config',
    description: 'Get the current cron configuration for this conversation.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    handler: async (_args: any, invocation?: any) => {
      const conversationId = getConversationId(invocation);
      if (!conversationId) return { error: 'Cannot determine conversation context.' };

      const conv = repo.getById(conversationId);
      if (!conv) return { error: 'Conversation not found.' };

      return {
        cronEnabled: conv.cronEnabled,
        cronScheduleType: conv.cronScheduleType,
        cronScheduleValue: conv.cronScheduleValue,
        cronPrompt: conv.cronPrompt,
        cronModel: conv.cronModel,
      };
    },
  };

  return [configureCron, getCronConfig];
}
