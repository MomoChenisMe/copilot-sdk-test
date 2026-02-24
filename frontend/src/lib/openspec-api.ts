import { apiGet, apiPatch, apiPost, apiDelete } from './api';

// ── Response Types ──────────────────────────────────────────────────────────

export interface OverviewData {
  changesCount: number;
  specsCount: number;
  archivedCount: number;
  config: Record<string, unknown> | null;
  resolvedPath: string | null;
}

export interface OpenSpecMetadata {
  id: number;
  name: string;
  type: 'change' | 'spec' | 'archived';
  cwd: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string | null;
  archivedAt: string | null;
}

export interface ChangeListItem {
  name: string;
  status: string;
  taskProgress: { total: number; completed: number };
  proposal: string;
  metadata?: OpenSpecMetadata | null;
}

export interface DeltaSpecFile {
  name: string;
  path: string;
}

export interface DeltaSpecSummary {
  name: string;
  added: number;
  modified: number;
  removed: number;
}

export interface ChangeDetail {
  name: string;
  openspec: Record<string, unknown> | null;
  proposal: string | null;
  design: string | null;
  tasks: string | null;
  specs: DeltaSpecSummary[];
}

export interface SpecListItem {
  name: string;
  size: number;
  summary?: string;
}

export interface SpecFileContent {
  name: string;
  content: string;
}

export interface ArchivedItem {
  name: string;
  archivedAt: string;
  metadata?: OpenSpecMetadata | null;
}

export interface TaskToggleResult {
  ok: boolean;
  tasksCompleted: number;
  tasksTotal: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function withCwd(url: string, cwd?: string): string {
  if (!cwd) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}cwd=${encodeURIComponent(cwd)}`;
}

// ── API Client ──────────────────────────────────────────────────────────────

export const openspecApi = {
  getOverview: (cwd?: string) =>
    apiGet<OverviewData>(withCwd('/api/openspec/overview', cwd)),

  listChanges: (cwd?: string) =>
    apiGet<{ changes: ChangeListItem[] }>(withCwd('/api/openspec/changes', cwd)).then((r) => r.changes),

  getChange: (name: string, cwd?: string) =>
    apiGet<ChangeDetail>(withCwd(`/api/openspec/changes/${encodeURIComponent(name)}`, cwd)),

  updateTask: (name: string, taskLine: string, checked: boolean, cwd?: string) =>
    apiPatch<TaskToggleResult>(
      withCwd(`/api/openspec/changes/${encodeURIComponent(name)}/task`, cwd),
      { taskLine, checked },
    ),

  archiveChange: (name: string, cwd?: string) =>
    apiPost<{ ok: boolean }>(
      withCwd(`/api/openspec/changes/${encodeURIComponent(name)}/archive`, cwd),
    ),

  deleteChange: (name: string, cwd?: string) =>
    apiDelete<{ ok: boolean }>(
      withCwd(`/api/openspec/changes/${encodeURIComponent(name)}`, cwd),
    ),

  getDeltaSpec: (changeName: string, specName: string, cwd?: string) =>
    apiGet<SpecFileContent>(
      withCwd(`/api/openspec/changes/${encodeURIComponent(changeName)}/specs/${encodeURIComponent(specName)}`, cwd),
    ),

  initOpenspec: (cwd: string) =>
    apiPost<{ ok: boolean }>(withCwd('/api/openspec/init', cwd)),

  deleteOpenspec: (cwd: string) =>
    apiDelete<{ ok: boolean }>(withCwd('/api/openspec/delete', cwd)),

  listSpecs: (cwd?: string) =>
    apiGet<{ specs: SpecListItem[] }>(withCwd('/api/openspec/specs', cwd)).then((r) => r.specs),

  getSpecFile: (name: string, cwd?: string) =>
    apiGet<SpecFileContent>(withCwd(`/api/openspec/specs/${encodeURIComponent(name)}`, cwd)),

  listArchived: (cwd?: string) =>
    apiGet<{ archived: ArchivedItem[] }>(withCwd('/api/openspec/archived', cwd)).then((r) => r.archived),

  getArchivedChange: (name: string, cwd?: string) =>
    apiGet<ChangeDetail>(withCwd(`/api/openspec/archived/${encodeURIComponent(name)}`, cwd)),
};
