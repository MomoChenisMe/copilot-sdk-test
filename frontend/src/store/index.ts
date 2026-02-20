import { create } from 'zustand';
import type { Conversation, Message, ToolRecord, TurnSegment } from '../lib/api';
import type { SkillItem } from '../lib/prompts-api';
import type { ParsedArtifact } from '../lib/artifact-parser';

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
  subject: string;
  description: string;
  activeForm: string;
  status: 'pending' | 'in_progress' | 'completed';
  owner?: string;
  blockedBy: string[];
}

export interface TabState {
  id: string;
  conversationId: string | null;
  title: string;
  mode: 'copilot' | 'terminal';
  messages: Message[];
  streamingText: string;
  isStreaming: boolean;
  toolRecords: ToolRecord[];
  reasoningText: string;
  turnContentSegments: string[];
  turnSegments: TurnSegment[];
  copilotError: string | null;
  messagesLoaded: boolean;
  createdAt: number;
  usage: UsageInfo;
  planMode: boolean;
  showPlanCompletePrompt: boolean;
  planFilePath: string | null;
  userInputRequest: UserInputRequest | null;
  artifacts: ParsedArtifact[];
  activeArtifactId: string | null;
  artifactsPanelOpen: boolean;
  tasks: TaskItem[];
}

export interface AppState {
  // Theme
  theme: Theme;
  toggleTheme: () => void;
  getInitialTheme: () => Theme;

  // Language
  language: string;
  setLanguage: (lang: string) => void;

  // Models
  models: ModelInfo[];
  modelsLoading: boolean;
  modelsError: string | null;
  modelsLastFetched: number;
  setModels: (models: ModelInfo[]) => void;
  setModelsLoading: (loading: boolean) => void;
  setModelsError: (error: string | null) => void;
  setModelsLastFetched: (ts: number) => void;

  // Conversations
  conversations: Conversation[];
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

  // Skills cache
  skills: SkillItem[];
  skillsLoaded: boolean;

  // SDK commands cache
  sdkCommands: Array<{ name: string; description: string }>;
  sdkCommandsLoaded: boolean;

  // Settings
  activePresets: string[];
  disabledSkills: string[];
  settingsOpen: boolean;

  // Error
  copilotError: string | null;

  // Actions — Conversations
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversationId: (id: string | null) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  removeConversation: (id: string) => void;

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

  // Actions — Skills
  setSkills: (skills: SkillItem[]) => void;
  setSkillsLoaded: (loaded: boolean) => void;

  // Actions — SDK commands
  setSdkCommands: (commands: Array<{ name: string; description: string }>) => void;
  setSdkCommandsLoaded: (loaded: boolean) => void;

  // Actions — Settings
  togglePreset: (name: string) => void;
  removePreset: (name: string) => void;
  toggleSkill: (name: string) => void;
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
  switchTabConversation: (tabId: string, conversationId: string, title: string) => void;
  getTabIdByConversationId: (conversationId: string) => string | undefined;
  restoreOpenTabs: () => void;
  restoreDisabledSkills: () => void;

  // Actions — Per-tab streaming
  setTabMessages: (tabId: string, messages: Message[]) => void;
  addTabMessage: (tabId: string, message: Message) => void;
  appendTabStreamingText: (tabId: string, delta: string) => void;
  setTabIsStreaming: (tabId: string, streaming: boolean) => void;
  clearTabStreaming: (tabId: string) => void;
  addTabToolRecord: (tabId: string, record: ToolRecord) => void;
  updateTabToolRecord: (tabId: string, toolCallId: string, updates: Partial<ToolRecord>) => void;
  appendTabReasoningText: (tabId: string, delta: string) => void;
  addTabTurnContentSegment: (tabId: string, content: string) => void;
  addTabTurnSegment: (tabId: string, segment: TurnSegment) => void;
  updateTabToolInTurnSegments: (tabId: string, toolCallId: string, updates: Partial<ToolRecord>) => void;
  setTabCopilotError: (tabId: string, error: string | null) => void;
  setTabMode: (tabId: string, mode: 'copilot' | 'terminal') => void;

  // Actions — Per-tab usage
  updateTabUsage: (tabId: string, inputTokens: number, outputTokens: number, cacheReadTokens?: number, cacheWriteTokens?: number, model?: string) => void;
  updateTabContextWindow: (tabId: string, contextWindowUsed: number, contextWindowMax: number) => void;
  updateTabQuota: (tabId: string, premiumRequestsUsed: number, premiumRequestsTotal: number, premiumResetDate: string | null, premiumUnlimited?: boolean) => void;
  incrementTabPremiumLocal: (tabId: string) => void;
  setTabPlanMode: (tabId: string, planMode: boolean) => void;
  setTabShowPlanCompletePrompt: (tabId: string, show: boolean) => void;
  setTabPlanFilePath: (tabId: string, path: string | null) => void;
  setTabUserInputRequest: (tabId: string, request: UserInputRequest | null) => void;

  // Actions — Per-tab tasks
  setTabTasks: (tabId: string, tasks: TaskItem[]) => void;
  upsertTabTask: (tabId: string, task: TaskItem) => void;

  // Actions — Per-tab artifacts
  addTabArtifacts: (tabId: string, artifacts: ParsedArtifact[]) => void;
  setTabActiveArtifact: (tabId: string, artifactId: string | null) => void;
  setTabArtifactsPanelOpen: (tabId: string, open: boolean) => void;
}

const MIGRATION_KEYS = [
  'lastSelectedModel',
  'openTabs',
  'activePresets',
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
  },
  getInitialTheme: () => readThemeFromStorage(),

  // Language state
  language: 'en',
  setLanguage: (lang) => {
    try { localStorage.setItem('i18nextLng', lang); } catch { /* noop */ }
    set({ language: lang });
  },

  // Models state
  models: [],
  modelsLoading: false,
  modelsError: null,
  modelsLastFetched: 0,
  setModels: (models) => set({ models }),
  setModelsLoading: (loading) => set({ modelsLoading: loading }),
  setModelsError: (error) => set({ modelsError: error }),
  setModelsLastFetched: (ts) => set({ modelsLastFetched: ts }),

  // State
  conversations: [],
  activeConversationId: null,
  messages: [],
  streamingText: '',
  isStreaming: false,
  toolRecords: [],
  reasoningText: '',
  turnContentSegments: [],
  turnSegments: [],
  activeStreams: {},
  skills: [],
  skillsLoaded: false,
  sdkCommands: [],
  sdkCommandsLoaded: false,
  activePresets: [],
  disabledSkills: [],
  settingsOpen: false,
  lastSelectedModel: (() => {
    try { return localStorage.getItem('codeforge:lastSelectedModel'); }
    catch { return null; }
  })(),
  copilotError: null,

  // Conversation actions
  setConversations: (conversations) => set({ conversations }),

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

  addConversation: (conversation) =>
    set((state) => ({ conversations: [conversation, ...state.conversations] })),

  updateConversation: (id, updates) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      ),
    })),

  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      activeConversationId:
        state.activeConversationId === id ? null : state.activeConversationId,
      messages: state.activeConversationId === id ? [] : state.messages,
    })),

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
      toolRecords: state.toolRecords.map((r) =>
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

  // Skills actions
  setSkills: (skills) => set({ skills }),
  setSkillsLoaded: (loaded) => set({ skillsLoaded: loaded }),

  // SDK commands actions
  setSdkCommands: (commands) => set({ sdkCommands: commands }),
  setSdkCommandsLoaded: (loaded) => set({ sdkCommandsLoaded: loaded }),

  // Settings actions
  togglePreset: (name) => {
    const current = get().activePresets;
    const next = current.includes(name)
      ? current.filter((p) => p !== name)
      : [...current, name];
    try { localStorage.setItem('codeforge:activePresets', JSON.stringify(next)); } catch { /* noop */ }
    set({ activePresets: next });
  },

  removePreset: (name) => {
    const next = get().activePresets.filter((p) => p !== name);
    try { localStorage.setItem('codeforge:activePresets', JSON.stringify(next)); } catch { /* noop */ }
    set({ activePresets: next });
  },

  toggleSkill: (name) => {
    const current = get().disabledSkills;
    const next = current.includes(name)
      ? current.filter((s) => s !== name)
      : [...current, name];
    try { localStorage.setItem('codeforge:disabledSkills', JSON.stringify(next)); } catch { /* noop */ }
    set({ disabledSkills: next });
  },

  setSettingsOpen: (open) => set({ settingsOpen: open }),

  // Model memory
  setLastSelectedModel: (modelId) => {
    try { localStorage.setItem('codeforge:lastSelectedModel', modelId); } catch { /* noop */ }
    set({ lastSelectedModel: modelId });
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
    const tab: TabState = {
      id: tabId,
      conversationId,
      title,
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
      usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, contextWindowUsed: 0, contextWindowMax: 0, premiumRequestsUsed: 0, premiumRequestsLocal: 0, premiumRequestsTotal: 0, premiumResetDate: null, premiumUnlimited: false, model: null },
      planMode: false,
      showPlanCompletePrompt: false,
      planFilePath: null,
      userInputRequest: null,
      artifacts: [],
      activeArtifactId: null,
      artifactsPanelOpen: false,
      tasks: [],
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
    const newTabs = { ...state.tabs, [tabId]: { ...tab, conversationId, messagesLoaded: true } };
    set({ tabs: newTabs });
    persistOpenTabs(newTabs, state.tabOrder);
  },

  closeTab: (tabId) => {
    const state = get();
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

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

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

  switchTabConversation: (tabId, conversationId, title) => {
    const state = get();
    const tab = state.tabs[tabId];
    if (!tab) return;
    const updatedTab: TabState = {
      ...tab,
      conversationId,
      title,
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
      usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, contextWindowUsed: 0, contextWindowMax: 0, premiumRequestsUsed: 0, premiumRequestsLocal: 0, premiumRequestsTotal: 0, premiumResetDate: null, premiumUnlimited: false, model: null },
      planMode: false,
      showPlanCompletePrompt: false,
      planFilePath: null,
      userInputRequest: null,
      artifacts: [],
      activeArtifactId: null,
      artifactsPanelOpen: false,
      tasks: [],
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
      const saved = JSON.parse(raw) as Array<{ id: string; title: string; conversationId?: string }>;
      if (!Array.isArray(saved) || saved.length === 0) return;
      const tabs: Record<string, TabState> = {};
      const tabOrder: string[] = [];
      for (const item of saved) {
        // Old format migration: if no conversationId, id was the conversationId
        const isOldFormat = !item.conversationId;
        const tabId = isOldFormat ? crypto.randomUUID() : item.id;
        const conversationId = item.conversationId ?? item.id;
        tabs[tabId] = {
          id: tabId,
          conversationId,
          title: item.title,
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
          usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, contextWindowUsed: 0, contextWindowMax: 0, premiumRequestsUsed: 0, premiumRequestsLocal: 0, premiumRequestsTotal: 0, premiumResetDate: null, premiumUnlimited: false, model: null },
          planMode: false,
          showPlanCompletePrompt: false,
          planFilePath: null,
          userInputRequest: null,
          artifacts: [],
          activeArtifactId: null,
          artifactsPanelOpen: false,
          tasks: [],
        };
        tabOrder.push(tabId);
      }
      set({ tabs, tabOrder, activeTabId: tabOrder[0] ?? null, tabLimitWarning: tabOrder.length >= 15 });
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
      return { tabs: { ...state.tabs, [tabId]: { ...tab, messages, messagesLoaded: true } } };
    }),

  addTabMessage: (tabId, message) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      if (tab.messages.some((m) => m.id === message.id)) return state;
      return { tabs: { ...state.tabs, [tabId]: { ...tab, messages: [...tab.messages, message] } } };
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
      return { tabs: { ...state.tabs, [tabId]: { ...tab, toolRecords: [...tab.toolRecords, record] } } };
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
            toolRecords: tab.toolRecords.map((r) =>
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

  setTabPlanMode: (tabId, planMode) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, planMode, showPlanCompletePrompt: false },
        },
      };
    }),

  setTabShowPlanCompletePrompt: (tabId: string, show: boolean) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, showPlanCompletePrompt: show },
        },
      };
    }),

  setTabPlanFilePath: (tabId: string, path: string | null) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, planFilePath: path },
        },
      };
    }),

  setTabUserInputRequest: (tabId, request) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, userInputRequest: request },
        },
      };
    }),

  // Artifacts actions
  addTabArtifacts: (tabId, artifacts) =>
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
    }),

  setTabActiveArtifact: (tabId, artifactId) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, activeArtifactId: artifactId },
        },
      };
    }),

  setTabArtifactsPanelOpen: (tabId, open) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, artifactsPanelOpen: open },
        },
      };
    }),

  // Tasks actions
  setTabTasks: (tabId, tasks) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      return { tabs: { ...state.tabs, [tabId]: { ...tab, tasks } } };
    }),

  upsertTabTask: (tabId, task) =>
    set((state) => {
      const tab = state.tabs[tabId];
      if (!tab) return state;
      const existingIndex = tab.tasks.findIndex((t) => t.id === task.id);
      const updatedTasks = [...tab.tasks];
      if (existingIndex >= 0) {
        updatedTasks[existingIndex] = task;
      } else {
        updatedTasks.push(task);
      }
      return { tabs: { ...state.tabs, [tabId]: { ...tab, tasks: updatedTasks } } };
    }),
}));

function persistOpenTabs(tabs: Record<string, TabState>, tabOrder: string[]) {
  try {
    // Exclude draft tabs (null conversationId) from persistence
    const data = tabOrder
      .filter((id) => tabs[id]?.conversationId !== null)
      .map((id) => ({ id: tabs[id].id, title: tabs[id].title, conversationId: tabs[id].conversationId }));
    localStorage.setItem('codeforge:openTabs', JSON.stringify(data));
  } catch { /* noop */ }
}
