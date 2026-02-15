import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageBlock } from '../../../src/components/copilot/MessageBlock';
import type { Message } from '../../../src/lib/api';

// Mock Markdown component
vi.mock('../../../src/components/shared/Markdown', () => ({
  Markdown: ({ content }: { content: string }) => (
    <div data-testid="markdown">{content}</div>
  ),
}));

// Mock lucide-react Sparkles icon
vi.mock('lucide-react', () => ({
  Sparkles: (props: any) => <svg data-testid="sparkles-icon" {...props} />,
}));

// Mock ToolRecord component
vi.mock('../../../src/components/copilot/ToolRecord', () => ({
  ToolRecord: ({ record }: { record: { toolCallId: string; toolName: string } }) => (
    <div data-testid={`tool-record-${record.toolCallId}`}>
      {record.toolName}
    </div>
  ),
}));

// Mock ReasoningBlock component
vi.mock('../../../src/components/copilot/ReasoningBlock', () => ({
  ReasoningBlock: ({ text, isStreaming }: { text: string; isStreaming: boolean }) => (
    <div data-testid="reasoning-block" data-streaming={isStreaming}>
      {text}
    </div>
  ),
}));

// Mock ToolResultBlock component
vi.mock('../../../src/components/copilot/ToolResultBlock', () => ({
  ToolResultBlock: ({ result, toolName, status }: { result: unknown; toolName: string; status?: string }) => (
    <div data-testid={`tool-result-${toolName}`} data-status={status}>{String(result)}</div>
  ),
}));

const makeMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'msg-1',
  conversationId: 'conv-1',
  role: 'user',
  content: 'Hello world',
  metadata: null,
  createdAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

describe('MessageBlock', () => {
  // User message tests
  it('renders user message with right-aligned styling', () => {
    const { container } = render(<MessageBlock message={makeMessage({ role: 'user' })} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('justify-end');
  });

  it('renders user message as plain text (not Markdown)', () => {
    render(<MessageBlock message={makeMessage({ role: 'user', content: 'Plain text' })} />);
    expect(screen.getByText('Plain text')).toBeTruthy();
    expect(screen.queryByTestId('markdown')).toBeNull();
  });

  it('renders user message with user-msg-bg background', () => {
    const { container } = render(<MessageBlock message={makeMessage({ role: 'user' })} />);
    const bubble = container.querySelector('[data-testid="user-bubble"]');
    expect(bubble).toBeTruthy();
    expect(bubble?.className).toContain('bg-user-msg-bg');
    expect(bubble?.className).toContain('border-user-msg-border');
  });

  it('renders user message with rounded-2xl rounded-br-sm', () => {
    const { container } = render(<MessageBlock message={makeMessage({ role: 'user' })} />);
    const bubble = container.querySelector('[data-testid="user-bubble"]');
    expect(bubble?.className).toContain('rounded-2xl');
    expect(bubble?.className).toContain('rounded-br-sm');
  });

  it('renders user message with max-w-[85%]', () => {
    const { container } = render(<MessageBlock message={makeMessage({ role: 'user' })} />);
    const bubble = container.querySelector('[data-testid="user-bubble"]');
    expect(bubble?.className).toContain('max-w-[85%]');
  });

  // Assistant message tests
  it('renders assistant message left-aligned', () => {
    const { container } = render(
      <MessageBlock message={makeMessage({ role: 'assistant', content: '# Hello' })} />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).not.toContain('justify-end');
  });

  it('renders assistant message with Markdown', () => {
    render(
      <MessageBlock message={makeMessage({ role: 'assistant', content: '# Title' })} />
    );
    expect(screen.getByTestId('markdown')).toBeTruthy();
  });

  it('renders assistant label for assistant messages', () => {
    render(
      <MessageBlock message={makeMessage({ role: 'assistant', content: 'Hi' })} />
    );
    expect(screen.getByText('Assistant')).toBeTruthy();
  });

  it('renders Sparkles icon as avatar for assistant messages', () => {
    render(
      <MessageBlock message={makeMessage({ role: 'assistant', content: 'Hi' })} />
    );
    expect(screen.getByTestId('sparkles-icon')).toBeTruthy();
  });

  it('renders assistant message with avatar + content layout (flex items-start gap-3)', () => {
    const { container } = render(
      <MessageBlock message={makeMessage({ role: 'assistant', content: 'Hi' })} />
    );
    const layout = container.querySelector('.flex.items-start.gap-3');
    expect(layout).toBeTruthy();
  });

  it('renders avatar with bg-accent-soft rounded-lg', () => {
    const { container } = render(
      <MessageBlock message={makeMessage({ role: 'assistant', content: 'Hi' })} />
    );
    const avatar = container.querySelector('.bg-accent-soft.rounded-lg');
    expect(avatar).toBeTruthy();
  });

  it('does not render Sparkles icon or label for user messages', () => {
    render(<MessageBlock message={makeMessage({ role: 'user' })} />);
    expect(screen.queryByText('Assistant')).toBeNull();
    expect(screen.queryByTestId('sparkles-icon')).toBeNull();
  });

  // --- Metadata rendering tests (Task 5.1-5.4) ---

  it('renders ToolRecord components when metadata.toolRecords exists', () => {
    render(
      <MessageBlock
        message={makeMessage({
          role: 'assistant',
          content: 'Done!',
          metadata: {
            toolRecords: [
              { toolCallId: 'tc1', toolName: 'bash', status: 'success', result: { content: 'ok' } },
              { toolCallId: 'tc2', toolName: 'create', status: 'error', error: 'failed' },
            ],
          },
        })}
      />
    );

    expect(screen.getByTestId('tool-record-tc1')).toBeTruthy();
    expect(screen.getByTestId('tool-record-tc2')).toBeTruthy();
    expect(screen.getByText('bash')).toBeTruthy();
    expect(screen.getByText('create')).toBeTruthy();
  });

  it('renders ReasoningBlock when metadata.reasoning exists', () => {
    render(
      <MessageBlock
        message={makeMessage({
          role: 'assistant',
          content: 'Result',
          metadata: {
            reasoning: 'Thinking about the problem...',
          },
        })}
      />
    );

    const reasoning = screen.getByTestId('reasoning-block');
    expect(reasoning).toBeTruthy();
    expect(reasoning.textContent).toContain('Thinking about the problem...');
    // Should NOT be streaming for historical messages
    expect(reasoning.getAttribute('data-streaming')).toBe('false');
  });

  it('does NOT render ToolRecord or ReasoningBlock when metadata is null', () => {
    render(
      <MessageBlock
        message={makeMessage({
          role: 'assistant',
          content: 'Simple reply',
          metadata: null,
        })}
      />
    );

    expect(screen.queryByTestId('reasoning-block')).toBeNull();
    expect(screen.queryByTestId(/^tool-record-/)).toBeNull();
  });

  it('renders tool records even when content is empty but metadata exists', () => {
    render(
      <MessageBlock
        message={makeMessage({
          role: 'assistant',
          content: '',
          metadata: {
            toolRecords: [
              { toolCallId: 'tc1', toolName: 'report_intent', status: 'success' },
            ],
          },
        })}
      />
    );

    expect(screen.getByTestId('tool-record-tc1')).toBeTruthy();
  });

  // --- turnSegments rendering (Phase 6) ---

  it('renders turnSegments in order when present in metadata', () => {
    render(
      <MessageBlock
        message={makeMessage({
          role: 'assistant',
          content: 'Final text',
          metadata: {
            turnSegments: [
              { type: 'text', content: 'First part' },
              { type: 'tool', toolCallId: 'tc1', toolName: 'bash', status: 'success', result: 'hi' },
              { type: 'text', content: 'Second part' },
            ],
            toolRecords: [
              { toolCallId: 'tc1', toolName: 'bash', status: 'success', result: 'hi' },
            ],
          },
        })}
      />
    );

    // Should render text segments as markdown
    const markdowns = screen.getAllByTestId('markdown');
    expect(markdowns.length).toBeGreaterThanOrEqual(2);
    expect(markdowns[0].textContent).toBe('First part');
    expect(markdowns[1].textContent).toBe('Second part');

    // Should render tool record
    expect(screen.getByTestId('tool-record-tc1')).toBeTruthy();
  });

  it('renders reasoning turnSegment as ReasoningBlock', () => {
    render(
      <MessageBlock
        message={makeMessage({
          role: 'assistant',
          content: 'Answer',
          metadata: {
            turnSegments: [
              { type: 'reasoning', content: 'Let me think...' },
              { type: 'text', content: 'Answer' },
            ],
          },
        })}
      />
    );

    expect(screen.getByTestId('reasoning-block')).toBeTruthy();
    expect(screen.getByTestId('reasoning-block').textContent).toContain('Let me think...');
  });

  it('falls back to old rendering when turnSegments is absent', () => {
    render(
      <MessageBlock
        message={makeMessage({
          role: 'assistant',
          content: 'Old message',
          metadata: {
            toolRecords: [
              { toolCallId: 'tc1', toolName: 'read_file', status: 'success' },
            ],
            reasoning: 'Old reasoning',
          },
        })}
      />
    );

    // Old rendering order: reasoning → tools → text
    expect(screen.getByTestId('reasoning-block')).toBeTruthy();
    expect(screen.getByTestId('tool-record-tc1')).toBeTruthy();
    expect(screen.getByTestId('markdown')).toBeTruthy();
  });

  it('renders only text when metadata is null', () => {
    render(
      <MessageBlock
        message={makeMessage({
          role: 'assistant',
          content: 'Just text',
          metadata: null,
        })}
      />
    );

    expect(screen.getByTestId('markdown')).toBeTruthy();
    expect(screen.getByTestId('markdown').textContent).toBe('Just text');
    expect(screen.queryByTestId('reasoning-block')).toBeNull();
  });

  it('renders in correct order: Reasoning → Tool Records → Text Content (fallback)', () => {
    const { container } = render(
      <MessageBlock
        message={makeMessage({
          role: 'assistant',
          content: 'Final text',
          metadata: {
            toolRecords: [
              { toolCallId: 'tc1', toolName: 'bash', status: 'success' },
            ],
            reasoning: 'Thinking...',
          },
        })}
      />
    );

    // Get the content area (flex-1 min-w-0)
    const contentArea = container.querySelector('.flex-1.min-w-0');
    expect(contentArea).toBeTruthy();

    const children = Array.from(contentArea!.children);
    // Find the indices of reasoning, tool record, and markdown
    const reasoningIdx = children.findIndex(
      (el) => el.querySelector('[data-testid="reasoning-block"]') || el.getAttribute('data-testid') === 'reasoning-block'
    );
    const toolIdx = children.findIndex(
      (el) => el.querySelector('[data-testid="tool-record-tc1"]') || el.getAttribute('data-testid') === 'tool-record-tc1'
    );
    const markdownIdx = children.findIndex(
      (el) => el.querySelector('[data-testid="markdown"]') || el.getAttribute('data-testid') === 'markdown'
    );

    // Reasoning should appear before tools, tools before text
    expect(reasoningIdx).toBeGreaterThanOrEqual(0);
    expect(toolIdx).toBeGreaterThan(reasoningIdx);
    expect(markdownIdx).toBeGreaterThan(toolIdx);
  });

  // --- ToolResultBlock inline rendering for bash-like tools ---

  it('renders ToolResultBlock after bash tool segment with result', () => {
    render(
      <MessageBlock
        message={makeMessage({
          role: 'assistant',
          content: 'Done',
          metadata: {
            turnSegments: [
              { type: 'tool', toolCallId: 'tc1', toolName: 'bash', status: 'success', result: 'output here' },
              { type: 'text', content: 'Done' },
            ],
          },
        })}
      />
    );

    expect(screen.getByTestId('tool-record-tc1')).toBeTruthy();
    expect(screen.getByTestId('tool-result-bash')).toBeTruthy();
    expect(screen.getByTestId('tool-result-bash').textContent).toContain('output here');
  });

  it('does NOT render ToolResultBlock for non-inline tools', () => {
    render(
      <MessageBlock
        message={makeMessage({
          role: 'assistant',
          content: 'Done',
          metadata: {
            turnSegments: [
              { type: 'tool', toolCallId: 'tc1', toolName: 'create', status: 'success', result: 'created file' },
              { type: 'text', content: 'Done' },
            ],
          },
        })}
      />
    );

    expect(screen.getByTestId('tool-record-tc1')).toBeTruthy();
    expect(screen.queryByTestId('tool-result-create')).toBeNull();
  });

  it('does NOT render ToolResultBlock for running bash tool (no result yet)', () => {
    render(
      <MessageBlock
        message={makeMessage({
          role: 'assistant',
          content: '',
          metadata: {
            turnSegments: [
              { type: 'tool', toolCallId: 'tc1', toolName: 'bash', status: 'running' },
            ],
          },
        })}
      />
    );

    expect(screen.getByTestId('tool-record-tc1')).toBeTruthy();
    expect(screen.queryByTestId('tool-result-bash')).toBeNull();
  });

  // --- Legacy reasoning fallback in turnSegments path (Task 5.1-5.2) ---

  it('renders reasoning from metadata.reasoning when turnSegments has no reasoning entry', () => {
    render(
      <MessageBlock
        message={makeMessage({
          role: 'assistant',
          content: 'Legacy text',
          metadata: {
            reasoning: 'Legacy thinking process...',
            turnSegments: [
              { type: 'tool', toolCallId: 'tc1', toolName: 'bash', status: 'success', result: 'ok' },
              { type: 'text', content: 'Legacy text' },
            ],
            toolRecords: [
              { toolCallId: 'tc1', toolName: 'bash', status: 'success', result: 'ok' },
            ],
          },
        })}
      />
    );

    // Should render ReasoningBlock from metadata.reasoning fallback
    const reasoning = screen.getByTestId('reasoning-block');
    expect(reasoning).toBeTruthy();
    expect(reasoning.textContent).toContain('Legacy thinking process...');
    expect(reasoning.getAttribute('data-streaming')).toBe('false');
  });

  it('does not double-render reasoning when both turnSegments and metadata.reasoning have it', () => {
    render(
      <MessageBlock
        message={makeMessage({
          role: 'assistant',
          content: 'Answer',
          metadata: {
            reasoning: 'Thinking about it...',
            turnSegments: [
              { type: 'reasoning', content: 'Thinking about it...' },
              { type: 'text', content: 'Answer' },
            ],
          },
        })}
      />
    );

    // Should render exactly ONE reasoning block, not two
    const reasoningBlocks = screen.getAllByTestId('reasoning-block');
    expect(reasoningBlocks).toHaveLength(1);
  });

  // WARNING FIX: bash tool with error status should also show ToolResultBlock
  it('renders ToolResultBlock for bash tool with error status and error field', () => {
    render(
      <MessageBlock
        message={makeMessage({
          role: 'assistant',
          content: '',
          metadata: {
            turnSegments: [
              { type: 'tool', toolCallId: 'tc1', toolName: 'bash', status: 'error', error: 'command not found' },
            ],
          },
        })}
      />
    );

    expect(screen.getByTestId('tool-record-tc1')).toBeTruthy();
    expect(screen.getByTestId('tool-result-bash')).toBeTruthy();
  });
});
