import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Folder, FolderUp, Search, Check, FolderOpen, AlertCircle, ChevronRight, Lock, Loader2, Github, ArrowLeft, HardDrive } from 'lucide-react';
import { directoryApi } from '../../lib/api';
import type { DirectoryEntry } from '../../lib/api';
import { githubApi } from '../../lib/github-api';
import type { GithubRepo } from '../../lib/github-api';

interface DirectoryPickerProps {
  currentPath: string;
  onSelect: (path: string) => void;
  onClose: () => void;
  /** Called when the initial path is invalid and the picker falls back to home directory. Updates CWD without closing the picker. */
  onFallback?: (validPath: string) => void;
}

/** Client-side parent path computation (fallback when API fails) */
function getParentPath(p: string): string {
  const parts = p.replace(/\/+$/, '').split('/');
  if (parts.length <= 1) return '/';
  parts.pop();
  return parts.join('/') || '/';
}

type PickerTab = 'local' | 'github';

export function DirectoryPicker({ currentPath, onSelect, onClose, onFallback }: DirectoryPickerProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<PickerTab>('local');

  // --- Local state ---
  const [browsePath, setBrowsePath] = useState(currentPath);
  const [parentPath, setParentPath] = useState(() => getParentPath(currentPath));
  const [directories, setDirectories] = useState<DirectoryEntry[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // --- GitHub state ---
  const [ghAvailable, setGhAvailable] = useState<boolean | null>(null);
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [ghSearch, setGhSearch] = useState('');
  const [ghLoading, setGhLoading] = useState(false);
  const [ghError, setGhError] = useState<string | null>(null);
  const [cloning, setCloning] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null);
  const [clonePath, setClonePath] = useState('');
  const ghLoadedRef = useRef(false);

  /** Translate known backend error messages */
  const translateDirError = useCallback((err: unknown): string => {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('does not exist')) return t('directoryPicker.pathNotExist');
    if (msg.includes('Cannot read')) return t('directoryPicker.cannotRead');
    return msg || t('directoryPicker.empty');
  }, [t]);

  const loadDirectories = useCallback(async (dirPath: string, fallbackToHome = true) => {
    setLoading(true);
    setError(null);
    try {
      const result = await directoryApi.list(dirPath);
      setBrowsePath(result.currentPath);
      setParentPath(result.parentPath || getParentPath(result.currentPath));
      setDirectories(result.directories);
      setSearch('');
      setSelectedIndex(-1);
    } catch (err) {
      // When the requested path doesn't exist, fallback to home directory
      if (fallbackToHome) {
        try {
          const home = await directoryApi.list(); // backend defaults to os.homedir()
          setBrowsePath(home.currentPath);
          setParentPath(home.parentPath || getParentPath(home.currentPath));
          setDirectories(home.directories);
          setSearch('');
          setSelectedIndex(-1);
          // Auto-sync CWD to valid fallback path (without closing the picker)
          onFallback?.(home.currentPath);
          return;
        } catch {
          // fallback also failed, show the original error
        }
      }
      setBrowsePath(dirPath);
      setParentPath(getParentPath(dirPath));
      setDirectories([]);
      setError(translateDirError(err));
    } finally {
      setLoading(false);
    }
  }, [translateDirError]);

  useEffect(() => {
    loadDirectories(currentPath);
  }, [currentPath, loadDirectories]);

  // Load GitHub status + repos when GitHub tab is activated
  useEffect(() => {
    if (activeTab !== 'github') return;
    if (ghLoadedRef.current) return;
    ghLoadedRef.current = true;
    let cancelled = false;
    (async () => {
      setGhLoading(true);
      setGhError(null);
      try {
        const status = await githubApi.status();
        if (cancelled) return;
        setGhAvailable(status.available);
        if (status.available) {
          const result = await githubApi.listRepos();
          if (cancelled) return;
          setRepos(result.repos);
        }
      } catch (err) {
        if (cancelled) return;
        setGhAvailable(false);
        setGhError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!cancelled) setGhLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab]);

  // Escape key closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedRepo) {
          setSelectedRepo(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, selectedRepo]);

  const filtered = directories.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredRepos = repos.filter((r) =>
    r.nameWithOwner.toLowerCase().includes(ghSearch.toLowerCase()),
  );

  const handleNavigateParent = () => {
    const target = parentPath || getParentPath(browsePath);
    if (target && target !== browsePath) {
      loadDirectories(target);
    }
  };

  const handleNavigateInto = (dir: DirectoryEntry) => {
    loadDirectories(dir.path);
  };

  const handleSelect = () => {
    if (selectedIndex >= 0 && selectedIndex < filtered.length) {
      onSelect(filtered[selectedIndex].path);
    } else {
      onSelect(browsePath);
    }
  };

  const handleUseCurrent = () => {
    onSelect(browsePath);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < filtered.length) {
        handleNavigateInto(filtered[selectedIndex]);
      }
    } else if (e.key === 'Backspace' && !search) {
      handleNavigateParent();
    }
  };

  /** Default clone path: currentBrowsePath/repoName */
  const getDefaultClonePath = (nameWithOwner: string) => {
    const repo = nameWithOwner.split('/')[1];
    const base = browsePath.replace(/\/+$/, '');
    return `${base}/${repo}`;
  };

  const handleSelectRepo = (repo: GithubRepo) => {
    setSelectedRepo(repo);
    setClonePath(getDefaultClonePath(repo.nameWithOwner));
    setGhError(null);
  };

  const handleCloneRepo = async () => {
    if (!selectedRepo || !clonePath.trim()) return;
    setCloning(true);
    setGhError(null);
    try {
      const result = await githubApi.cloneRepo(selectedRepo.nameWithOwner, clonePath.trim());
      onSelect(result.path);
    } catch (err) {
      setGhError(err instanceof Error ? err.message : t('github.cloneError'));
      setCloning(false);
    }
  };

  const isAtRoot = browsePath === '/' || browsePath === parentPath;

  return (
    <div className="absolute bottom-full left-0 mb-2 w-80 max-w-[calc(100vw-2rem)] max-h-96 bg-bg-elevated border border-border rounded-xl shadow-[var(--shadow-lg)] flex flex-col overflow-hidden z-50">
      {/* Tab switcher */}
      <div className="flex border-b border-border">
        <button
          data-testid="tab-local"
          onClick={() => { setActiveTab('local'); setSelectedRepo(null); }}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'local'
              ? 'text-accent border-b-2 border-accent'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <HardDrive size={12} />
          {t('github.localTab')}
        </button>
        <button
          data-testid="tab-github"
          onClick={() => setActiveTab('github')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'github'
              ? 'text-accent border-b-2 border-accent'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Github size={12} />
          {t('github.tab')}
        </button>
      </div>

      {activeTab === 'local' ? (
        <>
          {/* Header: current path */}
          <div className="px-3 py-2 border-b border-border flex items-center gap-2 min-h-[36px]">
            <FolderOpen size={14} className="text-accent shrink-0" />
            <span className="text-xs font-medium text-text-primary truncate">{browsePath}</span>
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-bg-primary rounded-lg border border-border">
              <Search size={14} className="text-text-tertiary shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                placeholder={t('directoryPicker.search', 'Search directories...')}
                className="flex-1 text-xs bg-transparent text-text-primary placeholder:text-text-tertiary focus:outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* Parent directory button */}
          {!isAtRoot && (
            <button
              data-testid="directory-parent"
              onClick={handleNavigateParent}
              className="flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-accent/10 hover:text-accent transition-colors border-b border-border"
            >
              <FolderUp size={14} />
              <span className="font-medium">{t('directoryPicker.parent', '..')}</span>
            </button>
          )}

          {/* Directory list */}
          <div
            ref={listRef}
            data-testid="directory-list"
            className="flex-1 overflow-y-auto min-h-[80px] max-h-[200px]"
            onKeyDown={handleKeyDown}
            tabIndex={0}
          >
            {loading ? (
              <div className="px-3 py-4 text-xs text-text-tertiary text-center">{t('app.loading', 'Loading...')}</div>
            ) : error ? (
              <div className="px-3 py-4 text-xs text-error text-center flex items-center gap-1.5 justify-center">
                <AlertCircle size={12} />
                <span>{error}</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-4 text-xs text-text-tertiary text-center">{t('directoryPicker.empty', 'No directories found')}</div>
            ) : (
              filtered.map((dir, index) => (
                <button
                  key={dir.path}
                  data-testid={`directory-item-${dir.name}`}
                  onClick={() => handleNavigateInto(dir)}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-xs text-left transition-colors ${
                    index === selectedIndex
                      ? 'bg-accent/15 text-accent'
                      : 'text-text-primary hover:bg-accent/8 hover:text-accent'
                  }`}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <Folder size={14} className={index === selectedIndex ? 'text-accent' : 'text-text-tertiary'} />
                  <span className="truncate flex-1">{dir.name}</span>
                  <ChevronRight size={12} className="text-text-tertiary shrink-0" />
                </button>
              ))
            )}
          </div>

          {/* Footer: actions */}
          <div className="px-3 py-2 border-t border-border flex items-center gap-2">
            <button
              data-testid="directory-use-current"
              onClick={handleUseCurrent}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-bg-tertiary rounded-lg hover:bg-bg-secondary transition-colors"
            >
              <Check size={12} />
              {t('directoryPicker.useCurrent', 'Use Current')}
            </button>
            <button
              data-testid="directory-select"
              onClick={handleSelect}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors ml-auto"
            >
              <Check size={12} />
              {t('directoryPicker.select', 'Select')}
            </button>
          </div>
        </>
      ) : selectedRepo ? (
        /* GitHub confirm / clone view */
        <div className="flex flex-col">
          {/* Back button + repo name header */}
          <div className="px-3 py-2 border-b border-border flex items-center gap-2 min-h-[36px]">
            <button
              data-testid="github-back"
              onClick={() => { setSelectedRepo(null); setGhError(null); setCloning(false); }}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft size={14} />
            </button>
            <Github size={14} className="text-accent shrink-0" />
            <span className="text-xs font-medium text-text-primary truncate">{selectedRepo.nameWithOwner}</span>
            {selectedRepo.isPrivate && (
              <span className="flex items-center gap-0.5 text-[10px] text-text-tertiary">
                <Lock size={10} />
              </span>
            )}
          </div>

          {/* Clone destination info */}
          <div className="px-3 py-3 flex flex-col gap-2">
            {selectedRepo.description && (
              <p className="text-xs text-text-secondary">{selectedRepo.description}</p>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-text-tertiary uppercase tracking-wide font-medium">{t('github.cloneTo')}</label>
              <input
                data-testid="github-clone-path"
                type="text"
                value={clonePath}
                onChange={(e) => setClonePath(e.target.value)}
                className="text-xs text-text-primary bg-bg-primary px-2 py-1.5 rounded-lg border border-border focus:outline-none focus:border-accent"
                autoFocus
              />
            </div>

            {/* Error message */}
            {ghError && (
              <div className="text-xs text-error flex items-center gap-1.5">
                <AlertCircle size={12} />
                <span>{ghError}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="px-3 py-2 border-t border-border flex items-center gap-2">
            <button
              data-testid="github-back-btn"
              onClick={() => { setSelectedRepo(null); setGhError(null); setCloning(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-bg-tertiary rounded-lg hover:bg-bg-secondary transition-colors"
            >
              {t('github.back')}
            </button>
            <button
              data-testid="github-clone-btn"
              onClick={handleCloneRepo}
              disabled={cloning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors ml-auto disabled:opacity-50"
            >
              {cloning ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  {t('github.cloning')}
                </>
              ) : (
                <>
                  <Check size={12} />
                  {t('github.cloneAndOpen')}
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* GitHub repo list view */
        <>
          {/* GitHub search */}
          <div className="px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-bg-primary rounded-lg border border-border">
              <Search size={14} className="text-text-tertiary shrink-0" />
              <input
                data-testid="github-search"
                type="text"
                value={ghSearch}
                onChange={(e) => setGhSearch(e.target.value)}
                placeholder={t('github.searchRepos')}
                className="flex-1 text-xs bg-transparent text-text-primary placeholder:text-text-tertiary focus:outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* Repo list */}
          <div
            data-testid="github-repo-list"
            className="flex-1 overflow-y-auto min-h-[80px] max-h-[260px]"
          >
            {ghLoading ? (
              <div className="px-3 py-4 text-xs text-text-tertiary text-center flex items-center gap-1.5 justify-center">
                <Loader2 size={12} className="animate-spin" />
                <span>{t('github.loading')}</span>
              </div>
            ) : ghAvailable === false ? (
              <div data-testid="gh-not-available" className="px-3 py-4 text-xs text-text-tertiary text-center flex items-center gap-1.5 justify-center">
                <AlertCircle size={12} />
                <span>{t('github.ghNotAvailable')}</span>
              </div>
            ) : ghError ? (
              <div className="px-3 py-4 text-xs text-error text-center flex items-center gap-1.5 justify-center">
                <AlertCircle size={12} />
                <span>{ghError}</span>
              </div>
            ) : filteredRepos.length === 0 ? (
              <div className="px-3 py-4 text-xs text-text-tertiary text-center">{t('github.noRepos')}</div>
            ) : (
              filteredRepos.map((repo) => (
                <button
                  key={repo.nameWithOwner}
                  data-testid={`github-repo-${repo.name}`}
                  onClick={() => handleSelectRepo(repo)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left transition-colors text-text-primary hover:bg-accent/8 hover:text-accent"
                >
                  <Github size={14} className="text-text-tertiary shrink-0" />
                  <span className="truncate flex-1">{repo.nameWithOwner}</span>
                  {repo.isPrivate && (
                    <span className="flex items-center gap-0.5 text-[10px] text-text-tertiary">
                      <Lock size={10} />
                      {t('github.private')}
                    </span>
                  )}
                  <ChevronRight size={12} className="text-text-tertiary shrink-0" />
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
