import { create } from 'zustand';
import type { Conversation, Message } from '../lib/api';

export interface ToolRecord {
  toolCallId: string;
  toolName: string;
  arguments?: unknown;
  status: 'running' | 'success' | 'error';
  result?: unknown;
  error?: string;
}

export interface AppState {
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

  // Actions — Error
  setCopilotError: (error: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // State
  conversations: [],
  activeConversationId: null,
  messages: [],
  streamingText: '',
  isStreaming: false,
  toolRecords: [],
  reasoningText: '',
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
    set((state) => ({ messages: [...state.messages, message] })),

  // Streaming actions
  setStreamingText: (text) => set({ streamingText: text }),

  appendStreamingText: (delta) =>
    set((state) => ({ streamingText: state.streamingText + delta })),

  setIsStreaming: (streaming) => set({ isStreaming: streaming }),

  clearStreaming: () =>
    set({ streamingText: '', isStreaming: false, toolRecords: [], reasoningText: '', copilotError: null }),

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

  // Error actions
  setCopilotError: (error) => set({ copilotError: error }),
}));
