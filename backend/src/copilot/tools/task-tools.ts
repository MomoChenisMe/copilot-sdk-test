import type { Tool } from '@github/copilot-sdk';
import type { TaskRepository } from '../../task/repository.js';

export function createTaskTools(
  taskRepo: TaskRepository,
  sessionConversationMap: Map<string, string>,
): Tool[] {
  function getConversationId(invocation?: any): string | null {
    if (!invocation?.sessionId) return null;
    return sessionConversationMap.get(invocation.sessionId) ?? null;
  }

  const taskCreate: Tool = {
    name: 'task_create',
    description: 'Create a new task to track progress on multi-step work. Tasks are scoped to the current conversation.',
    parameters: {
      type: 'object',
      properties: {
        subject: { type: 'string', description: 'Brief title for the task (imperative form)' },
        description: { type: 'string', description: 'Detailed description of what needs to be done' },
        activeForm: { type: 'string', description: 'Present continuous form shown when in progress (e.g. "Running tests")' },
        metadata: { type: 'object', description: 'Arbitrary metadata to attach to the task' },
      },
      required: ['subject'],
      additionalProperties: false,
    },
    handler: async (args: any, invocation?: any) => {
      const conversationId = getConversationId(invocation);
      if (!conversationId) return { error: 'Cannot determine conversation context.' };
      const task = taskRepo.create({
        conversationId,
        subject: args.subject,
        description: args.description,
        activeForm: args.activeForm,
        metadata: args.metadata,
      });
      return { task };
    },
  };

  const taskList: Tool = {
    name: 'task_list',
    description: 'List all tasks in the current conversation.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    handler: async (_args: any, invocation?: any) => {
      const conversationId = getConversationId(invocation);
      if (!conversationId) return { error: 'Cannot determine conversation context.' };
      const tasks = taskRepo.listByConversation(conversationId);
      return {
        tasks: tasks.map((t) => ({
          id: t.id,
          subject: t.subject,
          status: t.status,
          owner: t.owner,
          blockedBy: t.blockedBy.filter((bid) => {
            const blocker = tasks.find((tt) => tt.id === bid);
            return blocker && blocker.status !== 'completed';
          }),
        })),
      };
    },
  };

  const taskGet: Tool = {
    name: 'task_get',
    description: 'Get full details of a specific task by ID.',
    parameters: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'The ID of the task to retrieve' },
      },
      required: ['taskId'],
      additionalProperties: false,
    },
    handler: async (args: any) => {
      const task = taskRepo.getById(args.taskId);
      if (!task) return { error: `Task "${args.taskId}" not found.` };
      return { task };
    },
  };

  const taskUpdate: Tool = {
    name: 'task_update',
    description: 'Update a task (status, subject, description, activeForm, owner, metadata, blocks, blockedBy).',
    parameters: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'The ID of the task to update' },
        status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'deleted'] },
        subject: { type: 'string' },
        description: { type: 'string' },
        activeForm: { type: 'string' },
        owner: { type: 'string' },
        metadata: { type: 'object' },
        addBlocks: { type: 'array', items: { type: 'string' } },
        addBlockedBy: { type: 'array', items: { type: 'string' } },
      },
      required: ['taskId'],
      additionalProperties: false,
    },
    handler: async (args: any) => {
      const { taskId, ...updates } = args;
      const task = taskRepo.update(taskId, updates);
      if (!task) return { error: `Task "${taskId}" not found.` };
      return { task };
    },
  };

  return [taskCreate, taskList, taskGet, taskUpdate];
}
