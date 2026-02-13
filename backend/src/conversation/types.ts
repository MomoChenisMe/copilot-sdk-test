export interface Conversation {
  id: string;
  title: string;
  sdkSessionId: string | null;
  model: string;
  cwd: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  metadata: unknown | null;
  createdAt: string;
}

export interface CreateConversationInput {
  model: string;
  cwd: string;
}

export interface SearchResult {
  conversationId: string;
  conversationTitle: string;
  snippet: string;
}
