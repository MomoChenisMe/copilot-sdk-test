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
});
