import { create } from 'zustand';
import type { Conversation, Message, ToolRecord, TurnSegment } from '../lib/api';

export type { ToolRecord, TurnSegment };

export type Theme = 'light' | 'dark';

export interface ModelInfo {
  id: string;
  name: string;
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
  setModels: (models: ModelInfo[]) => void;
  setModelsLoading: (loading: boolean) => void;
  setModelsError: (error: string | null) => void;

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

  // Settings
  activePresets: string[];
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

  // Actions — Settings
  togglePreset: (name: string) => void;
  removePreset: (name: string) => void;
  setSettingsOpen: (open: boolean) => void;

  // Actions — Error
  setCopilotError: (error: string | null) => void;
}

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
  setModels: (models) => set({ models }),
  setModelsLoading: (loading) => set({ modelsLoading: loading }),
  setModelsError: (error) => set({ modelsError: error }),

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
  activePresets: [],
  settingsOpen: false,
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

  // Settings actions
  togglePreset: (name) => {
    const current = get().activePresets;
    const next = current.includes(name)
      ? current.filter((p) => p !== name)
      : [...current, name];
    try { localStorage.setItem('ai-terminal:activePresets', JSON.stringify(next)); } catch { /* noop */ }
    set({ activePresets: next });
  },

  removePreset: (name) => {
    const next = get().activePresets.filter((p) => p !== name);
    try { localStorage.setItem('ai-terminal:activePresets', JSON.stringify(next)); } catch { /* noop */ }
    set({ activePresets: next });
  },

  setSettingsOpen: (open) => set({ settingsOpen: open }),

  // Error actions
  setCopilotError: (error) => set({ copilotError: error }),
}));
