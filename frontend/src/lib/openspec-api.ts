import { apiGet, apiPatch, apiPost, apiDelete } from './api';

// ── Response Types ──────────────────────────────────────────────────────────

export interface OverviewData {
  activeChanges: number;
  specs: number;
  archived: number;
}

export interface ChangeListItem {
  name: string;
  status: 'active' | 'completed' | 'archived';
  tasksCompleted: number;
  tasksTotal: number;
  proposalExcerpt: string;
}

export interface DeltaSpecFile {
  name: string;
  path: string;
}

export interface ChangeDetail {
  name: string;
  status: 'active' | 'completed' | 'archived';
  tasksCompleted: number;
  tasksTotal: number;
  tasksMd: string;
  proposalMd: string;
  designMd: string;
  deltaSpecs: DeltaSpecFile[];
}

export interface SpecListItem {
  name: string;
  size: number;
}

export interface SpecFileContent {
  name: string;
  content: string;
}

export interface ArchivedItem {
  name: string;
  archivedAt: string;
}

export interface TaskToggleResult {
  ok: boolean;
  tasksCompleted: number;
  tasksTotal: number;
}

// ── API Client ──────────────────────────────────────────────────────────────

export const openspecApi = {
  getOverview: () =>
    apiGet<OverviewData>('/api/openspec/overview'),

  listChanges: () =>
    apiGet<{ changes: ChangeListItem[] }>('/api/openspec/changes').then((r) => r.changes),

  getChange: (name: string) =>
    apiGet<ChangeDetail>(`/api/openspec/changes/${encodeURIComponent(name)}`),

  updateTask: (name: string, taskLine: string, checked: boolean) =>
    apiPatch<TaskToggleResult>(
      `/api/openspec/changes/${encodeURIComponent(name)}/task`,
      { taskLine, checked },
    ),

  archiveChange: (name: string) =>
    apiPost<{ ok: boolean }>(
      `/api/openspec/changes/${encodeURIComponent(name)}/archive`,
    ),

  deleteChange: (name: string) =>
    apiDelete<{ ok: boolean }>(
      `/api/openspec/changes/${encodeURIComponent(name)}`,
    ),

  listSpecs: () =>
    apiGet<{ specs: SpecListItem[] }>('/api/openspec/specs').then((r) => r.specs),

  getSpecFile: (name: string) =>
    apiGet<SpecFileContent>(`/api/openspec/specs/${encodeURIComponent(name)}`),

  listArchived: () =>
    apiGet<{ archived: ArchivedItem[] }>('/api/openspec/archived').then((r) => r.archived),
};
