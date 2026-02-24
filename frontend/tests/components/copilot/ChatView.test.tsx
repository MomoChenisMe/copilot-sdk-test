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

vi.mock('../../../src/components/copilot/ThinkingIndicator', () => ({
  ThinkingIndicator: () => <div data-testid="thinking-indicator">Thinking...</div>,
}));

vi.mock('../../../src/components/copilot/InlineUserInput', () => ({
  InlineUserInput: ({ question, choices, multiSelect, onSubmit }: {
    question: string;
    choices?: string[];
    multiSelect?: boolean;
    onSubmit: (answer: string, wasFreeform: boolean) => void;
  }) => (
    <div data-testid="inline-user-input" data-question={question} data-multi-select={multiSelect}>
      {choices?.map((c) => <span key={c}>{c}</span>)}
      <button data-testid="inline-submit" onClick={() => onSubmit('test-answer', false)}>Submit</button>
    </div>
  ),
}));

vi.mock('../../../src/components/copilot/UserInputDialog', () => ({
  UserInputDialog: () => <div data-testid="user-input-overlay" />,
}));

vi.mock('../../../src/components/copilot/WebSearchToggle', () => ({
  default: ({ forced, disabled }: { forced: boolean; disabled?: boolean }) => (
    <button data-testid="web-search-toggle" data-forced={String(forced)} disabled={disabled}>WebSearch</button>
  ),
}));

vi.mock('../../../src/components/copilot/MobileToolbarPopup', () => ({
  MobileToolbarPopup: () => <div data-testid="mobile-toolbar-popup" />,
}));

vi.mock('../../../src/components/copilot/ModelSelector', () => ({
  ModelSelector: ({ currentModel, onSelect }: { currentModel: string; onSelect: (id: string) => void }) => (
    <button data-testid="model-selector" onClick={() => onSelect('test-model')}>{currentModel}</button>
  ),
}));

vi.mock('../../../src/hooks/queries/useSkillsQuery', () => ({
  useSkillsQuery: () => ({ data: [], isLoading: false, error: null }),
}));

vi.mock('../../../src/hooks/queries/useSdkCommandsQuery', () => ({
  useSdkCommandsQuery: () => ({ data: [], isLoading: false, error: null }),
}));

const mockUseBraveApiKeyQuery = vi.fn().mockReturnValue({ data: { hasKey: false, maskedKey: '' }, isLoading: false, error: null });
vi.mock('../../../src/hooks/queries/useConfigQuery', () => ({
  useBraveApiKeyQuery: (...args: unknown[]) => mockUseBraveApiKeyQuery(...args),
}));

vi.mock('../../../src/hooks/queries/useQuotaQuery', () => ({
  useQuotaQuery: () => ({ data: null, isLoading: false, error: null }),
}));

const mockUseConversationsQuery = vi.fn().mockReturnValue({ data: [], isLoading: false, error: null });
vi.mock('../../../src/hooks/queries/useConversationsQuery', () => ({
  useConversationsQuery: (...args: unknown[]) => mockUseConversationsQuery(...args),
}));

const mockUseMessagesQuery = vi.fn().mockReturnValue({ data: [], isLoading: false, error: null });
vi.mock('../../../src/hooks/queries/useMessagesQuery', () => ({
  useMessagesQuery: (...args: unknown[]) => mockUseMessagesQuery(...args),
}));

import { ChatView } from '../../../src/components/copilot/ChatView';

describe('ChatView', () => {
  const defaultProps = {
    onNewConversation: vi.fn(),
  };

  const testTabId = 'tab-test';
  const makeTab = (overrides: Record<string, unknown> = {}) => ({
    id: testTabId,
    conversationId: 'conv-1',
    title: 'Test Tab',
    mode: 'copilot' as const,
    messages: [] as any[],
    streamingText: '',
    isStreaming: false,
    toolRecords: [] as any[],
    reasoningText: '',
    turnContentSegments: [] as string[],
    turnSegments: [] as any[],
    copilotError: null,
    createdAt: Date.now(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBraveApiKeyQuery.mockReturnValue({ data: { hasKey: false, maskedKey: '' }, isLoading: false, error: null });
    mockUseConversationsQuery.mockReturnValue({ data: [], isLoading: false, error: null });
    mockUseMessagesQuery.mockReturnValue({ data: [], isLoading: false, error: null });
    useAppStore.setState({
      activeConversationId: null,
    });
  });

  it('shows welcome screen when no active conversation', () => {
    render(<ChatView {...defaultProps} />);
    expect(screen.getByText('Welcome to CodeForge')).toBeTruthy();
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
    mockUseMessagesQuery.mockReturnValue({
      data: [
        { id: 'msg-1', conversationId: 'conv-1', role: 'user', content: 'Hello', metadata: null, createdAt: '' },
        { id: 'msg-2', conversationId: 'conv-1', role: 'assistant', content: 'Hi there', metadata: null, createdAt: '' },
      ],
      isLoading: false,
      error: null,
    });
    useAppStore.setState({
      activeConversationId: 'conv-1',
      tabs: { [testTabId]: makeTab() },
      tabOrder: [testTabId],
      activeTabId: testTabId,
    });
    render(<ChatView {...defaultProps} tabId={testTabId} />);
    expect(screen.getByTestId('message-msg-1')).toBeTruthy();
    expect(screen.getByTestId('message-msg-2')).toBeTruthy();
  });

  it('shows streaming block with streaming text', () => {
    useAppStore.setState({
      activeConversationId: 'conv-1',
      tabs: { [testTabId]: makeTab({ streamingText: 'Generating...' }) },
      tabOrder: [testTabId],
      activeTabId: testTabId,
    });
    render(<ChatView {...defaultProps} tabId={testTabId} isStreaming={true} />);
    expect(screen.getByTestId('streaming-text')).toBeTruthy();
  });

  it('shows error message when copilotError exists', () => {
    useAppStore.setState({
      activeConversationId: 'conv-1',
      tabs: { [testTabId]: makeTab({ copilotError: 'Something went wrong' }) },
      tabOrder: [testTabId],
      activeTabId: testTabId,
    });
    render(<ChatView {...defaultProps} tabId={testTabId} />);
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('shows error even when streamingText is empty (bug fix)', () => {
    useAppStore.setState({
      activeConversationId: 'conv-1',
      tabs: { [testTabId]: makeTab({ copilotError: 'Error before streaming' }) },
      tabOrder: [testTabId],
      activeTabId: testTabId,
    });
    render(<ChatView {...defaultProps} tabId={testTabId} />);
    expect(screen.getByText('Error before streaming')).toBeTruthy();
  });

  it('has centered conversation column with max-w-3xl', () => {
    mockUseMessagesQuery.mockReturnValue({
      data: [
        { id: 'msg-1', conversationId: 'conv-1', role: 'user', content: 'Test', metadata: null, createdAt: '' },
      ],
      isLoading: false,
      error: null,
    });
    useAppStore.setState({
      activeConversationId: 'conv-1',
      tabs: { [testTabId]: makeTab() },
      tabOrder: [testTabId],
      activeTabId: testTabId,
    });
    const { container } = render(<ChatView {...defaultProps} tabId={testTabId} />);
    const centeredCol = container.querySelector('.max-w-3xl');
    expect(centeredCol).toBeTruthy();
  });

  // --- Streaming block turnSegments rendering (Phase 8) ---

  it('renders turnSegments in streaming block in order', () => {
    useAppStore.setState({
      activeConversationId: 'conv-1',
      tabs: { [testTabId]: makeTab({
        turnSegments: [
          { type: 'reasoning', content: 'Thinking...' },
          { type: 'tool', toolCallId: 'tc1', toolName: 'bash', status: 'success', result: 'output' },
          { type: 'text', content: 'First part' },
        ],
        streamingText: 'More text...',
      }) },
      tabOrder: [testTabId],
      activeTabId: testTabId,
    });
    render(<ChatView {...defaultProps} tabId={testTabId} isStreaming={true} />);

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
      tabs: { [testTabId]: makeTab({
        reasoningText: 'Mid-stream thinking...',
        turnSegments: [
          { type: 'tool', toolCallId: 'tc1', toolName: 'bash', status: 'running' },
        ],
      }) },
      tabOrder: [testTabId],
      activeTabId: testTabId,
    });
    render(<ChatView {...defaultProps} tabId={testTabId} isStreaming={true} />);

    // Should render reasoning from reasoningText even though turnSegments has no reasoning entry
    expect(screen.getByTestId('reasoning')).toBeTruthy();
    expect(screen.getByTestId('reasoning').textContent).toBe('Mid-stream thinking...');

    // Should also render tool from turnSegments
    expect(screen.getByTestId('tool-tc1')).toBeTruthy();
  });

  it('renders streaming block without turnSegments (fallback to old rendering)', () => {
    useAppStore.setState({
      activeConversationId: 'conv-1',
      tabs: { [testTabId]: makeTab({
        reasoningText: 'Old reasoning',
        toolRecords: [
          { toolCallId: 'tc1', toolName: 'bash', status: 'running' },
        ],
        turnSegments: [],
        streamingText: 'Streaming...',
      }) },
      tabOrder: [testTabId],
      activeTabId: testTabId,
    });
    render(<ChatView {...defaultProps} tabId={testTabId} isStreaming={true} />);

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
    it('shows loading indicator when messages are loading on an existing conversation tab', () => {
      const tabId = 'tab-loading';
      mockUseMessagesQuery.mockReturnValue({ data: [], isLoading: true, error: null });
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

            createdAt: Date.now(),
          },
        },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      expect(screen.getByTestId('messages-loading')).toBeTruthy();
    });

    it('shows empty prompt when messages are loaded and empty', () => {
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

    it('hides plan mode banner when mode is terminal even if planMode is true', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makePlanTab(true, { mode: 'terminal' }) },
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
        tabs: { [tabId]: makePlanTab(true, { showPlanCompletePrompt: true, planFilePath: '/tmp/plan.md' }) },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      expect(screen.getByTestId('plan-complete-prompt')).toBeTruthy();
      expect(screen.getByTestId('execute-plan-btn')).toBeTruthy();
      expect(screen.getByTestId('continue-planning-btn')).toBeTruthy();
    });

    it('shows "Execute Plan" button in plan complete prompt', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makePlanTab(true, { showPlanCompletePrompt: true, planFilePath: '/tmp/plan.md' }) },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      expect(screen.getByTestId('execute-plan-btn')).toBeTruthy();
      expect(screen.getByText('Execute Plan')).toBeTruthy();
    });

    it('shows "Continue Planning" button in plan complete prompt', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makePlanTab(true, { showPlanCompletePrompt: true, planFilePath: '/tmp/plan.md' }) },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      expect(screen.getByTestId('continue-planning-btn')).toBeTruthy();
      expect(screen.getByText('Continue Planning')).toBeTruthy();
    });

    it('execute plan button calls onExecutePlan with conversationId and planFilePath', () => {
      const onExecutePlan = vi.fn();
      const setTabShowPlanCompletePrompt = vi.fn();
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makePlanTab(true, { showPlanCompletePrompt: true, planFilePath: '/tmp/plan.md' }) },
        tabOrder: [tabId],
        activeTabId: tabId,
        setTabShowPlanCompletePrompt,
      });
      render(<ChatView {...defaultProps} tabId={tabId} onExecutePlan={onExecutePlan} />);
      fireEvent.click(screen.getByTestId('execute-plan-btn'));
      expect(onExecutePlan).toHaveBeenCalledWith('conv-1', '/tmp/plan.md');
    });

    it('continue planning button dismisses the plan complete prompt', () => {
      const setTabShowPlanCompletePrompt = vi.fn();
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makePlanTab(true, { showPlanCompletePrompt: true, planFilePath: '/tmp/plan.md' }) },
        tabOrder: [tabId],
        activeTabId: tabId,
        setTabShowPlanCompletePrompt,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      fireEvent.click(screen.getByTestId('continue-planning-btn'));
      expect(setTabShowPlanCompletePrompt).toHaveBeenCalledWith(tabId, false);
    });

    it('does not show execute plan button when planFilePath is null', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makePlanTab(true, { showPlanCompletePrompt: true, planFilePath: null }) },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      // Should still show the prompt but without execute button
      expect(screen.getByTestId('plan-complete-prompt')).toBeTruthy();
      expect(screen.queryByTestId('execute-plan-btn')).toBeNull();
      // Continue planning should still be available
      expect(screen.getByTestId('continue-planning-btn')).toBeTruthy();
    });

    it('shows plan file path in plan complete prompt when planFilePath is available', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makePlanTab(true, { showPlanCompletePrompt: true, planFilePath: '/tmp/.codeforge/plans/2026-02-19-refactor-db.md' }) },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      expect(screen.getByTestId('plan-file-path')).toBeTruthy();
      expect(screen.getByTestId('plan-file-path').textContent).toContain('/tmp/.codeforge/plans/2026-02-19-refactor-db.md');
    });

    it('does not show plan file path when planFilePath is null', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makePlanTab(true, { showPlanCompletePrompt: true, planFilePath: null }) },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      expect(screen.getByTestId('plan-complete-prompt')).toBeTruthy();
      expect(screen.queryByTestId('plan-file-path')).toBeNull();
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

  // === Inline user input (InlineUserInput integration) ===
  describe('inline user input', () => {
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

      createdAt: Date.now(),
      userInputRequest,
    });

    it('renders InlineUserInput inline when userInputRequest is present', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makeInputTab({ requestId: 'req-1', question: 'Pick one', choices: ['A', 'B'], allowFreeform: true }) },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      // InlineUserInput should be rendered inline (not a modal overlay)
      expect(screen.getByTestId('inline-user-input')).toBeTruthy();
    });

    it('does not render modal overlay (UserInputDialog) when userInputRequest is present', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makeInputTab({ requestId: 'req-1', question: 'Pick one', choices: ['A', 'B'], allowFreeform: true }) },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      // UserInputDialog overlay should NOT be rendered
      expect(screen.queryByTestId('user-input-overlay')).toBeNull();
    });

    it('passes question and choices to InlineUserInput', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makeInputTab({ requestId: 'req-1', question: 'Which option?', choices: ['X', 'Y'], allowFreeform: true }) },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      const inlineInput = screen.getByTestId('inline-user-input');
      expect(inlineInput.getAttribute('data-question')).toBe('Which option?');
      expect(screen.getByText('X')).toBeTruthy();
      expect(screen.getByText('Y')).toBeTruthy();
    });

    it('passes multiSelect prop to InlineUserInput', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makeInputTab({ requestId: 'req-1', question: 'Select many', choices: ['A', 'B'], allowFreeform: true, multiSelect: true }) },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      const inlineInput = screen.getByTestId('inline-user-input');
      expect(inlineInput.getAttribute('data-multi-select')).toBe('true');
    });

    it('does not render InlineUserInput when userInputRequest is null', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makeInputTab(null) },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      expect(screen.queryByTestId('inline-user-input')).toBeNull();
    });

    it('calls onUserInputResponse and clears request when InlineUserInput submits', () => {
      const onUserInputResponse = vi.fn();
      const setTabUserInputRequest = vi.fn();
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makeInputTab({ requestId: 'req-99', question: 'Pick', choices: ['A'], allowFreeform: true }) },
        tabOrder: [tabId],
        activeTabId: tabId,
        setTabUserInputRequest,
      });
      render(<ChatView {...defaultProps} tabId={tabId} onUserInputResponse={onUserInputResponse} />);
      fireEvent.click(screen.getByTestId('inline-submit'));
      expect(onUserInputResponse).toHaveBeenCalledWith('req-99', 'test-answer', false);
      expect(setTabUserInputRequest).toHaveBeenCalledWith(tabId, null);
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

    it('does not show unread badge when content does not overflow container', () => {
      // In jsdom, scrollHeight === clientHeight === 0 (no overflow)
      // When new messages arrive, unreadCount should NOT increment
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: tabState },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      const { rerender } = render(<ChatView {...defaultProps} tabId={tabId} />);

      // Add a new message to trigger the useEffect
      const updatedTab = {
        ...tabState,
        messages: [
          ...tabState.messages,
          { id: 'msg-3', conversationId: 'conv-1', role: 'assistant' as const, content: 'New message', metadata: null, createdAt: '' },
        ],
      };
      useAppStore.setState({
        tabs: { [tabId]: updatedTab },
      });
      rerender(<ChatView {...defaultProps} tabId={tabId} />);

      // Button should remain hidden and no unread badge
      const btn = screen.getByTestId('scroll-to-bottom');
      expect(btn.className).toContain('opacity-0');
      expect(screen.queryByTestId('unread-badge')).toBeNull();
    });

    it('does not increment unread count when streaming updates arrive and content fits', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: tabState },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      const { rerender } = render(<ChatView {...defaultProps} tabId={tabId} />);

      // Simulate streaming text update
      const streamingTab = { ...tabState, streamingText: 'Streaming content...' };
      useAppStore.setState({
        tabs: { [tabId]: streamingTab },
      });
      rerender(<ChatView {...defaultProps} tabId={tabId} />);

      // No unread badge should appear
      expect(screen.queryByTestId('unread-badge')).toBeNull();
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

  // === RWD bottom toolbar ===
  describe('responsive bottom toolbar', () => {
    const tabId = 'tab-rwd';
    const makeRwdTab = () => ({
      id: tabId,
      conversationId: 'conv-1',
      title: 'RWD Tab',
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

      createdAt: Date.now(),
    });

    it('should use flex-wrap on the bottom toolbar for mobile stacking', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makeRwdTab() },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      const { container } = render(<ChatView {...defaultProps} tabId={tabId} />);
      // The toolbar row containing ModelSelector, CwdSelector, etc. should have flex-wrap
      const toolbarRow = container.querySelector('[data-testid="bottom-toolbar-row"]');
      expect(toolbarRow).toBeTruthy();
      expect(toolbarRow!.className).toContain('flex-wrap');
    });
  });

  // === ThinkingIndicator integration ===
  describe('thinking indicator', () => {
    const tabId = 'tab-thinking';
    const makeThinkingTab = (overrides: Record<string, unknown>) => ({
      id: tabId,
      conversationId: 'conv-1',
      title: 'Thinking Tab',
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

      createdAt: Date.now(),
      ...overrides,
    });

    it('shows ThinkingIndicator when streaming with no text and no active tools', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makeThinkingTab({ isStreaming: true, streamingText: '', toolRecords: [], turnSegments: [] }) },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} isStreaming={true} />);
      expect(screen.getByTestId('thinking-indicator')).toBeTruthy();
    });

    it('does not show ThinkingIndicator when streaming text exists', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makeThinkingTab({ isStreaming: true, streamingText: 'Hello world' }) },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} isStreaming={true} />);
      expect(screen.queryByTestId('thinking-indicator')).toBeNull();
    });

    it('does not show ThinkingIndicator when not streaming', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makeThinkingTab({ isStreaming: false, streamingText: '' }) },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} isStreaming={false} />);
      expect(screen.queryByTestId('thinking-indicator')).toBeNull();
    });

    it('does not show ThinkingIndicator when turnSegments has active tool records', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: {
          [tabId]: makeThinkingTab({
            isStreaming: true,
            streamingText: '',
            turnSegments: [{ type: 'tool', toolCallId: 'tc1', toolName: 'bash', status: 'running' }],
          }),
        },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} isStreaming={true} />);
      expect(screen.queryByTestId('thinking-indicator')).toBeNull();
    });
  });

  // --- Recent conversations on welcome page ---
  describe('welcome page recent conversations', () => {
    it('shows recent conversations when available', () => {
      mockUseConversationsQuery.mockReturnValue({
        data: [
          { id: 'c1', title: 'First chat', model: 'gpt-4o', cwd: '~', pinned: false, sdkSessionId: null, createdAt: '', updatedAt: '' },
          { id: 'c2', title: 'Second chat', model: 'claude-sonnet-4-5-20250929', cwd: '~', pinned: false, sdkSessionId: null, createdAt: '', updatedAt: '' },
        ],
        isLoading: false,
        error: null,
      });
      useAppStore.setState({ activeConversationId: null });
      render(<ChatView {...defaultProps} />);
      expect(screen.getByTestId('recent-conversations')).toBeTruthy();
      expect(screen.getByText('First chat')).toBeTruthy();
      expect(screen.getByText('Second chat')).toBeTruthy();
    });

    it('does not show recent conversations section when empty', () => {
      useAppStore.setState({ activeConversationId: null });
      render(<ChatView {...defaultProps} />);
      expect(screen.queryByTestId('recent-conversations')).toBeNull();
    });

    it('calls onOpenConversation when clicking a recent conversation', () => {
      const onOpenConversation = vi.fn();
      mockUseConversationsQuery.mockReturnValue({
        data: [
          { id: 'c1', title: 'First chat', model: 'gpt-4o', cwd: '~', pinned: false, sdkSessionId: null, createdAt: '', updatedAt: '' },
        ],
        isLoading: false,
        error: null,
      });
      useAppStore.setState({ activeConversationId: null });
      render(<ChatView {...defaultProps} onOpenConversation={onOpenConversation} />);
      fireEvent.click(screen.getByTestId('recent-conv-c1'));
      expect(onOpenConversation).toHaveBeenCalledWith('c1');
    });

    it('limits recent conversations to 10', () => {
      const convs = Array.from({ length: 15 }, (_, i) => ({
        id: `c${i}`, title: `Chat ${i}`, model: 'gpt-4o', cwd: '~',
        pinned: false, sdkSessionId: null, createdAt: '', updatedAt: '',
      }));
      mockUseConversationsQuery.mockReturnValue({ data: convs, isLoading: false, error: null });
      useAppStore.setState({ activeConversationId: null });
      render(<ChatView {...defaultProps} />);
      const items = screen.getAllByTestId(/^recent-conv-/);
      expect(items).toHaveLength(10);
    });
  });

  // === Input history integration ===
  describe('input history', () => {
    it('passes inputHistory derived from user messages to Input', () => {
      const tabId = 'tab-history';
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: {
          [tabId]: {
            id: tabId,
            conversationId: 'conv-1',
            title: 'History Tab',
            mode: 'copilot' as const,
            messages: [
              { id: 'msg-1', conversationId: 'conv-1', role: 'user' as const, content: 'first question', metadata: null, createdAt: '' },
              { id: 'msg-2', conversationId: 'conv-1', role: 'assistant' as const, content: 'first answer', metadata: null, createdAt: '' },
              { id: 'msg-3', conversationId: 'conv-1', role: 'user' as const, content: 'second question', metadata: null, createdAt: '' },
              { id: 'msg-4', conversationId: 'conv-1', role: 'assistant' as const, content: 'second answer', metadata: null, createdAt: '' },
            ],
            streamingText: '',
            isStreaming: false,
            toolRecords: [] as any[],
            reasoningText: '',
            turnContentSegments: [] as string[],
            turnSegments: [] as any[],
            copilotError: null,

            createdAt: Date.now(),
          },
        },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);

      // The Input component should be rendered (verify it exists via textarea)
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeTruthy();

      // ArrowUp should navigate to most recent user message (reversed order)
      fireEvent.keyDown(textarea, { key: 'ArrowUp' });
      expect(textarea).toHaveValue('second question');

      fireEvent.keyDown(textarea, { key: 'ArrowUp' });
      expect(textarea).toHaveValue('first question');
    });

    it('filters inputHistory by mode — copilot excludes bash messages', () => {
      const tabId = 'tab-hist-copilot';
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: {
          [tabId]: {
            id: tabId,
            conversationId: 'conv-1',
            title: 'Mixed Tab',
            mode: 'copilot' as const,
            messages: [
              { id: 'm1', conversationId: 'conv-1', role: 'user' as const, content: 'ai question', metadata: null, createdAt: '' },
              { id: 'm2', conversationId: 'conv-1', role: 'user' as const, content: 'ls -la', metadata: { bash: true }, createdAt: '' },
              { id: 'm3', conversationId: 'conv-1', role: 'user' as const, content: 'another ai question', metadata: null, createdAt: '' },
            ],
            streamingText: '',
            isStreaming: false,
            toolRecords: [] as any[],
            reasoningText: '',
            turnContentSegments: [] as string[],
            turnSegments: [] as any[],
            copilotError: null,

            createdAt: Date.now(),
          },
        },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      const textarea = screen.getByRole('textbox');

      // ArrowUp should show copilot messages only (not 'ls -la')
      fireEvent.keyDown(textarea, { key: 'ArrowUp' });
      expect(textarea).toHaveValue('another ai question');

      fireEvent.keyDown(textarea, { key: 'ArrowUp' });
      expect(textarea).toHaveValue('ai question');

      // No more history — should stay at oldest
      fireEvent.keyDown(textarea, { key: 'ArrowUp' });
      expect(textarea).toHaveValue('ai question');
    });

    it('filters inputHistory by mode — terminal shows only bash messages', () => {
      const tabId = 'tab-hist-terminal';
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: {
          [tabId]: {
            id: tabId,
            conversationId: 'conv-1',
            title: 'Terminal Tab',
            mode: 'terminal' as const,
            messages: [
              { id: 'm1', conversationId: 'conv-1', role: 'user' as const, content: 'ai question', metadata: null, createdAt: '' },
              { id: 'm2', conversationId: 'conv-1', role: 'user' as const, content: 'ls -la', metadata: { bash: true }, createdAt: '' },
              { id: 'm3', conversationId: 'conv-1', role: 'user' as const, content: 'pwd', metadata: { bash: true }, createdAt: '' },
            ],
            streamingText: '',
            isStreaming: false,
            toolRecords: [] as any[],
            reasoningText: '',
            turnContentSegments: [] as string[],
            turnSegments: [] as any[],
            copilotError: null,

            createdAt: Date.now(),
          },
        },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      render(<ChatView {...defaultProps} tabId={tabId} />);
      const textarea = screen.getByRole('textbox');

      // ArrowUp should show bash messages only (not 'ai question')
      fireEvent.keyDown(textarea, { key: 'ArrowUp' });
      expect(textarea).toHaveValue('pwd');

      fireEvent.keyDown(textarea, { key: 'ArrowUp' });
      expect(textarea).toHaveValue('ls -la');

      // No more history
      fireEvent.keyDown(textarea, { key: 'ArrowUp' });
      expect(textarea).toHaveValue('ls -la');
    });
  });

  // === toolRecords null safety (Point 8 bug fix) ===
  describe('toolRecords null safety', () => {
    it('does not crash when toolRecords is undefined in fallback rendering path', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        isStreaming: true,
        toolRecords: undefined as any,
        reasoningText: '',
        turnSegments: [],
        streamingText: '',
      });
      // Should render without throwing "Cannot read properties of undefined (reading 'map')"
      expect(() => render(<ChatView {...defaultProps} />)).not.toThrow();
    });

    it('renders correctly when tab toolRecords is undefined', () => {
      const tabId = 'tab-undefined-tr';
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: {
          [tabId]: {
            id: tabId,
            conversationId: 'conv-1',
            title: 'Test Tab',
            mode: 'copilot' as const,
            messages: [],
            streamingText: '',
            isStreaming: true,
            toolRecords: undefined as any,
            reasoningText: '',
            turnContentSegments: [],
            turnSegments: [],
            copilotError: null,

            createdAt: Date.now(),
          },
        },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      expect(() => render(<ChatView {...defaultProps} tabId={tabId} />)).not.toThrow();
    });
  });

  // === Toolbar layout: Clock + WebSearch in input leftActions ===
  describe('toolbar layout - schedule and websearch in input', () => {
    const tabId = 'tab-toolbar-layout';
    const makeToolbarTab = (extra?: Record<string, unknown>) => ({
      id: tabId,
      conversationId: 'conv-1',
      title: 'Toolbar Tab',
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

      createdAt: Date.now(),
      ...extra,
    });

    it('desktop toolbar does not contain Clock button', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makeToolbarTab() },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      const { container } = render(<ChatView {...defaultProps} tabId={tabId} />);
      const toolbar = container.querySelector('[data-testid="bottom-toolbar-row"]');
      expect(toolbar).toBeTruthy();
      // Clock button (with Scheduled Task title) should NOT be inside the desktop toolbar
      const allToolbarButtons = toolbar!.querySelectorAll('button');
      const clockBtn = Array.from(allToolbarButtons).find(b => b.querySelector('.lucide-clock'));
      expect(clockBtn).toBeFalsy();
    });

    it('desktop toolbar does not contain WebSearchToggle', () => {
      mockUseBraveApiKeyQuery.mockReturnValue({ data: { hasKey: true, maskedKey: '' }, isLoading: false, error: null });
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makeToolbarTab() },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      const { container } = render(<ChatView {...defaultProps} tabId={tabId} />);
      const toolbar = container.querySelector('[data-testid="bottom-toolbar-row"]');
      expect(toolbar).toBeTruthy();
      // WebSearchToggle should NOT be inside the desktop toolbar
      const wsToggle = toolbar!.querySelector('[data-testid="web-search-toggle"]');
      expect(wsToggle).toBeFalsy();
    });

    it('Clock button exists in input leftActions area (visible on all sizes)', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makeToolbarTab() },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      const { container } = render(<ChatView {...defaultProps} tabId={tabId} />);
      // Clock button should exist somewhere in the DOM (in leftActions, not in toolbar)
      const allButtons = container.querySelectorAll('button');
      const clockBtn = Array.from(allButtons).find(b => b.querySelector('.lucide-clock'));
      expect(clockBtn).toBeTruthy();
      // It should NOT be inside the toolbar
      const toolbar = container.querySelector('[data-testid="bottom-toolbar-row"]');
      expect(toolbar!.contains(clockBtn!)).toBe(false);
    });

    it('WebSearchToggle exists in input leftActions when webSearchAvailable', () => {
      mockUseBraveApiKeyQuery.mockReturnValue({ data: { hasKey: true, maskedKey: '' }, isLoading: false, error: null });
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makeToolbarTab() },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      const { container } = render(<ChatView {...defaultProps} tabId={tabId} />);
      // WebSearchToggle should exist somewhere in the DOM
      const wsToggle = container.querySelector('[data-testid="web-search-toggle"]');
      expect(wsToggle).toBeTruthy();
      // It should NOT be inside the desktop toolbar
      const toolbar = container.querySelector('[data-testid="bottom-toolbar-row"]');
      expect(toolbar!.contains(wsToggle!)).toBe(false);
    });

    it('leftActions container does not have md:hidden class', () => {
      useAppStore.setState({
        activeConversationId: 'conv-1',
        tabs: { [tabId]: makeToolbarTab() },
        tabOrder: [tabId],
        activeTabId: tabId,
      });
      const { container } = render(<ChatView {...defaultProps} tabId={tabId} />);
      // Find the Clock button and check its parent container
      const allButtons = container.querySelectorAll('button');
      const clockBtn = Array.from(allButtons).find(b => b.querySelector('.lucide-clock'));
      expect(clockBtn).toBeTruthy();
      // The parent div (leftActions container) should have 'flex' but NOT 'md:hidden'
      const parentDiv = clockBtn!.parentElement;
      expect(parentDiv?.className).toContain('flex');
      expect(parentDiv?.className).not.toContain('md:hidden');
    });
  });
});
