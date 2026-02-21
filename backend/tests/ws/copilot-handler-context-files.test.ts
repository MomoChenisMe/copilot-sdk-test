import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createCopilotHandler } from '../../src/ws/handlers/copilot.js';

// Create a temp directory for test files
const testDir = join(tmpdir(), `copilot-handler-test-${Date.now()}`);

// Mock StreamManager
function createMockStreamManager() {
  return {
    startStream: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockReturnValue(() => {}),
    abortStream: vi.fn(),
    getActiveStreamIds: vi.fn().mockReturnValue([]),
    getFullState: vi.fn().mockReturnValue({ activeStreams: [], pendingUserInputs: [] }),
    handleUserInputResponse: vi.fn(),
    setMode: vi.fn(),
  } as any;
}

// Mock ConversationRepository
function createMockRepo() {
  return {
    getById: vi.fn().mockReturnValue({
      id: 'conv-1',
      title: 'Test',
      sdkSessionId: null,
      model: 'gpt-5',
      cwd: '/tmp',
      pinned: false,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    }),
    update: vi.fn(),
    addMessage: vi.fn(),
  } as any;
}

describe('copilot handler contextFiles', () => {
  let mockStreamManager: ReturnType<typeof createMockStreamManager>;
  let mockRepo: ReturnType<typeof createMockRepo>;
  let send: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    mockStreamManager = createMockStreamManager();
    mockRepo = createMockRepo();
    send = vi.fn();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should read contextFiles and prepend content to prompt', async () => {
    const filePath = join(testDir, 'hello.ts');
    writeFileSync(filePath, 'console.log("hello");');

    const handler = createCopilotHandler(mockStreamManager, mockRepo);
    handler.onMessage(
      {
        type: 'copilot:send',
        data: {
          conversationId: 'conv-1',
          prompt: 'Explain this code',
          contextFiles: [filePath],
        },
      },
      send,
    );

    // Wait for async handler
    await vi.waitFor(() => {
      expect(mockStreamManager.startStream).toHaveBeenCalledTimes(1);
    });

    const callArgs = mockStreamManager.startStream.mock.calls[0];
    expect(callArgs[1].prompt).toContain(`[File: ${filePath}]`);
    expect(callArgs[1].prompt).toContain('console.log("hello");');
    expect(callArgs[1].prompt).toContain('Explain this code');
  });

  it('should skip files that do not exist', async () => {
    const handler = createCopilotHandler(mockStreamManager, mockRepo);
    handler.onMessage(
      {
        type: 'copilot:send',
        data: {
          conversationId: 'conv-1',
          prompt: 'Hello',
          contextFiles: ['/nonexistent/path/foo.ts'],
        },
      },
      send,
    );

    await vi.waitFor(() => {
      expect(mockStreamManager.startStream).toHaveBeenCalledTimes(1);
    });

    const callArgs = mockStreamManager.startStream.mock.calls[0];
    // Prompt should just be "Hello" without any file context
    expect(callArgs[1].prompt).toBe('Hello');
  });

  it('should skip files larger than 500KB', async () => {
    const filePath = join(testDir, 'large.txt');
    // 600KB file
    writeFileSync(filePath, 'x'.repeat(600 * 1024));

    const handler = createCopilotHandler(mockStreamManager, mockRepo);
    handler.onMessage(
      {
        type: 'copilot:send',
        data: {
          conversationId: 'conv-1',
          prompt: 'Check this',
          contextFiles: [filePath],
        },
      },
      send,
    );

    await vi.waitFor(() => {
      expect(mockStreamManager.startStream).toHaveBeenCalledTimes(1);
    });

    const callArgs = mockStreamManager.startStream.mock.calls[0];
    const prompt = callArgs[1].prompt as string;
    expect(prompt).toContain(`[File: ${filePath}] (File too large)`);
    expect(prompt).toContain('Check this');
  });

  it('should read multiple contextFiles in order', async () => {
    const file1 = join(testDir, 'a.ts');
    const file2 = join(testDir, 'b.ts');
    writeFileSync(file1, 'const a = 1;');
    writeFileSync(file2, 'const b = 2;');

    const handler = createCopilotHandler(mockStreamManager, mockRepo);
    handler.onMessage(
      {
        type: 'copilot:send',
        data: {
          conversationId: 'conv-1',
          prompt: 'Review',
          contextFiles: [file1, file2],
        },
      },
      send,
    );

    await vi.waitFor(() => {
      expect(mockStreamManager.startStream).toHaveBeenCalledTimes(1);
    });

    const callArgs = mockStreamManager.startStream.mock.calls[0];
    const prompt = callArgs[1].prompt as string;
    expect(prompt).toContain(`[File: ${file1}]`);
    expect(prompt).toContain('const a = 1;');
    expect(prompt).toContain(`[File: ${file2}]`);
    expect(prompt).toContain('const b = 2;');
    // Files should appear before the user prompt
    const fileIdx = prompt.indexOf('[File:');
    const promptIdx = prompt.indexOf('Review');
    expect(fileIdx).toBeLessThan(promptIdx);
  });

  it('should store contextFiles in user message metadata', async () => {
    const filePath = join(testDir, 'meta.ts');
    writeFileSync(filePath, 'export default {};');

    const handler = createCopilotHandler(mockStreamManager, mockRepo);
    handler.onMessage(
      {
        type: 'copilot:send',
        data: {
          conversationId: 'conv-1',
          prompt: 'Info',
          contextFiles: [filePath],
        },
      },
      send,
    );

    await vi.waitFor(() => {
      expect(mockRepo.addMessage).toHaveBeenCalledTimes(1);
    });

    const savedMessage = mockRepo.addMessage.mock.calls[0][1];
    expect(savedMessage.metadata).toBeTruthy();
    expect(savedMessage.metadata.contextFiles).toEqual([filePath]);
  });

  it('should work when no contextFiles are provided (backward compatible)', async () => {
    const handler = createCopilotHandler(mockStreamManager, mockRepo);
    handler.onMessage(
      {
        type: 'copilot:send',
        data: {
          conversationId: 'conv-1',
          prompt: 'Just text',
        },
      },
      send,
    );

    await vi.waitFor(() => {
      expect(mockStreamManager.startStream).toHaveBeenCalledTimes(1);
    });

    const callArgs = mockStreamManager.startStream.mock.calls[0];
    expect(callArgs[1].prompt).toBe('Just text');
  });
});
