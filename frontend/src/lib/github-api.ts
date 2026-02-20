import { apiGet, apiPost } from './api';

export interface GithubRepo {
  name: string;
  nameWithOwner: string;
  description: string | null;
  isPrivate: boolean;
  url: string;
}

export interface CloneResult {
  path: string;
  alreadyExists: boolean;
}

export const githubApi = {
  status: () => apiGet<{ available: boolean }>('/api/github/status'),
  listRepos: () => apiGet<{ repos: GithubRepo[] }>('/api/github/repos'),
  cloneRepo: (nameWithOwner: string, targetPath?: string) =>
    apiPost<CloneResult>('/api/github/clone', { nameWithOwner, targetPath }),
};
