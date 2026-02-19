import { describe, it, expect, beforeEach } from 'vitest';
import { createTaskTools } from '../../src/copilot/tools/task-tools.js';
import type { TaskRepository, Task, CreateTaskInput, UpdateTaskInput } from '../../src/task/repository.js';

// --- Mock TaskRepository ---
function createMockRepo() {
  const store = new Map<string, Task>();
  let counter = 0;

  const repo: TaskRepository = {
    create(input: CreateTaskInput): Task {
      const id = `task-${++counter}`;
      const task: Task = {
        id,
        conversationId: input.conversationId,
        subject: input.subject,
        description: input.description ?? '',
        activeForm: input.activeForm ?? '',
        status: 'pending',
        owner: null,
        blocks: [],
        blockedBy: [],
        metadata: input.metadata ?? {},
        createdAt: '2026-01-01T00:00:00',
        updatedAt: '2026-01-01T00:00:00',
      };
      store.set(id, task);
      return task;
    },
    getById(id: string): Task | null {
      return store.get(id) ?? null;
    },
    listByConversation(conversationId: string): Task[] {
      return [...store.values()].filter(
        (t) => t.conversationId === conversationId && t.status !== 'deleted',
      );
    },
    update(id: string, updates: UpdateTaskInput): Task | null {
      const task = store.get(id);
      if (!task) return null;
      if (updates.status !== undefined) task.status = updates.status;
      if (updates.subject !== undefined) task.subject = updates.subject;
      if (updates.description !== undefined) task.description = updates.description;
      if (updates.activeForm !== undefined) task.activeForm = updates.activeForm;
      if (updates.owner !== undefined) task.owner = updates.owner;
      if (updates.metadata !== undefined) {
        for (const [k, v] of Object.entries(updates.metadata)) {
          if (v === null) delete (task.metadata as any)[k];
          else (task.metadata as any)[k] = v;
        }
      }
      if (updates.addBlocks?.length) {
        task.blocks = [...new Set([...task.blocks, ...updates.addBlocks])];
      }
      if (updates.addBlockedBy?.length) {
        task.blockedBy = [...new Set([...task.blockedBy, ...updates.addBlockedBy])];
      }
      task.updatedAt = '2026-01-01T00:00:01';
      return task;
    },
  } as TaskRepository;

  return { repo, store };
}

describe('createTaskTools', () => {
  let mockRepo: ReturnType<typeof createMockRepo>;
  let sessionMap: Map<string, string>;
  const SESSION_ID = 'session-abc';
  const CONV_ID = 'conv-123';

  const invocation = { sessionId: SESSION_ID, toolCallId: 'tc-1', toolName: '', arguments: {} };

  beforeEach(() => {
    mockRepo = createMockRepo();
    sessionMap = new Map([[SESSION_ID, CONV_ID]]);
  });

  function getTools() {
    return createTaskTools(mockRepo.repo, sessionMap);
  }

  function findTool(name: string) {
    const tool = getTools().find((t) => t.name === name);
    if (!tool) throw new Error(`Tool "${name}" not found`);
    return tool;
  }

  it('should return all four task tools', () => {
    const tools = getTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain('task_create');
    expect(names).toContain('task_list');
    expect(names).toContain('task_get');
    expect(names).toContain('task_update');
  });

  describe('task_create', () => {
    it('should create a task and return it', async () => {
      const tool = findTool('task_create');
      const result = await tool.handler({ subject: 'Fix bug', description: 'Fix the login bug' }, invocation) as any;

      expect(result.task).toBeTruthy();
      expect(result.task.subject).toBe('Fix bug');
      expect(result.task.description).toBe('Fix the login bug');
      expect(result.task.conversationId).toBe(CONV_ID);
      expect(result.task.status).toBe('pending');
    });

    it('should return error when sessionId not in map', async () => {
      const tool = findTool('task_create');
      const badInvocation = { sessionId: 'unknown', toolCallId: 'tc-1', toolName: '', arguments: {} };
      const result = await tool.handler({ subject: 'Test' }, badInvocation) as any;

      expect(result.error).toBeTruthy();
    });

    it('should return error when no invocation is passed', async () => {
      const tool = findTool('task_create');
      const result = await tool.handler({ subject: 'Test' }) as any;

      expect(result.error).toBeTruthy();
    });
  });

  describe('task_list', () => {
    it('should list tasks for the conversation', async () => {
      // Pre-populate some tasks
      mockRepo.repo.create({ conversationId: CONV_ID, subject: 'Task A' });
      mockRepo.repo.create({ conversationId: CONV_ID, subject: 'Task B' });

      const tool = findTool('task_list');
      const result = await tool.handler({}, invocation) as any;

      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0].subject).toBe('Task A');
      expect(result.tasks[1].subject).toBe('Task B');
    });

    it('should return summary fields (id, subject, status, owner, blockedBy)', async () => {
      mockRepo.repo.create({ conversationId: CONV_ID, subject: 'Summary test' });

      const tool = findTool('task_list');
      const result = await tool.handler({}, invocation) as any;

      const summary = result.tasks[0];
      expect(summary).toHaveProperty('id');
      expect(summary).toHaveProperty('subject');
      expect(summary).toHaveProperty('status');
      expect(summary).toHaveProperty('owner');
      expect(summary).toHaveProperty('blockedBy');
      // Should NOT include full fields like description, metadata
      expect(summary).not.toHaveProperty('description');
      expect(summary).not.toHaveProperty('metadata');
    });

    it('should return error when sessionId not in map', async () => {
      const tool = findTool('task_list');
      const badInvocation = { sessionId: 'unknown', toolCallId: 'tc-1', toolName: '', arguments: {} };
      const result = await tool.handler({}, badInvocation) as any;

      expect(result.error).toBeTruthy();
    });
  });

  describe('task_get', () => {
    it('should return full task details', async () => {
      const created = mockRepo.repo.create({ conversationId: CONV_ID, subject: 'Get me' });

      const tool = findTool('task_get');
      const result = await tool.handler({ taskId: created.id }) as any;

      expect(result.task).toBeTruthy();
      expect(result.task.id).toBe(created.id);
      expect(result.task.subject).toBe('Get me');
    });

    it('should return error for nonexistent task', async () => {
      const tool = findTool('task_get');
      const result = await tool.handler({ taskId: 'nonexistent' }) as any;

      expect(result.error).toBeTruthy();
      expect(result.error).toContain('not found');
    });
  });

  describe('task_update', () => {
    it('should update task status and return it', async () => {
      const created = mockRepo.repo.create({ conversationId: CONV_ID, subject: 'Update me' });

      const tool = findTool('task_update');
      const result = await tool.handler({ taskId: created.id, status: 'completed' }) as any;

      expect(result.task).toBeTruthy();
      expect(result.task.status).toBe('completed');
    });

    it('should return error for nonexistent task', async () => {
      const tool = findTool('task_update');
      const result = await tool.handler({ taskId: 'nonexistent', status: 'completed' }) as any;

      expect(result.error).toBeTruthy();
      expect(result.error).toContain('not found');
    });
  });
});
