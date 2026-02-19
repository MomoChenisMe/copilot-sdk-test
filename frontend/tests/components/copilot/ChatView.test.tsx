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

vi.mock('../../../src/components/copilot/ScrollToBottom', () => ({
  ScrollToBottom: ({ visible, unreadCount, onClick }: { visible: boolean; unreadCount: number; onClick: () => void }) => (
    <button
      data-testid="scroll-to-bottom"
      onClick={onClick}
      className={visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
    >
      {unreadCount > 0 && <span data-testid="unread-badge">{unreadCount}</span>}
    </button>
  ),
}));

vi.mock('../../../src/components/copilot/ToolResultBlock', () => ({
  ToolResultBlock: ({ result, toolName, status }: { result: unknown; toolName: string; status?: string }) => (
    result != null ? <div data-testid={`tool-result-${toolName}`} data-status={status}>{String(result)}</div> : null
  ),
}));

vi.mock('../../../src/components/copilot/TaskPanel', () => ({
  TaskPanel: ({ tasks }: { tasks: Array<{ id: string; subject: string; status: string }> }) => (
    <div data-testid="task-panel">
      {tasks.map((t) => (
        <div key={t.id} data-testid={`task-item-${t.id}`}>{t.subject} ({t.status})</div>
      ))}
    </div>
  ),
}));

vi.mock('../../../src/components/copilot/PlanActToggle', () => ({
  default: ({ planMode, onToggle }: { planMode: boolean; onToggle: (v: boolean) => void }) => (
    <div data-testid="plan-act-toggle">
      <button data-testid="toggle-plan" onClick={() => onToggle(true)}>Plan</button>
      <button data-testid="toggle-act" onClick={() => onToggle(false)}>Act</button>
      <span data-testid="current-mode">{planMode ? 'plan' : 'act'}</span>
    </div>
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

  // --- Preset pills ---
  it('renders active preset pills above input area', () => {
    useAppStore.setState({
      activeConversationId: 'conv-1',
      activePresets: ['code-review', 'devops'],
    });
    render(<ChatView {...defaultProps} />);
    expect(screen.getByTestId('preset-pill-code-review')).toBeTruthy();
    expect(screen.getByTestId('preset-pill-devops')).toBeTruthy();
  });

  it('does not render preset area when no active presets', () => {
    useAppStore.setState({
      activeConversationId: 'conv-1',
      activePresets: [],
    });
    render(<ChatView {...defaultProps} />);
    expect(screen.queryByTestId('preset-pills')).toBeNull();
  });

  it('calls removePreset when clicking X on preset pill', () => {
    const removePreset = vi.fn();
    useAppStore.setState({
      activeConversationId: 'conv-1',
      activePresets: ['code-review'],
      removePreset,
    });
    render(<ChatView {...defaultProps} />);
    const removeBtn = screen.getByTestId('preset-pill-remove-code-review');
    fireEvent.click(removeBtn);
    expect(removePreset).toHaveBeenCalledWith('code-review');
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

  // === Tab switch loading state ===
  describe('tab switch loading', () => {
    it('shows loading indicator when messagesLoaded is false on an existing conversation tab', () => {
      const tabId = 'tab-loading';
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: {
          [tabId]: {
            id: tabId,
            conversationId: 'conv-1',
            title: 'Loading Tab',
            mode: 'copilot',
            messages: [],
            streamingText: '',
            isStreaming: false,
            toolRecords: [],
            reasoningText: '',
            turnContentSegments: [],
            turnSegments: [],
            copilotError: null,
            messagesLoaded: false,
            createdAt: Date.now(),
          },
        },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      expect(screen.getByTestId('messages-loading')).toBeTruthy();
    });

    it('shows empty prompt when messagesLoaded is true and messages are empty', () => {
      const tabId = 'tab-loaded';
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: {
          [tabId]: {
            id: tabId,
            conversationId: 'conv-1',
            title: 'Loaded Tab',
            mode: 'copilot',
            messages: [],
            streamingText: '',
            isStreaming: false,
            toolRecords: [],
            reasoningText: '',
            turnContentSegments: [],
            turnSegments: [],
            copilotError: null,
            messagesLoaded: true,
            createdAt: Date.now(),
          },
        },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      expect(screen.getByText('Send a message to start...')).toBeTruthy();
    });

    it('shows empty prompt for draft tab (null conversationId)', () => {
      const tabId = 'tab-draft';
      useAppStore.setState({
        activeConversationId: null,
        tabs: {
          [tabId]: {
            id: tabId,
            conversationId: null,
            title: 'New Chat',
            mode: 'copilot',
            messages: [],
            streamingText: '',
            isStreaming: false,
            toolRecords: [],
            reasoningText: '',
            turnContentSegments: [],
            turnSegments: [],
            copilotError: null,
            messagesLoaded: false,
            createdAt: Date.now(),
          },
        },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      // Draft tab should show empty prompt, not loading
      expect(screen.getByText('Send a message to start...')).toBeTruthy();
    });
  });

  // === Plan mode ===
  describe('plan mode', () => {
    const tabId = 'tab-plan';
    const makePlanTab = (planMode: boolean, extra?: Record<string, unknown>) => ({
      id: tabId,
      conversationId: 'conv-1',
      title: 'Plan Tab',
      mode: 'copilot' as const,
      messages: [
        { id: 'msg-1', conversationId: 'conv-1', role: 'user' as const, content: 'Hello', metadata: null, createdAt: '' },
      ],
      streamingText: '',
      isStreaming: false,
      toolRecords: [] as any[],
      reasoningText: '',
      turnContentSegments: [] as string[],
      turnSegments: [] as any[],
      copilotError: null,
      messagesLoaded: true,
      createdAt: Date.now(),
      usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, contextWindowUsed: 0, contextWindowMax: 0, premiumRequestsUsed: 0, premiumRequestsTotal: 0, premiumResetDate: null, model: null },
      planMode,
      showPlanCompletePrompt: false,
      ...extra,
    });

    it('renders PlanActToggle in input area', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makePlanTab(false) },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      expect(screen.getByTestId('plan-act-toggle')).toBeTruthy();
    });

    it('shows plan mode banner when planMode is true', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makePlanTab(true) },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      expect(screen.getByTestId('plan-mode-banner')).toBeTruthy();
    });

    it('does not show plan mode banner when planMode is false', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makePlanTab(false) },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      expect(screen.queryByTestId('plan-mode-banner')).toBeNull();
    });

    it('calls setTabPlanMode when PlanActToggle is toggled', () => {
      const setTabPlanMode = vi.fn();
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makePlanTab(false) },
        tabOrder: [tabId],
        activeTabId: tabId,
        setTabPlanMode,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      fireEvent.click(screen.getByTestId('toggle-plan'));
      expect(setTabPlanMode).toHaveBeenCalledWith(tabId, true);
    });

    it('shows plan complete prompt when showPlanCompletePrompt is true', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makePlanTab(true, { showPlanCompletePrompt: true }) },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      expect(screen.getByTestId('plan-complete-prompt')).toBeTruthy();
      expect(screen.getByTestId('switch-to-act-btn')).toBeTruthy();
      expect(screen.getByTestId('dismiss-plan-prompt-btn')).toBeTruthy();
    });

    it('switch-to-act button calls setTabPlanMode with false', () => {
      const setTabPlanMode = vi.fn();
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makePlanTab(true, { showPlanCompletePrompt: true }) },
        tabOrder: [tabId],
        activeTabId: tabId,
        setTabPlanMode,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      fireEvent.click(screen.getByTestId('switch-to-act-btn'));
      expect(setTabPlanMode).toHaveBeenCalledWith(tabId, false);
    });

    it('does not show plan complete prompt when not streaming but prompt is false', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makePlanTab(true, { showPlanCompletePrompt: false }) },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      expect(screen.queryByTestId('plan-complete-prompt')).toBeNull();
    });
  });

  // === Waiting for user input indicator ===
  describe('waiting for user input', () => {
    const tabId = 'tab-input';
    const makeInputTab = (userInputRequest: unknown) => ({
      id: tabId,
      conversationId: 'conv-1',
      title: 'Input Tab',
      mode: 'copilot' as const,
      messages: [
        { id: 'msg-1', conversationId: 'conv-1', role: 'user' as const, content: 'Hello', metadata: null, createdAt: '' },
      ],
      streamingText: '',
      isStreaming: false,
      toolRecords: [] as any[],
      reasoningText: '',
      turnContentSegments: [] as string[],
      turnSegments: [] as any[],
      copilotError: null,
      messagesLoaded: true,
      createdAt: Date.now(),
      userInputRequest,
    });

    it('shows waiting indicator when userInputRequest is present', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makeInputTab({ requestId: 'req-1', question: 'Pick one', choices: ['A', 'B'] }) },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      expect(screen.getByTestId('waiting-for-input')).toBeTruthy();
      expect(screen.getByText(/Waiting for your response/)).toBeTruthy();
    });

    it('does not show waiting indicator when userInputRequest is null', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makeInputTab(null) },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      expect(screen.queryByTestId('waiting-for-input')).toBeNull();
    });
  });

  // === Scroll-to-bottom button ===
  describe('scroll-to-bottom button', () => {
    const tabId = 'tab-scroll';
    const tabState = {
      id: tabId,
      conversationId: 'conv-1',
      title: 'Scroll Tab',
      mode: 'copilot' as const,
      messages: [
        { id: 'msg-1', conversationId: 'conv-1', role: 'user' as const, content: 'Hello', metadata: null, createdAt: '' },
        { id: 'msg-2', conversationId: 'conv-1', role: 'assistant' as const, content: 'Hi there', metadata: null, createdAt: '' },
      ],
      streamingText: '',
      isStreaming: false,
      toolRecords: [] as any[],
      reasoningText: '',
      turnContentSegments: [] as any[],
      turnSegments: [] as any[],
      copilotError: null,
      messagesLoaded: true,
      createdAt: Date.now(),
    };

    it('renders scroll-to-bottom button element', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: tabState },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      expect(screen.getByTestId('scroll-to-bottom')).toBeTruthy();
    });

    it('scroll-to-bottom button is hidden by default (at bottom)', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: tabState },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      const btn = screen.getByTestId('scroll-to-bottom');
      // Should have opacity-0 since we're at the bottom initially
      expect(btn.className).toContain('opacity-0');
    });
  });

  // === TaskPanel integration ===
  describe('task panel', () => {
    const tabId = 'tab-tasks';
    const makeTaskTab = (tasks: Array<{ id: string; subject: string; description: string; activeForm: string; status: string; blockedBy: string[] }>) => ({
      id: tabId,
      conversationId: 'conv-1',
      title: 'Task Tab',
      mode: 'copilot' as const,
      messages: [
        { id: 'msg-1', conversationId: 'conv-1', role: 'user' as const, content: 'Hello', metadata: null, createdAt: '' },
      ],
      streamingText: '',
      isStreaming: false,
      toolRecords: [] as any[],
      reasoningText: '',
      turnContentSegments: [] as string[],
      turnSegments: [] as any[],
      copilotError: null,
      messagesLoaded: true,
      createdAt: Date.now(),
      tasks,
    });

    it('renders TaskPanel when tasks exist', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: {
          [tabId]: makeTaskTab([
            { id: 't1', subject: 'Fix bug', description: '', activeForm: '', status: 'completed', blockedBy: [] },
            { id: 't2', subject: 'Add tests', description: '', activeForm: 'Adding tests', status: 'in_progress', blockedBy: [] },
          ]),
        },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      expect(screen.getByTestId('task-panel')).toBeTruthy();
      expect(screen.getByTestId('task-item-t1')).toBeTruthy();
      expect(screen.getByTestId('task-item-t2')).toBeTruthy();
    });

    it('does not render TaskPanel when tasks are empty', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makeTaskTab([]) },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      expect(screen.queryByTestId('task-panel')).toBeNull();
    });
  });

  // --- Recent conversations on welcome page ---
  describe('welcome page recent conversations', () => {
    it('shows recent conversations when available', () => {
      useAppStore.setState({
        activeConversationId: null,
        conversations: [
          { id: 'c1', title: 'First chat', model: 'gpt-4o', cwd: '~', pinned: false, sdkSessionId: null, createdAt: '', updatedAt: '' },
          { id: 'c2', title: 'Second chat', model: 'claude-sonnet-4-5-20250929', cwd: '~', pinned: false, sdkSessionId: null, createdAt: '', updatedAt: '' },
        ],
      });
      render(<ChatView {...defaultProps} />);
      expect(screen.getByTestId('recent-conversations')).toBeTruthy();
      expect(screen.getByText('First chat')).toBeTruthy();
      expect(screen.getByText('Second chat')).toBeTruthy();
    });

    it('does not show recent conversations section when empty', () => {
      useAppStore.setState({
        activeConversationId: null,
        conversations: [],
      });
      render(<ChatView {...defaultProps} />);
      expect(screen.queryByTestId('recent-conversations')).toBeNull();
    });

    it('calls onOpenConversation when clicking a recent conversation', () => {
      const onOpenConversation = vi.fn();
      useAppStore.setState({
        activeConversationId: null,
        conversations: [
          { id: 'c1', title: 'First chat', model: 'gpt-4o', cwd: '~', pinned: false, sdkSessionId: null, createdAt: '', updatedAt: '' },
        ],
      });
      render(<ChatView {...defaultProps} onOpenConversation={onOpenConversation} />);
      fireEvent.click(screen.getByTestId('recent-conv-c1'));
      expect(onOpenConversation).toHaveBeenCalledWith('c1');
    });

    it('limits recent conversations to 10', () => {
      const convs = Array.from({ length: 15 }, (_, i) => ({
        id: `c${i}`, title: `Chat ${i}`, model: 'gpt-4o', cwd: '~',
        pinned: false, sdkSessionId: null, createdAt: '', updatedAt: '',
      }));
      useAppStore.setState({
        activeConversationId: null,
        conversations: convs,
      });
      render(<ChatView {...defaultProps} />);
      const items = screen.getAllByTestId(/^recent-conv-/);
      expect(items).toHaveLength(10);
    });
  });
});
