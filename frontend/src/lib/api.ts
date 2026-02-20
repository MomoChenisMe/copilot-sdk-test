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

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
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

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, data.error ?? 'Request failed');
  }
  if (res.status === 204) return undefined as T;
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

export type TurnSegment =
  | { type: 'text'; content: string }
  | { type: 'tool'; toolCallId: string; toolName: string; arguments?: unknown; status: 'running' | 'success' | 'error'; result?: unknown; error?: string }
  | { type: 'reasoning'; content: string };

export interface AttachmentMeta {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface MessageMetadata {
  toolRecords?: ToolRecord[];
  reasoning?: string;
  turnSegments?: TurnSegment[];
  attachments?: AttachmentMeta[];
  usage?: { inputTokens: number; outputTokens: number; cacheReadTokens?: number; cacheWriteTokens?: number };
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

  update: (id: string, updates: { title?: string; pinned?: boolean; sdkSessionId?: string | null; model?: string; cwd?: string }) =>
    apiPatch<Conversation>(`/api/conversations/${id}`, updates),

  delete: (id: string) => apiDelete<{ ok: true }>(`/api/conversations/${id}`),

  getMessages: (id: string) => apiGet<Message[]>(`/api/conversations/${id}/messages`),

  search: (query: string) =>
    apiGet<SearchResult[]>(`/api/conversations/search?q=${encodeURIComponent(query)}`),
};

// --- Copilot API ---

export interface SdkCommand {
  name: string;
  description: string;
}

export const copilotApi = {
  listCommands: () => apiGet<SdkCommand[]>('/api/copilot/commands'),
};

// --- Config API ---

export interface AppConfig {
  defaultCwd: string;
}

export const configApi = {
  get: () => apiGet<AppConfig>('/api/config'),
  getBraveApiKey: () => apiGet<{ hasKey: boolean; maskedKey: string }>('/api/config/brave-api-key'),
  putBraveApiKey: (apiKey: string) => apiPut<{ ok: true }>('/api/config/brave-api-key', { apiKey }),
};

// --- Auto Memory API ---

export interface MemoryConfig {
  enabled: boolean;
  autoExtract: boolean;
  flushThreshold: number;
  extractIntervalSeconds: number;
  minNewMessages: number;
  llmGatingEnabled: boolean;
  llmGatingModel: string;
  llmExtractionEnabled: boolean;
  llmExtractionModel: string;
  llmExtractionMaxMessages: number;
  llmCompactionEnabled: boolean;
  llmCompactionModel: string;
  llmCompactionFactThreshold: number;
}

export interface MemorySearchResult {
  content: string;
  category: string;
  source: string;
}

export interface MemoryStats {
  totalFacts: number;
  dailyLogCount: number;
}

export const memoryApi = {
  getMain: () => apiGet<{ content: string }>('/api/auto-memory/main'),
  putMain: (content: string) => apiPut<{ ok: true }>('/api/auto-memory/main', { content }),
  listDailyLogs: () => apiGet<{ dates: string[] }>('/api/auto-memory/daily'),
  getDailyLog: (date: string) => apiGet<{ content: string }>(`/api/auto-memory/daily/${date}`),
  searchMemory: (query: string) =>
    apiGet<{ results: MemorySearchResult[] }>(`/api/auto-memory/search?q=${encodeURIComponent(query)}`),
  getConfig: () => apiGet<MemoryConfig>('/api/auto-memory/config'),
  putConfig: (config: Partial<MemoryConfig>) => apiPut<{ ok: true }>('/api/auto-memory/config', config),
  getStats: () => apiGet<MemoryStats>('/api/auto-memory/stats'),
  compactMemory: () => apiPost<{ beforeCount?: number; afterCount?: number; message?: string }>('/api/auto-memory/compact'),
};

// --- Directory API ---

export interface DirectoryEntry {
  name: string;
  path: string;
}

export interface DirectoryListResult {
  currentPath: string;
  parentPath: string;
  directories: DirectoryEntry[];
}

export const directoryApi = {
  list: (dirPath?: string, showHidden?: boolean) => {
    const params = new URLSearchParams();
    if (dirPath) params.set('path', dirPath);
    if (showHidden) params.set('showHidden', 'true');
    const qs = params.toString();
    return apiGet<DirectoryListResult>(`/api/directories${qs ? `?${qs}` : ''}`);
  },
};

// --- MCP API ---

export interface McpServer {
  name: string;
  transport: 'stdio' | 'http';
  connected: boolean;
}

export interface McpServerConfig {
  name: string;
  transport: 'stdio' | 'http';
  command?: string;
  args?: string[];
  url?: string;
}

export interface McpToolInfo {
  name: string;
  description: string;
  serverName: string;
}

// --- Cron API ---

export interface CronJob {
  id: string;
  name: string;
  type: 'ai' | 'shell';
  scheduleType: 'cron' | 'interval' | 'once';
  scheduleValue: string;
  config: Record<string, unknown>;
  enabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CronHistory {
  id: string;
  jobId: string;
  startedAt: string;
  finishedAt: string | null;
  status: 'success' | 'error' | 'timeout' | 'running';
  output: string | null;
  prompt: string | null;
  configSnapshot: Record<string, unknown> | null;
  turnSegments: unknown[] | null;
  toolRecords: unknown[] | null;
  reasoning: string | null;
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number } | null;
  content: string | null;
  createdAt: string;
}

export interface CronHistoryWithJob extends CronHistory {
  jobName: string;
}

export type CronJobInput = Pick<CronJob, 'name' | 'type' | 'scheduleType' | 'scheduleValue' | 'config' | 'enabled'>;

export const cronApi = {
  listJobs: () => apiGet<{ jobs: CronJob[] }>('/api/cron/jobs'),
  createJob: (input: CronJobInput) => apiPost<{ job: CronJob }>('/api/cron/jobs', input),
  updateJob: (id: string, updates: Partial<CronJobInput>) => apiPut<{ job: CronJob }>(`/api/cron/jobs/${id}`, updates),
  deleteJob: (id: string) => apiDelete<void>(`/api/cron/jobs/${id}`),
  triggerJob: (id: string) => apiPost<void>(`/api/cron/jobs/${id}/trigger`),
  getHistory: (id: string, limit?: number) => {
    const params = limit ? `?limit=${limit}` : '';
    return apiGet<{ history: CronHistory[] }>(`/api/cron/jobs/${id}/history${params}`);
  },
  getRecentHistory: (limit?: number) => {
    const params = limit ? `?limit=${limit}` : '';
    return apiGet<{ history: CronHistoryWithJob[] }>(`/api/cron/history/recent${params}`);
  },
  getUnreadCount: (since?: string) => {
    const params = since ? `?since=${encodeURIComponent(since)}` : '';
    return apiGet<{ unread: number; failed: number }>(`/api/cron/history/unread-count${params}`);
  },
  openAsConversation: (historyId: string) =>
    apiPost<{ conversation: Conversation }>(`/api/cron/history/${historyId}/open-conversation`),
  deleteHistoryEntry: (historyId: string) =>
    apiDelete<void>(`/api/cron/history/${historyId}`),
  clearHistory: (keep?: number) => {
    const params = keep != null ? `?keep=${keep}` : '';
    return apiDelete<{ deleted: number }>(`/api/cron/history${params}`);
  },
};

// --- MCP API ---

export const mcpApi = {
  listServers: () => apiGet<{ servers: McpServer[] }>('/api/mcp/servers'),
  addServer: (config: McpServerConfig) => apiPost<{ ok: true }>('/api/mcp/servers', config),
  removeServer: (name: string) => apiDelete<{ ok: true }>(`/api/mcp/servers/${name}`),
  restartServer: (name: string) => apiPost<{ ok: true }>(`/api/mcp/servers/${name}/restart`),
  listTools: () => apiGet<{ tools: McpToolInfo[] }>('/api/mcp/tools'),
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
