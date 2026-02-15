import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useAppStore } from '../../../src/store/index';

// Mock child components
vi.mock('../../../src/components/copilot/MessageBlock', () => ({
  MessageBlock: ({ message }: { message: { id: string; role: string; content: string } }) => (
    <div data-testid={`message-${message.id}`}>{message.content}</div>
  ),
}));

vi.mock('../../../src/components/copilot/StreamingText', () => ({
  StreamingText: ({ text }: { text: string }) => (
    <div data-testid="streaming-text">{text}</div>
  ),
}));

vi.mock('../../../src/components/copilot/ToolRecord', () => ({
  ToolRecord: ({ record }: { record: { toolCallId: string; toolName: string } }) => (
    <div data-testid={`tool-${record.toolCallId}`}>{record.toolName}</div>
  ),
}));

vi.mock('../../../src/components/copilot/ReasoningBlock', () => ({
  ReasoningBlock: ({ text }: { text: string }) => (
    text ? <div data-testid="reasoning">{text}</div> : null
  ),
}));

vi.mock('../../../src/components/copilot/ToolResultBlock', () => ({
  ToolResultBlock: ({ result, toolName, status }: { result: unknown; toolName: string; status?: string }) => (
    result != null ? <div data-testid={`tool-result-${toolName}`} data-status={status}>{String(result)}</div> : null
  ),
}));

import { ChatView } from '../../../src/components/copilot/ChatView';

describe('ChatView', () => {
  const defaultProps = {
    onNewConversation: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      activeConversationId: null,
      messages: [],
      streamingText: '',
      isStreaming: false,
      toolRecords: [],
      reasoningText: '',
      turnSegments: [],
      copilotError: null,
    });
  });

  it('shows welcome screen when no active conversation', () => {
    render(<ChatView {...defaultProps} />);
    expect(screen.getByText('Welcome to AI Terminal')).toBeTruthy();
  });

  it('shows New Conversation button on welcome screen', () => {
    render(<ChatView {...defaultProps} />);
    expect(screen.getByText('Start New Conversation')).toBeTruthy();
  });

  it('calls onNewConversation when clicking the welcome button', () => {
    const onNewConversation = vi.fn();
    render(<ChatView onNewConversation={onNewConversation} />);
    fireEvent.click(screen.getByText('Start New Conversation'));
    expect(onNewConversation).toHaveBeenCalledTimes(1);
  });

  it('shows empty conversation prompt when active conversation has no messages', () => {
    useAppStore.setState({ activeConversationId: 'conv-1' });
    render(<ChatView {...defaultProps} />);
    expect(screen.getByText('Send a message to start...')).toBeTruthy();
  });

  it('renders messages in centered column', () => {
    useAppStore.setState({
      activeConversationId: 'conv-1',
      messages: [
        { id: 'msg-1', conversationId: 'conv-1', role: 'user', content: 'Hello', metadata: null, createdAt: '' },
        { id: 'msg-2', conversationId: 'conv-1', role: 'assistant', content: 'Hi there', metadata: null, createdAt: '' },
      ],
    });
    render(<ChatView {...defaultProps} />);
    expect(screen.getByTestId('message-msg-1')).toBeTruthy();
    expect(screen.getByTestId('message-msg-2')).toBeTruthy();
  });

  it('shows streaming block with streaming text', () => {
    useAppStore.setState({
      activeConversationId: 'conv-1',
      streamingText: 'Generating...',
      isStreaming: true,
    });
    render(<ChatView {...defaultProps} />);
    expect(screen.getByTestId('streaming-text')).toBeTruthy();
  });

  it('shows error message when copilotError exists', () => {
    useAppStore.setState({
      activeConversationId: 'conv-1',
      copilotError: 'Something went wrong',
    });
    render(<ChatView {...defaultProps} />);
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('shows error even when streamingText is empty (bug fix)', () => {
    useAppStore.setState({
      activeConversationId: 'conv-1',
      streamingText: '',
      isStreaming: false,
      toolRecords: [],
      copilotError: 'Error before streaming',
    });
    render(<ChatView {...defaultProps} />);
    expect(screen.getByText('Error before streaming')).toBeTruthy();
  });

  it('has centered conversation column with max-w-3xl', () => {
    useAppStore.setState({
      activeConversationId: 'conv-1',
      messages: [
        { id: 'msg-1', conversationId: 'conv-1', role: 'user', content: 'Test', metadata: null, createdAt: '' },
      ],
    });
    const { container } = render(<ChatView {...defaultProps} />);
    const centeredCol = container.querySelector('.max-w-3xl');
    expect(centeredCol).toBeTruthy();
  });

  // --- Streaming block turnSegments rendering (Phase 8) ---

  it('renders turnSegments in streaming block in order', () => {
    useAppStore.setState({
      activeConversationId: 'conv-1',
      isStreaming: true,
      turnSegments: [
        { type: 'reasoning', content: 'Thinking...' },
        { type: 'tool', toolCallId: 'tc1', toolName: 'bash', status: 'success', result: 'output' },
        { type: 'text', content: 'First part' },
      ],
      streamingText: 'More text...',
    });
    render(<ChatView {...defaultProps} />);

    // Should render reasoning from turnSegments
    expect(screen.getByTestId('reasoning')).toBeTruthy();
    expect(screen.getByTestId('reasoning').textContent).toBe('Thinking...');

    // Should render tool from turnSegments
    expect(screen.getByTestId('tool-tc1')).toBeTruthy();

    // Should render tool result for bash
    expect(screen.getByTestId('tool-result-bash')).toBeTruthy();

    // Should still render streaming text at the end
    expect(screen.getByTestId('streaming-text')).toBeTruthy();
  });

  it('renders reasoning during streaming when turnSegments has no reasoning entry yet', () => {
    useAppStore.setState({
      activeConversationId: 'conv-1',
      isStreaming: true,
      reasoningText: 'Mid-stream thinking...',
      turnSegments: [
        { type: 'tool', toolCallId: 'tc1', toolName: 'bash', status: 'running' },
      ],
      streamingText: '',
    });
    render(<ChatView {...defaultProps} />);

    // Should render reasoning from reasoningText even though turnSegments has no reasoning entry
    expect(screen.getByTestId('reasoning')).toBeTruthy();
    expect(screen.getByTestId('reasoning').textContent).toBe('Mid-stream thinking...');

    // Should also render tool from turnSegments
    expect(screen.getByTestId('tool-tc1')).toBeTruthy();
  });

  it('renders streaming block without turnSegments (fallback to old rendering)', () => {
    useAppStore.setState({
      activeConversationId: 'conv-1',
      isStreaming: true,
      reasoningText: 'Old reasoning',
      toolRecords: [
        { toolCallId: 'tc1', toolName: 'bash', status: 'running' },
      ],
      turnSegments: [],
      streamingText: 'Streaming...',
    });
    render(<ChatView {...defaultProps} />);

    // Should render reasoning from reasoningText
    expect(screen.getByTestId('reasoning')).toBeTruthy();
    expect(screen.getByTestId('reasoning').textContent).toBe('Old reasoning');

    // Should render tool from toolRecords
    expect(screen.getByTestId('tool-tc1')).toBeTruthy();

    // Should render streaming text
    expect(screen.getByTestId('streaming-text')).toBeTruthy();
  });
});
