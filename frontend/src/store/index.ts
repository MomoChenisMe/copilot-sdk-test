import { create } from 'zustand';
import type { Message, MessageMetadata, ToolRecord, TurnSegment } from '../lib/api';
import type { ParsedArtifact } from '../lib/artifact-parser';
import { settingsApi } from '../lib/settings-api';

export type { ToolRecord, TurnSegment };

export type Theme = 'light' | 'dark';

export interface ModelInfo {
  id: string;
  name: string;
  premiumMultiplier?: number | null;
}

export interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  contextWindowUsed: number;
  contextWindowMax: number;
  premiumRequestsUsed: number;
  premiumRequestsLocal: number;
  premiumRequestsTotal: number;
  premiumResetDate: string | null;
  premiumUnlimited: boolean;
  model: string | null;
}

export interface UserInputRequest {
  requestId: string;
  question: string;
  choices?: string[];
  allowFreeform?: boolean;
  multiSelect?: boolean;
  timedOut?: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'done' | 'blocked';
  created_at: string;
  updated_at: string;
}

export interface SubagentItem {
  toolCallId: string;
  agentName: string;
  displayName: string;
  status: 'running' | 'completed' | 'failed';
  description?: string;
  error?: string;
}

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
  onClick?: () => void;
}

export interface TabState {
  id: string;
  conversationId: string | null;
  title: string;
  mode: 'copilot' | 'terminal' | 'cron';
  messages: Message[];
  pendingMessages: Message[];
  streamingText: string;
  isStreaming: boolean;
  toolRecords: ToolRecord[];
  reasoningText: string;
  turnContentSegments: string[];
  turnSegments: TurnSegment[];
  copilotError: string | null;
  createdAt: number;
  usage: UsageInfo;
  planMode: boolean;
  showPlanCompletePrompt: boolean;
  planContent: string | null;
  userInputRequest: UserInputRequest | null;
  artifacts: ParsedArtifact[];
  activeArtifactId: string | null;
  artifactsPanelOpen: boolean;
  openspecPanelOpen: boolean;
  tasks: TaskItem[];
  subagents: SubagentItem[];
  cronConfigOpen: boolean;
  webSearchForced: boolean;
  customTitle?: string;
  color?: string;
}

export interface AppState {
  // Theme
  theme: Theme;
  toggleTheme: () => void;
  getInitialTheme: () => Theme;

  // Language
  language: string;
  setLanguage: (lang: string) => void;
  llmLanguage: string | null;
  setLlmLanguage: (lang: string | null) => void;

  // Active conversation (UI state)
  activeConversationId: string | null;

  // Messages for the active conversation
  messages: Message[];

  // Streaming state
  streamingText: string;
  isStreaming: boolean;

  // Tool records (during streaming)
  toolRecords: ToolRecord[];

  // Reasoning (during streaming)
  reasoningText: string;

  // Turn content accumulation
  turnContentSegments: string[];

  // Turn segments (ordered interleaved segments)
  turnSegments: TurnSegment[];

  // Active streams (background streaming)
  activeStreams: Record<string, string>;

  // Settings
  disabledSkills: string[];
  settingsOpen: boolean;

  // Error
  copilotError: string | null;

  // Actions — Active conversation
  setActiveConversationId: (id: string | null) => void;

  // Actions — Messages
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;

  // Actions — Streaming
  setStreamingText: (text: string) => void;
  appendStreamingText: (delta: string) => void;
  setIsStreaming: (streaming: boolean) => void;
  clearStreaming: () => void;

  // Actions — Tool records
  addToolRecord: (record: ToolRecord) => void;
  updateToolRecord: (toolCallId: string, updates: Partial<ToolRecord>) => void;

  // Actions — Reasoning
  appendReasoningText: (delta: string) => void;

  // Actions — Turn content segments
  addTurnContentSegment: (content: string) => void;

  // Actions — Turn segments
  addTurnSegment: (segment: TurnSegment) => void;
  updateToolInTurnSegments: (toolCallId: string, updates: Partial<TurnSegment & { type: 'tool' }>) => void;

  // Actions — Active streams
  setActiveStreams: (streamIds: string[]) => void;
  updateStreamStatus: (conversationId: string, status: string) => void;
  removeStream: (conversationId: string) => void;

  // Model memory
  lastSelectedModel: string | null;
  setLastSelectedModel: (modelId: string) => void;

  // Actions — Settings
  toggleSkill: (name: string) => void;
  batchSetSkillsDisabled: (names: string[], disabled: boolean) => void;
  setSettingsOpen: (open: boolean) => void;

  // Actions — Error
  setCopilotError: (error: string | null) => void;

  // Tab state
  tabs: Record<string, TabState>;
  tabOrder: string[];
  activeTabId: string | null;
  tabLimitWarning: boolean;

  // Actions — Tab management
  openTab: (conversationId: string | null, title: string) => void;
  materializeTabConversation: (tabId: string, conversationId: string) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  reorderTabs: (tabIds: string[]) => void;
  updateTabTitle: (tabId: string, title: string) => void;
  setTabCustomTitle: (tabId: string, customTitle: string | undefined) => void;
  setTabColor: (tabId: string, color: string | undefined) => void;
  switchTabConversation: (tabId: string, conversationId: string, title: string) => void;
  getTabIdByConversationId: (conversationId: string) => string | undefined;
  restoreOpenTabs: () => void;
  restoreDisabledSkills: () => void;

  // Actions — Per-tab streaming
  setTabMessages: (tabId: string, messages: Message[]) => void;
  addTabMessage: (tabId: string, message: Message) => void;
  addPendingMessage: (tabId: string, message: Message) => void;
  clearPendingMessages: (tabId: string) => void;
  appendTabStreamingText: (tabId: string, delta: string) => void;
  setTabIsStreaming: (tabId: string, streaming: boolean) => void;
  clearTabStreaming: (tabId: string) => void;
  addTabToolRecord: (tabId: string, record: ToolRecord) => void;
  updateTabToolRecord: (tabId: string, toolCallId: string, updates: Partial<ToolRecord>) => void;
  appendTabReasoningText: (tabId: string, delta: string) => void;
  addTabTurnContentSegment: (tabId: string, content: string) => void;
  addTabTurnSegment: (tabId: string, segment: TurnSegment) => void;
  updateTabToolInTurnSegments: (tabId: string, toolCallId: string, updates: Partial<ToolRecord>) => void;
  /** Update a tool record inside a DB-loaded message's metadata (for reconnect scenarios) */
  updateMessageToolRecord: (tabId: string, toolCallId: string, updates: Partial<ToolRecord>) => boolean;
  setTabCopilotError: (tabId: string, error: string | null) => void;
  setTabMode: (tabId: string, mode: 'copilot' | 'terminal' | 'cron') => void;

  // Actions — Per-tab usage
  updateTabUsage: (tabId: string, inputTokens: number, outputTokens: number, cacheReadTokens?: number, cacheWriteTokens?: number, model?: string) => void;
  updateTabContextWindow: (tabId: string, contextWindowUsed: number, contextWindowMax: number) => void;
  updateTabQuota: (tabId: string, premiumRequestsUsed: number, premiumRequestsTotal: number, premiumResetDate: string | null, premiumUnlimited?: boolean) => void;
  incrementTabPremiumLocal: (tabId: string) => void;
  setTabPlanMode: (tabId: string, planMode: boolean) => void;
  setTabShowPlanCompletePrompt: (tabId: string, show: boolean) => void;
  setTabPlanContent: (tabId: string, content: string | null) => void;
  setTabUserInputRequest: (tabId: string, request: UserInputRequest | null) => void;
  setTabCronConfigOpen: (tabId: string, open: boolean) => void;
  setTabWebSearchForced: (tabId: string, forced: boolean) => void;

  // Actions — Per-tab tasks
  setTabTasks: (tabId: string, tasks: TaskItem[]) => void;

  // Actions — Per-tab subagents (Fleet Mode)
  addTabSubagent: (tabId: string, subagent: SubagentItem) => void;
  updateTabSubagent: (tabId: string, toolCallId: string, updates: Partial<SubagentItem>) => void;
  clearTabSubagents: (tabId: string) => void;

  // Actions — Per-tab artifacts
  addTabArtifacts: (tabId: string, artifacts: ParsedArtifact[]) => void;
  upsertTabArtifact: (tabId: string, artifact: ParsedArtifact) => void;
  setTabActiveArtifact: (tabId: string, artifactId: string | null) => void;
  setTabArtifactsPanelOpen: (tabId: string, open: boolean) => void;

  // Toast notifications
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;

  // OpenSpec panel (per-tab)
  setTabOpenspecPanelOpen: (tabId: string, open: boolean) => void;

  // Settings cache (synced from backend)
  openspecEnabled: boolean;
  setOpenspecEnabled: (enabled: boolean) => void;
}

const MIGRATION_KEYS = [
  'lastSelectedModel',
  'openTabs',
  'disabledSkills',
] as const;

export function migrateLocalStorageKeys(): void {
  try {
    for (const suffix of MIGRATION_KEYS) {
      const oldKey = `ai-terminal:${suffix}`;
      const newKey = `codeforge:${suffix}`;
      const oldValue = localStorage.getItem(oldKey);
      if (oldValue !== null && localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, oldValue);
      }
      if (oldValue !== null) {
        localStorage.removeItem(oldKey);
      }
    }
  } catch {
    // localStorage may be unavailable — skip silently
  }
}

// Run migration before store creation
migrateLocalStorageKeys();

function readThemeFromStorage(): Theme {
  try {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage may be unavailable
  }
  return 'light';
}

export const useAppStore = create<AppState>((set, get) => ({
  // Theme state
  theme: 'light',
  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('theme', next); } catch { /* noop */ }
    set({ theme: next });
    settingsApi.patch({ theme: next }).catch(() => {});
  },
  getInitialTheme: () => readThemeFromStorage(),

  // Language state
  language: 'en',
  setLanguage: (lang) => {
    try { localStorage.setItem('i18nextLng', lang); } catch { /* noop */ }
    set({ language: lang });
    settingsApi.patch({ language: lang }).catch(() => {});
  },
  llmLanguage: null,
  setLlmLanguage: (lang) => {
    set({ llmLanguage: lang });
    settingsApi.patch({ llmLanguage: lang }).catch(() => {});
  },

  // State
  activeConversationId: null,
  messages: [],
  streamingText: '',
  isStreaming: false,
  toolRecords: [],
  reasoningText: '',
  turnContentSegments: [],
  turnSegments: [],
  activeStreams: {},
  disabledSkills: [],
  settingsOpen: false,
  lastSelectedModel: (() => {
    try { return localStorage.getItem('codeforge:lastSelectedModel'); }
    catch { return null; }
  })(),
  copilotError: null,

  // Active conversation actions
  setActiveConversationId: (id) =>
    set({
      activeConversationId: id,
      messages: [],
      streamingText: '',
      isStreaming: false,
      toolRecords: [],
      reasoningText: '',
      turnContentSegments: [],
      turnSegments: [],
      copilotError: null,
    }),

  // Message actions
  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => {
      if (state.messages.some((m) => m.id === message.id)) return state;
      return { messages: [...state.messages, message] };
    }),

  // Streaming actions
  setStreamingText: (text) => set({ streamingText: text }),

  appendStreamingText: (delta) =>
    set((state) => ({ streamingText: state.streamingText + delta })),

  setIsStreaming: (streaming) => set({ isStreaming: streaming }),

  clearStreaming: () =>
    set({ streamingText: '', isStreaming: false, toolRecords: [], reasoningText: '', turnContentSegments: [], turnSegments: [], copilotError: null }),

  // Tool record actions
  addToolRecord: (record) =>
    set((state) => ({ toolRecords: [...state.toolRecords, record] })),

  updateToolRecord: (toolCallId, updates) =>
    set((state) => ({
      toolRecords: (state.toolRecords ?? []).map((r) =>
        r.toolCallId === toolCallId ? { ...r, ...updates } : r,
      ),
    })),

  // Reasoning actions
  appendReasoningText: (delta) =>
    set((state) => ({ reasoningText: state.reasoningText + delta })),

  // Turn content segment actions
  addTurnContentSegment: (content) =>
    set((state) => ({ turnContentSegments: [...state.turnContentSegments, content] })),

  // Turn segment actions
  addTurnSegment: (segment) =>
    set((state) => ({ turnSegments: [...state.turnSegments, segment] })),

  updateToolInTurnSegments: (toolCallId, updates) =>
    set((state) => ({
      turnSegments: state.turnSegments.map((s) =>
        s.type === 'tool' && s.toolCallId === toolCallId ? { ...s, ...updates } : s,
      ),
    })),

  // Active streams actions
  setActiveStreams: (streamIds) =>
    set({
      activeStreams: Object.fromEntries(streamIds.map((id) => [id, 'running'])),
    }),

  updateStreamStatus: (conversationId, status) =>
    set((state) => ({
      activeStreams: { ...state.activeStreams, [conversationId]: status },
    })),

  removeStream: (conversationId) =>
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [conversationId]: _, ...rest } = state.activeStreams;
      return { activeStreams: rest };
    }),

  // Settings actions
  toggleSkill: (name) => {
    const current = get().disabledSkills;
    const next = current.includes(name)
      ? current.filter((s) => s !== name)
      : [...current, name];
    try { localStorage.setItem('codeforge:disabledSkills', JSON.stringify(next)); } catch { /* noop */ }
    set({ disabledSkills: next });
    settingsApi.patch({ disabledSkills: next }).catch(() => {});
  },

  batchSetSkillsDisabled: (names, disabled) => {
    const current = get().disabledSkills;
    let next: string[];
    if (disabled) {
      next = [...new Set([...current, ...names])];
    } else {
      const nameSet = new Set(names);
      next = current.filter((s) => !nameSet.has(s));
    }
    try { localStorage.setItem('codeforge:disabledSkills', JSON.stringify(next)); } catch { /* noop */ }
    set({ disabledSkills: next });
    settingsApi.patch({ disabledSkills: next }).catch(() => {});
  },

  setSettingsOpen: (open) => set({ settingsOpen: open }),

  // Model memory
  setLastSelectedModel: (modelId) => {
    try { localStorage.setItem('codeforge:lastSelectedModel', modelId); } catch { /* noop */ }
    set({ lastSelectedModel: modelId });
    settingsApi.patch({ lastSelectedModel: modelId }).catch(() => {});
  },

  // Error actions
  setCopilotError: (error) => set({ copilotError: error }),

  // Tab state
  tabs: {},
  tabOrder: [],
  activeTabId: null,
  tabLimitWarning: false,

  // Tab management actions
  openTab: (conversationId, title) => {
    const state = get();
    // If conversationId is provided and a tab already has it, just activate it
    if (conversationId !== null) {
      const existingTabId = Object.keys(state.tabs).find(
        (id) => state.tabs[id].conversationId === conversationId,
      );
      if (existingTabId) {
        set({ activeTabId: existingTabId });
        return;
      }
    }
    const tabId = crypto.randomUUID();
    // Restore ephemeral state if this conversation was previously open
    const ephemeral = conversationId ? loadConversationEphemeral(conversationId) : null;
    const tab: TabState = {
      id: tabId,
      conversationId,
      title,
      mode: 'copilot',
      messages: [],
      pendingMessages: [],
      streamingText: '',
      isStreaming: false,
      toolRecords: [],
      reasoningText: '',
      turnContentSegments: [],
      turnSegments: [],
      copilotError: null,
      createdAt: Date.now(),
      usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, contextWindowUsed: 0, contextWindowMax: 0, premiumRequestsUsed: 0, premiumRequestsLocal: 0, premiumRequestsTotal: 0, premiumResetDate: null, premiumUnlimited: false, model: null },
      planMode: ephemeral?.planMode ?? false,
      showPlanCompletePrompt: ephemeral?.showPlanCompletePrompt ?? false,
      planContent: ephemeral?.planContent ?? null,
      userInputRequest: ephemeral?.userInputRequest ?? null,
      artifacts: ephemeral?.artifacts ?? [],
      activeArtifactId: ephemeral?.activeArtifactId ?? null,
      artifactsPanelOpen: ephemeral?.artifactsPanelOpen ?? false,
      openspecPanelOpen: false,
      tasks: [],
      subagents: [],
      cronConfigOpen: false,
      webSearchForced: false,
    };
    const newTabs = { ...state.tabs, [tabId]: tab };
    const newOrder = [...state.tabOrder, tabId];
    set({ tabs: newTabs, tabOrder: newOrder, activeTabId: tabId, tabLimitWarning: newOrder.length >= 15 });
    persistOpenTabs(newTabs, newOrder);
  },

  materializeTabConversation: (tabId, conversationId) => {
    const state = get();
    const tab = state.tabs[tabId];
    if (!tab) return;
    const newTabs = { ...state.tabs, [tabId]: { ...tab, conversationId } };
    set({ tabs: newTabs });
    persistOpenTabs(newTabs, state.tabOrder);
  },

  closeTab: (tabId) => {
    const state = get();
    // Save ephemeral state before removing (for restore on reopen)
    const closingTab = state.tabs[tabId];
    if (closingTab?.conversationId) {
      saveConversationEphemeral(closingTab.conversationId, closingTab);
    }
    const { [tabId]: _, ...restTabs } = state.tabs;
    const newOrder = state.tabOrder.filter((id) => id !== tabId);
    let nextActiveId = state.activeTabId;
    if (state.activeTabId === tabId) {
      const idx = state.tabOrder.indexOf(tabId);
      nextActiveId = newOrder[Math.min(idx, newOrder.length - 1)] ?? null;
    }
    set({ tabs: restTabs, tabOrder: newOrder, activeTabId: nextActiveId, tabLimitWarning: newOrder.length >= 15 });
    persistOpenTabs(restTabs, newOrder);
  },

  setActiveTab: (tabId) => {
    set({ activeTabId: tabId });
    const state = get();
    persistOpenTabs(state.tabs, state.tabOrder);
  },

  reorderTabs: (tabIds) => {
    set({ tabOrder: tabIds });
    persistOpenTabs(get().tabs, tabIds);
  },

  updateTabTitle: (tabId, title) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return { tabs: { ...state.tabs, [tabId]: { ...tab, title } } };
    }),

  setTabCustomTitle: (tabId, customTitle) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return { tabs: { ...state.tabs, [tabId]: { ...tab, customTitle } } };
    }),

  setTabColor: (tabId, color) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return { tabs: { ...state.tabs, [tabId]: { ...tab, color } } };
    }),

  switchTabConversation: (tabId, conversationId, title) => {
    const state = get();
    const tab = state.tabs[tabId];
    if (!tab) return;
    // Save ephemeral state of the old conversation before switching
    if (tab.conversationId) {
      saveConversationEphemeral(tab.conversationId, tab);
    }
    // Restore ephemeral state for the new conversation
    const ephemeral = loadConversationEphemeral(conversationId);
    const updatedTab: TabState = {
      ...tab,
      conversationId,
      title,
      mode: 'copilot',
      messages: [],
      pendingMessages: [],
      streamingText: '',
      isStreaming: false,
      toolRecords: [],
      reasoningText: '',
      turnContentSegments: [],
      turnSegments: [],
      copilotError: null,
      usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, contextWindowUsed: 0, contextWindowMax: 0, premiumRequestsUsed: 0, premiumRequestsLocal: 0, premiumRequestsTotal: 0, premiumResetDate: null, premiumUnlimited: false, model: null },
      planMode: ephemeral?.planMode ?? false,
      showPlanCompletePrompt: ephemeral?.showPlanCompletePrompt ?? false,
      planContent: ephemeral?.planContent ?? null,
      userInputRequest: ephemeral?.userInputRequest ?? null,
      artifacts: ephemeral?.artifacts ?? [],
      activeArtifactId: ephemeral?.activeArtifactId ?? null,
      artifactsPanelOpen: ephemeral?.artifactsPanelOpen ?? false,
      openspecPanelOpen: false,
      tasks: [],
      subagents: [],
      cronConfigOpen: false,
      webSearchForced: false,
    };
    const newTabs = { ...state.tabs, [tabId]: updatedTab };
    set({ tabs: newTabs });
    persistOpenTabs(newTabs, state.tabOrder);
  },

  getTabIdByConversationId: (conversationId) => {
    const tabs = get().tabs;
    return Object.keys(tabs).find((id) => tabs[id].conversationId === conversationId);
  },

  restoreOpenTabs: () => {
    try {
      const raw = localStorage.getItem('codeforge:openTabs');
      if (!raw) return;
      const parsed = JSON.parse(raw);

      // Detect format: new = { tabs: [...], activeTabId }, old = [...]
      let savedTabs: Array<{ id: string; title: string; conversationId?: string }>;
      let savedActiveTabId: string | null = null;
      if (Array.isArray(parsed)) {
        // Old format (plain array)
        savedTabs = parsed;
      } else if (parsed && Array.isArray(parsed.tabs)) {
        // New format (object with tabs + activeTabId)
        savedTabs = parsed.tabs;
        savedActiveTabId = parsed.activeTabId ?? null;
      } else {
        return;
      }

      if (savedTabs.length === 0) return;
      const tabs: Record<string, TabState> = {};
      const tabOrder: string[] = [];
      for (const item of savedTabs) {
        // Old format migration: if no conversationId, id was the conversationId
        const isOldFormat = !item.conversationId;
        const tabId = isOldFormat ? crypto.randomUUID() : item.id;
        const conversationId = item.conversationId ?? item.id;
        // Restore persisted ephemeral state (artifacts, ask_user, plan mode) — fallback to defaults for old format
        const ext = item as Record<string, unknown>;
        tabs[tabId] = {
          id: tabId,
          conversationId,
          title: item.title,
          mode: 'copilot',
          messages: [],
          pendingMessages: [],
          streamingText: '',
          isStreaming: false,
          toolRecords: [],
          reasoningText: '',
          turnContentSegments: [],
          turnSegments: [],
          copilotError: null,
          createdAt: Date.now(),
          usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, contextWindowUsed: 0, contextWindowMax: 0, premiumRequestsUsed: 0, premiumRequestsLocal: 0, premiumRequestsTotal: 0, premiumResetDate: null, premiumUnlimited: false, model: null },
          planMode: (ext.planMode as boolean) ?? false,
          showPlanCompletePrompt: (ext.showPlanCompletePrompt as boolean) ?? false,
          planContent: (ext.planContent as string | null) ?? null,
          userInputRequest: (ext.userInputRequest as UserInputRequest | null) ?? null,
          artifacts: (Array.isArray(ext.artifacts) ? ext.artifacts : []) as ParsedArtifact[],
          activeArtifactId: (ext.activeArtifactId as string | null) ?? null,
          artifactsPanelOpen: (ext.artifactsPanelOpen as boolean) ?? false,
          openspecPanelOpen: false,
          cronConfigOpen: false,
          webSearchForced: false,
          tasks: [],
          subagents: [],
        };
        tabOrder.push(tabId);
      }
      // Restore activeTabId: use saved value if it exists in restored tabs, otherwise fallback to first
      const activeTabId = (savedActiveTabId && tabOrder.includes(savedActiveTabId))
        ? savedActiveTabId
        : (tabOrder[0] ?? null);
      set({ tabs, tabOrder, activeTabId, tabLimitWarning: tabOrder.length >= 15 });
    } catch { /* noop — invalid JSON or localStorage unavailable */ }
  },

  restoreDisabledSkills: () => {
    try {
      const raw = localStorage.getItem('codeforge:disabledSkills');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        set({ disabledSkills: parsed });
      }
    } catch { /* noop */ }
  },

  // Per-tab streaming actions
  setTabMessages: (tabId, messages) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      // Fix stale "running" tool records in historical messages:
      // If a message is followed by another message, any "running" tools
      // in it must have completed (the conversation continued past them).
      // This handles the case where ask_user tools are persisted with
      // status "running" (before tool_end fires) and never updated.
      const fixed = messages.map((msg, i) => {
        const meta = msg.metadata as MessageMetadata | null;
        if (msg.role !== 'assistant' || !meta?.toolRecords) return msg;
        const hasNext = i < messages.length - 1;
        if (!hasNext) return msg;
        const hasRunning = meta.toolRecords.some(
          (r) => r.status === 'running',
        );
        if (!hasRunning) return msg;
        return {
          ...msg,
          metadata: {
            ...meta,
            toolRecords: meta.toolRecords.map((r) =>
              r.status === 'running' ? { ...r, status: 'success' as const } : r,
            ),
            ...(meta.turnSegments
              ? {
                  turnSegments: meta.turnSegments.map((s) =>
                    s.type === 'tool' && s.status === 'running'
                      ? { ...s, status: 'success' as const }
                      : s,
                  ),
                }
              : {}),
          },
        };
      });
      return { tabs: { ...state.tabs, [tabId]: { ...tab, messages: fixed } } };
    }),

  addTabMessage: (tabId, message) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      if (tab.messages.some((m) => m.id === message.id)) return state;
      return { tabs: { ...state.tabs, [tabId]: { ...tab, messages: [...tab.messages, message] } } };
    }),

  addPendingMessage: (tabId, message) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      if (tab.pendingMessages.some((m) => m.id === message.id)) return state;
      return { tabs: { ...state.tabs, [tabId]: { ...tab, pendingMessages: [...tab.pendingMessages, message] } } };
    }),

  clearPendingMessages: (tabId) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return { tabs: { ...state.tabs, [tabId]: { ...tab, pendingMessages: [] } } };
    }),

  appendTabStreamingText: (tabId, delta) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return { tabs: { ...state.tabs, [tabId]: { ...tab, streamingText: tab.streamingText + delta } } };
    }),

  setTabIsStreaming: (tabId, streaming) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return { tabs: { ...state.tabs, [tabId]: { ...tab, isStreaming: streaming } } };
    }),

  clearTabStreaming: (tabId) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: {
            ...tab,
            streamingText: '',
            isStreaming: false,
            toolRecords: [],
            reasoningText: '',
            turnContentSegments: [],
            turnSegments: [],
            copilotError: null,
          },
        },
      };
    }),

  addTabToolRecord: (tabId, record) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return { tabs: { ...state.tabs, [tabId]: { ...tab, toolRecords: [...(tab.toolRecords ?? []), record] } } };
    }),

  updateTabToolRecord: (tabId, toolCallId, updates) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: {
            ...tab,
            toolRecords: (tab.toolRecords ?? []).map((r) =>
              r.toolCallId === toolCallId ? { ...r, ...updates } : r,
            ),
          },
        },
      };
    }),

  appendTabReasoningText: (tabId, delta) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return { tabs: { ...state.tabs, [tabId]: { ...tab, reasoningText: tab.reasoningText + delta } } };
    }),

  addTabTurnContentSegment: (tabId, content) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return { tabs: { ...state.tabs, [tabId]: { ...tab, turnContentSegments: [...tab.turnContentSegments, content] } } };
    }),

  addTabTurnSegment: (tabId, segment) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return { tabs: { ...state.tabs, [tabId]: { ...tab, turnSegments: [...tab.turnSegments, segment] } } };
    }),

  updateTabToolInTurnSegments: (tabId, toolCallId, updates) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: {
            ...tab,
            turnSegments: tab.turnSegments.map((s) =>
              s.type === 'tool' && s.toolCallId === toolCallId ? { ...s, ...updates } : s,
            ),
          },
        },
      };
    }),

  updateMessageToolRecord: (tabId, toolCallId, updates) => {
    const tab = get().tabs[tabId];
    if (!tab) return false;
    // Search messages in reverse to find the tool in the most recent message first
    for (let i = tab.messages.length - 1; i >= 0; i--) {
      const msg = tab.messages[i];
      const meta = msg.metadata as MessageMetadata | null;
      if (msg.role !== 'assistant' || !meta?.toolRecords) continue;
      const idx = meta.toolRecords.findIndex((r) => r.toolCallId === toolCallId);
      if (idx === -1) continue;
      // Found the tool in a DB-loaded message — update it
      const updatedRecords = meta.toolRecords.map((r) =>
        r.toolCallId === toolCallId ? { ...r, ...updates } : r,
      );
      const updatedSegments = meta.turnSegments
        ? meta.turnSegments.map((s) =>
            s.type === 'tool' && s.toolCallId === toolCallId ? { ...s, ...updates } : s,
          )
        : undefined;
      const updatedMessages = [...tab.messages];
      updatedMessages[i] = {
        ...msg,
        metadata: {
          ...meta,
          toolRecords: updatedRecords,
          ...(updatedSegments ? { turnSegments: updatedSegments } : {}),
        },
      };
      set((state) => ({
        tabs: { ...state.tabs, [tabId]: { ...state.tabs[tabId], messages: updatedMessages } },
      }));
      return true;
    }
    return false;
  },

  setTabCopilotError: (tabId, error) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return { tabs: { ...state.tabs, [tabId]: { ...tab, copilotError: error } } };
    }),

  setTabMode: (tabId, mode) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return { tabs: { ...state.tabs, [tabId]: { ...tab, mode } } };
    }),

  // Usage tracking actions
  updateTabUsage: (tabId, inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens, model) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      const updatedUsage = {
        ...tab.usage,
        inputTokens: tab.usage.inputTokens + inputTokens,
        outputTokens: tab.usage.outputTokens + outputTokens,
      };
      if (cacheReadTokens != null) updatedUsage.cacheReadTokens = tab.usage.cacheReadTokens + cacheReadTokens;
      if (cacheWriteTokens != null) updatedUsage.cacheWriteTokens = tab.usage.cacheWriteTokens + cacheWriteTokens;
      if (model != null) updatedUsage.model = model;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, usage: updatedUsage },
        },
      };
    }),

  updateTabContextWindow: (tabId, contextWindowUsed, contextWindowMax) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: {
            ...tab,
            usage: {
              ...tab.usage,
              contextWindowUsed,
              contextWindowMax,
            },
          },
        },
      };
    }),

  updateTabQuota: (tabId, premiumRequestsUsed, premiumRequestsTotal, premiumResetDate, premiumUnlimited) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: {
            ...tab,
            usage: {
              ...tab.usage,
              premiumRequestsUsed,
              premiumRequestsTotal,
              premiumResetDate,
              ...(premiumUnlimited != null && { premiumUnlimited }),
            },
          },
        },
      };
    }),

  incrementTabPremiumLocal: (tabId) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: {
            ...tab,
            usage: {
              ...tab.usage,
              premiumRequestsLocal: tab.usage.premiumRequestsLocal + 1,
            },
          },
        },
      };
    }),

  setTabPlanMode: (tabId, planMode) => {
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, planMode, showPlanCompletePrompt: false },
        },
      };
    });
    const s = get();
    persistOpenTabs(s.tabs, s.tabOrder);
  },

  setTabShowPlanCompletePrompt: (tabId: string, show: boolean) => {
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, showPlanCompletePrompt: show },
        },
      };
    });
    const s = get();
    persistOpenTabs(s.tabs, s.tabOrder);
  },

  setTabPlanContent: (tabId: string, content: string | null) => {
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, planContent: content },
        },
      };
    });
    const s = get();
    persistOpenTabs(s.tabs, s.tabOrder);
  },

  setTabUserInputRequest: (tabId, request) => {
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, userInputRequest: request },
        },
      };
    });
    const s = get();
    persistOpenTabs(s.tabs, s.tabOrder);
  },

  setTabCronConfigOpen: (tabId, open) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, cronConfigOpen: open },
        },
      };
    }),

  setTabWebSearchForced: (tabId, forced) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, webSearchForced: forced },
        },
      };
    }),

  // Artifacts actions
  addTabArtifacts: (tabId, artifacts) => {
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      // Merge new artifacts, avoid duplicates by id AND by title+type
      const existingIds = new Set(tab.artifacts.map((a) => a.id));
      const existingKeys = new Set(tab.artifacts.map((a) => `${a.type}|${a.title}`));
      const newOnes = artifacts.filter(
        (a) => !existingIds.has(a.id) && !existingKeys.has(`${a.type}|${a.title}`),
      );
      if (newOnes.length === 0) return state;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, artifacts: [...tab.artifacts, ...newOnes] },
        },
      };
    });
    const s = get();
    persistOpenTabs(s.tabs, s.tabOrder);
  },

  upsertTabArtifact: (tabId, artifact) => {
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      const idx = tab.artifacts.findIndex((a) => a.id === artifact.id);
      if (idx >= 0) {
        // Replace existing artifact in-place
        const updated = [...tab.artifacts];
        updated[idx] = artifact;
        return { tabs: { ...state.tabs, [tabId]: { ...tab, artifacts: updated } } };
      }
      // New artifact — append
      return { tabs: { ...state.tabs, [tabId]: { ...tab, artifacts: [...tab.artifacts, artifact] } } };
    });
    const s = get();
    persistOpenTabs(s.tabs, s.tabOrder);
  },

  setTabActiveArtifact: (tabId, artifactId) => {
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, activeArtifactId: artifactId },
        },
      };
    });
    const s = get();
    persistOpenTabs(s.tabs, s.tabOrder);
  },

  setTabArtifactsPanelOpen: (tabId, open) => {
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: {
          ...state.tabs,
          // Mutual exclusion: close OpenSpec panel when opening ArtifactsPanel
          [tabId]: { ...tab, artifactsPanelOpen: open, ...(open ? { openspecPanelOpen: false } : {}) },
        },
      };
    });
    const s = get();
    persistOpenTabs(s.tabs, s.tabOrder);
  },

  // Tasks actions
  setTabTasks: (tabId, tasks) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return { tabs: { ...state.tabs, [tabId]: { ...tab, tasks } } };
    }),

  // Subagent actions (Fleet Mode)
  addTabSubagent: (tabId, subagent) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return { tabs: { ...state.tabs, [tabId]: { ...tab, subagents: [...tab.subagents, subagent] } } };
    }),
  updateTabSubagent: (tabId, toolCallId, updates) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: {
            ...tab,
            subagents: tab.subagents.map((s) =>
              s.toolCallId === toolCallId ? { ...s, ...updates } : s,
            ),
          },
        },
      };
    }),
  clearTabSubagents: (tabId) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return { tabs: { ...state.tabs, [tabId]: { ...tab, subagents: [] } } };
    }),

  // Toast notifications
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: `toast-${Date.now()}-${Math.random().toString(36).slice(2)}` }],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  // OpenSpec panel (per-tab)
  setTabOpenspecPanelOpen: (tabId, open) => {
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: {
          ...state.tabs,
          // Mutual exclusion: close ArtifactsPanel when opening OpenSpec
          [tabId]: { ...tab, openspecPanelOpen: open, ...(open ? { artifactsPanelOpen: false } : {}) },
        },
      };
    });
    const s = get();
    persistOpenTabs(s.tabs, s.tabOrder);
  },

  // OpenSpec enabled
  openspecEnabled: false,
  setOpenspecEnabled: (enabled) => set({ openspecEnabled: enabled }),
}));

/**
 * Save a tab's ephemeral UI state to a per-conversation localStorage key.
 * Called when closing a tab so the state can be restored if the same
 * conversation is reopened later (Scenarios 1, 3, 4 fix).
 */
function saveConversationEphemeral(conversationId: string, tab: TabState) {
  try {
    const data = {
      userInputRequest: tab.userInputRequest,
      artifacts: tab.artifacts,
      activeArtifactId: tab.activeArtifactId,
      artifactsPanelOpen: tab.artifactsPanelOpen,
      planMode: tab.planMode,
      showPlanCompletePrompt: tab.showPlanCompletePrompt,
      planContent: tab.planContent,
      savedAt: Date.now(),
    };
    localStorage.setItem(`codeforge:ephemeral:${conversationId}`, JSON.stringify(data));
  } catch { /* noop */ }
}

/**
 * Load and consume (one-time) ephemeral state for a conversation.
 * Returns null if no cache exists or it has expired (>24h).
 */
function loadConversationEphemeral(conversationId: string): {
  userInputRequest: UserInputRequest | null;
  artifacts: ParsedArtifact[];
  activeArtifactId: string | null;
  artifactsPanelOpen: boolean;
  planMode: boolean;
  showPlanCompletePrompt: boolean;
  planContent: string | null;
} | null {
  try {
    const key = `codeforge:ephemeral:${conversationId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Expire after 24 hours to avoid stale state
    if (data.savedAt && Date.now() - data.savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(key);
      return null;
    }
    // Consume: remove after loading so it's not re-applied on next open
    localStorage.removeItem(key);
    return data;
  } catch { return null; }
}

function persistOpenTabs(tabs: Record<string, TabState>, tabOrder: string[]) {
  try {
    // Exclude draft tabs (null conversationId) from persistence
    const activeTabs = tabOrder.filter((id) => tabs[id]?.conversationId !== null);
    // Minimal data for backend API
    const tabsData = activeTabs.map((id) => ({ id: tabs[id].id, title: tabs[id].title, conversationId: tabs[id].conversationId }));
    // Extended data for localStorage — includes ephemeral UI state (artifacts, ask_user, plan mode)
    const tabsExtended = activeTabs.map((id) => {
      const t = tabs[id];
      return {
        id: t.id, title: t.title, conversationId: t.conversationId,
        artifacts: t.artifacts, activeArtifactId: t.activeArtifactId, artifactsPanelOpen: t.artifactsPanelOpen,
        userInputRequest: t.userInputRequest,
        planMode: t.planMode, showPlanCompletePrompt: t.showPlanCompletePrompt, planContent: t.planContent,
      };
    });
    const activeTabId = useAppStore.getState().activeTabId;
    const payload = { tabs: tabsExtended, activeTabId };
    localStorage.setItem('codeforge:openTabs', JSON.stringify(payload));
    settingsApi.patch({ openTabs: tabsData, activeTabId }).catch(() => {});
  } catch { /* noop */ }
}
