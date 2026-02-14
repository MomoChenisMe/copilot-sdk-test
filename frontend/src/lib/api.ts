const BASE_URL = '';

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, data.error ?? 'Request failed');
  }
  return res.json();
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'same-origin',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, data.error ?? 'Request failed');
  }
  return res.json();
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, data.error ?? 'Request failed');
  }
  return res.json();
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, data.error ?? 'Request failed');
  }
  return res.json();
}

// --- Shared Types ---

export interface ToolRecord {
  toolCallId: string;
  toolName: string;
  arguments?: unknown;
  status: 'running' | 'success' | 'error';
  result?: unknown;
  error?: string;
}

export interface MessageMetadata {
  toolRecords?: ToolRecord[];
  reasoning?: string;
}

// --- Conversation API ---

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

export interface SearchResult {
  conversationId: string;
  conversationTitle: string;
  snippet: string;
}

export const conversationApi = {
  list: () => apiGet<Conversation[]>('/api/conversations'),

  getById: (id: string) => apiGet<Conversation>(`/api/conversations/${id}`),

  create: (model: string, cwd: string) =>
    apiPost<Conversation>('/api/conversations', { model, cwd }),

  update: (id: string, updates: { title?: string; pinned?: boolean; sdkSessionId?: string }) =>
    apiPatch<Conversation>(`/api/conversations/${id}`, updates),

  delete: (id: string) => apiDelete<{ ok: true }>(`/api/conversations/${id}`),

  getMessages: (id: string) => apiGet<Message[]>(`/api/conversations/${id}/messages`),

  search: (query: string) =>
    apiGet<SearchResult[]>(`/api/conversations/search?q=${encodeURIComponent(query)}`),
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
