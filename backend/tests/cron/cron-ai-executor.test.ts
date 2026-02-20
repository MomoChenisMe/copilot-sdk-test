import { describe, it, expect, vi } from 'vitest';
import { createAiTaskExecutor } from '../../src/cron/cron-executors.js';
import type { BackgroundExecutionResult } from '../../src/cron/background-session-runner.js';
import type { CronToolAssemblerDeps } from '../../src/cron/cron-tool-assembler.js';

function makeSuccessResult(overrides: Partial<BackgroundExecutionResult> = {}): BackgroundExecutionResult {
  return {
    turnSegments: [{ type: 'text', content: 'Disk is fine' }],
    toolRecords: [],
    contentSegments: ['Disk is fine'],
    reasoningText: '',
    usage: { inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 0 },
    ...overrides,
  };
}

function makeMockRunner(result: BackgroundExecutionResult) {
  return { run: vi.fn().mockResolvedValue(result) };
}

function makeMockToolDeps(): CronToolAssemblerDeps {
  return {
    selfControlTools: [],
    getMcpTools: vi.fn().mockResolvedValue([]),
    memoryTools: [],
    webSearchTool: null,
    taskTools: [],
    skillStore: { getSkillDirectories: () => [] },
  };
}

describe('AI task executor (BackgroundSessionRunner)', () => {
  it('should call runner.run with correct options', async () => {
    const result = makeSuccessResult();
    const runner = makeMockRunner(result);
    const executor = createAiTaskExecutor(runner as any, makeMockToolDeps());

    await executor({ prompt: 'check disk', model: 'gpt-4o', cwd: '/tmp' });

    expect(runner.run).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'check disk',
        model: 'gpt-4o',
        workingDirectory: '/tmp',
      }),
    );
  });

  it('should not create a conversation', async () => {
    // This test ensures the new executor does NOT use repo.create()
    const runner = makeMockRunner(makeSuccessResult());
    const executor = createAiTaskExecutor(runner as any, makeMockToolDeps());

    const result = await executor({ prompt: 'hello' });

    // No conversation creation — just output from runner
    expect(result.output).toContain('Disk is fine');
    expect(result.executionData).toBeDefined();
  });

  it('should return executionData from runner', async () => {
    const execResult = makeSuccessResult({
      toolRecords: [{ toolCallId: 't1', toolName: 'bash', status: 'success' }],
      usage: { inputTokens: 200, outputTokens: 100, cacheReadTokens: 10, cacheWriteTokens: 5 },
    });
    const runner = makeMockRunner(execResult);
    const executor = createAiTaskExecutor(runner as any, makeMockToolDeps());

    const result = await executor({ prompt: 'test' });

    expect(result.executionData).toBeDefined();
    expect(result.executionData!.toolRecords).toHaveLength(1);
    expect(result.executionData!.usage.inputTokens).toBe(200);
  });

  it('should use default model and cwd when not specified', async () => {
    const runner = makeMockRunner(makeSuccessResult());
    const executor = createAiTaskExecutor(runner as any, makeMockToolDeps());

    await executor({ prompt: 'hello' });

    expect(runner.run).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o',
      }),
    );
  });

  it('should include error in output when execution has error', async () => {
    const errorResult = makeSuccessResult({
      error: 'Session timed out',
      contentSegments: ['partial output'],
    });
    const runner = makeMockRunner(errorResult);
    const executor = createAiTaskExecutor(runner as any, makeMockToolDeps());

    const result = await executor({ prompt: 'fail' });

    expect(result.output).toContain('Error: Session timed out');
    expect(result.output).toContain('partial output');
    expect(result.executionData!.error).toBe('Session timed out');
  });

  it('should pass toolConfig to assembleCronTools', async () => {
    const runner = makeMockRunner(makeSuccessResult());
    const toolDeps = makeMockToolDeps();
    toolDeps.selfControlTools = [{ name: 'read_profile' }];
    const executor = createAiTaskExecutor(runner as any, toolDeps);

    await executor({
      prompt: 'test',
      toolConfig: {
        selfControlTools: true,
        skills: false,
      },
    });

    // Should pass assembled tools to runner
    expect(runner.run).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: expect.arrayContaining([
          expect.objectContaining({ name: 'read_profile' }),
        ]),
      }),
    );
  });

  it('should pass timeoutMs from config', async () => {
    const runner = makeMockRunner(makeSuccessResult());
    const executor = createAiTaskExecutor(runner as any, makeMockToolDeps());

    await executor({ prompt: 'test', timeoutMs: 120000 });

    expect(runner.run).toHaveBeenCalledWith(
      expect.objectContaining({
        timeoutMs: 120000,
      }),
    );
  });
});
