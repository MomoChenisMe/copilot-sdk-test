import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Folder, FileText, ChevronUp, Loader2, Search } from 'lucide-react';
import { directoryApi } from '../../lib/api';
import type { DirectoryEntry, FileEntry, DirectorySearchEntry } from '../../lib/api';

export interface AtFileMenuHandle {
  /** Enter/Tab: select file only (no-op for directories) */
  activateSelected: (index: number) => void;
  /** ArrowRight: navigate into directory (no-op for files) */
  navigateInto: (index: number) => void;
  /** ArrowLeft: go up one level */
  navigateUp: () => void;
}

interface AtFileMenuProps {
  cwd: string;
  filter: string;
  selectedIndex: number;
  onSelectFile: (filePath: string, displayName: string) => void;
  onNavigate?: (relativePath: string) => void;
  onClose: () => void;
}

interface BrowseEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  relativePath?: string;
}

export const AtFileMenu = forwardRef<AtFileMenuHandle, AtFileMenuProps>(function AtFileMenu({ cwd, filter, selectedIndex, onSelectFile, onNavigate, onClose }, ref) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);

  // --- Browse mode state ---
  const [browsePath, setBrowsePath] = useState(cwd);
  const [browseEntries, setBrowseEntries] = useState<BrowseEntry[]>([]);
  const [browseLoading, setBrowseLoading] = useState(true);
  const [browseError, setBrowseError] = useState<string | null>(null);

  // --- Search mode state ---
  const [searchResults, setSearchResults] = useState<BrowseEntry[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mode: if filter contains '/' → browse mode, otherwise → search mode
  const isBrowseMode = filter.includes('/');
  const isAtRoot = browsePath === cwd;

  // Compute relative path for breadcrumb
  const relativePath = browsePath.startsWith(cwd)
    ? browsePath.slice(cwd.length).replace(/^\//, '') || '.'
    : browsePath;

  // --- Browse mode: load directory contents ---
  useEffect(() => {
    if (!isBrowseMode && filter !== '') return;

    let cancelled = false;
    setBrowseLoading(true);
    setBrowseError(null);
    directoryApi.list(browsePath, true, true).then((result) => {
      if (cancelled) return;
      const dirs: BrowseEntry[] = result.directories.map((d: DirectoryEntry) => ({
        name: d.name,
        path: d.path,
        isDirectory: true,
      }));
      const files: BrowseEntry[] = (result.files ?? []).map((f: FileEntry) => ({
        name: f.name,
        path: f.path,
        isDirectory: false,
        size: f.size,
      }));
      setBrowseEntries([...dirs, ...files]);
      setBrowseLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setBrowseError(t('atFile.loadError', 'Failed to load directory'));
      setBrowseEntries([]);
      setBrowseLoading(false);
    });
    return () => { cancelled = true; };
  }, [browsePath, isBrowseMode, filter === '']); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Search mode: debounced fuzzy search ---
  useEffect(() => {
    if (isBrowseMode || filter === '') {
      setSearchResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    setSearchLoading(true);
    debounceRef.current = setTimeout(() => {
      directoryApi.search(cwd, filter, 30).then((result) => {
        setSearchResults(result.results.map((r: DirectorySearchEntry) => ({
          name: r.name,
          path: r.path,
          isDirectory: r.isDirectory,
          relativePath: r.relativePath,
        })));
        setSearchLoading(false);
      }).catch(() => {
        setSearchResults([]);
        setSearchLoading(false);
      });
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filter, cwd, isBrowseMode]);

  // Handle filter-based directory navigation (when user types e.g. @src/)
  useEffect(() => {
    if (!isBrowseMode) return;
    // Extract directory path from filter (everything before last '/')
    const parts = filter.split('/');
    const dirPart = parts.slice(0, -1).join('/');
    if (dirPart) {
      const targetPath = `${cwd}/${dirPart}`;
      if (targetPath !== browsePath) {
        setBrowsePath(targetPath);
      }
    }
  }, [filter, cwd, isBrowseMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const selected = menuRef.current?.querySelector('[aria-selected="true"]');
    if (selected && typeof selected.scrollIntoView === 'function') {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Determine which entries to display
  const displayEntries = isBrowseMode || filter === '' ? (() => {
    const nameFilter = filter.includes('/') ? (filter.split('/').pop() || '') : '';
    return nameFilter
      ? browseEntries.filter((e) => e.name.toLowerCase().includes(nameFilter.toLowerCase()))
      : browseEntries;
  })() : searchResults;

  const isLoading = (isBrowseMode || filter === '') ? browseLoading : searchLoading;

  // Helper: compute relative path from cwd for a given absolute path
  const relativeFromCwd = useCallback((absPath: string): string => {
    if (absPath === cwd) return '';
    return absPath.startsWith(cwd + '/') ? absPath.slice(cwd.length + 1) : '';
  }, [cwd]);

  // Navigate into a directory and notify parent
  const doNavigateInto = useCallback((entry: BrowseEntry) => {
    setBrowsePath(entry.path);
    onNavigate?.(relativeFromCwd(entry.path));
  }, [onNavigate, relativeFromCwd]);

  // Go up one level and notify parent
  const doGoUp = useCallback(() => {
    if (isAtRoot) return;
    const parent = browsePath.split('/').slice(0, -1).join('/') || '/';
    const newPath = parent.length >= cwd.length ? parent : cwd;
    setBrowsePath(newPath);
    onNavigate?.(relativeFromCwd(newPath));
  }, [isAtRoot, browsePath, cwd, onNavigate, relativeFromCwd]);

  const handleEntryClick = useCallback((entry: BrowseEntry) => {
    if (entry.isDirectory) {
      doNavigateInto(entry);
    } else {
      const displayName = entry.relativePath || (entry.path.startsWith(cwd + '/')
        ? entry.path.slice(cwd.length + 1)
        : entry.name);
      onSelectFile(entry.path, displayName);
    }
  }, [cwd, doNavigateInto, onSelectFile]);

  // Expose keyboard navigation methods for parent
  useImperativeHandle(ref, () => ({
    activateSelected(index: number) {
      const entry = displayEntries[index];
      if (!entry) return;
      const displayName = entry.relativePath || (entry.path.startsWith(cwd + '/')
        ? entry.path.slice(cwd.length + 1)
        : entry.name);
      onSelectFile(entry.path, displayName);
    },
    navigateInto(index: number) {
      const entry = displayEntries[index];
      if (entry?.isDirectory) {
        doNavigateInto(entry);
      }
    },
    navigateUp() {
      doGoUp();
    },
  }));

  if (isLoading && displayEntries.length === 0) {
    return (
      <div
        ref={menuRef}
        data-testid="at-file-menu"
        className="absolute bottom-full left-0 mb-1 w-96 bg-bg-elevated border border-border rounded-xl shadow-[var(--shadow-lg)] z-50 p-4 flex items-center justify-center"
      >
        <Loader2 size={16} className="animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">{t('atFile.loading', 'Loading...')}</span>
      </div>
    );
  }

  if (browseError && (isBrowseMode || filter === '')) {
    return (
      <div
        ref={menuRef}
        data-testid="at-file-menu"
        className="absolute bottom-full left-0 mb-1 w-96 bg-bg-elevated border border-border rounded-xl shadow-[var(--shadow-lg)] z-50 p-3"
      >
        <p className="text-sm text-error">{browseError}</p>
      </div>
    );
  }

  let flatIndex = 0;
  const showBrowseNav = isBrowseMode || filter === '';

  return (
    <div
      ref={menuRef}
      role="listbox"
      data-testid="at-file-menu"
      className="absolute bottom-full left-0 mb-1 w-96 max-h-72 overflow-y-auto bg-bg-elevated border border-border rounded-xl shadow-[var(--shadow-lg)] z-50"
    >
      {/* Header: breadcrumb (browse mode) or search indicator */}
      <div className="px-3 py-1.5 text-xs text-text-muted border-b border-border flex items-center gap-1">
        {showBrowseNav ? (
          <span className="font-medium">{relativePath}</span>
        ) : (
          <>
            <Search size={12} />
            <span className="font-medium">{t('atFile.searchResults', 'Search results')}</span>
            {searchLoading && <Loader2 size={12} className="animate-spin ml-auto" />}
          </>
        )}
      </div>

      {/* Go up (browse mode only) */}
      {showBrowseNav && !isAtRoot && (
        <button
          data-testid="at-file-go-up"
          onClick={doGoUp}
          className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-bg-tertiary text-text-secondary text-sm"
        >
          <ChevronUp size={14} />
          <span>..</span>
        </button>
      )}

      {/* Entries */}
      {displayEntries.length === 0 ? (
        <div className="px-3 py-3 text-sm text-text-muted">
          {t('atFile.empty', 'No files found')}
        </div>
      ) : (
        displayEntries.map((entry) => {
          const idx = flatIndex++;
          const isSearchMode = !showBrowseNav && entry.relativePath;
          const dirPath = isSearchMode
            ? entry.relativePath!.split('/').slice(0, -1).join('/')
            : '';
          return (
            <button
              key={entry.path}
              role="option"
              aria-selected={idx === selectedIndex}
              onClick={() => handleEntryClick(entry)}
              title={entry.relativePath || entry.name}
              className={`w-full text-left px-3 py-2 flex items-start gap-2 transition-colors text-sm ${
                idx === selectedIndex
                  ? 'bg-accent-soft text-accent'
                  : 'hover:bg-bg-tertiary text-text-primary'
              }`}
            >
              {entry.isDirectory ? (
                <Folder size={14} className="shrink-0 text-text-muted mt-0.5" />
              ) : (
                <FileText size={14} className="shrink-0 text-text-muted mt-0.5" />
              )}
              {isSearchMode ? (
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{entry.name}</span>
                  {dirPath && (
                    <span className="block truncate text-xs text-text-muted">{dirPath}</span>
                  )}
                </span>
              ) : (
                <span className="truncate flex-1">{entry.name}</span>
              )}
              {!entry.isDirectory && entry.size !== undefined && (
                <span className="ml-auto text-xs text-text-muted shrink-0">
                  {formatSize(entry.size)}
                </span>
              )}
            </button>
          );
        })
      )}
    </div>
  );
})

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
