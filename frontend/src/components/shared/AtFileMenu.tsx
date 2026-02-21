import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import { Folder, FileText, ChevronUp, Loader2 } from 'lucide-react';
import { directoryApi } from '../../lib/api';
import type { DirectoryEntry, FileEntry } from '../../lib/api';

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
}

export const AtFileMenu = forwardRef<AtFileMenuHandle, AtFileMenuProps>(function AtFileMenu({ cwd, filter, selectedIndex, onSelectFile, onNavigate, onClose }, ref) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [browsePath, setBrowsePath] = useState(cwd);
  const [entries, setEntries] = useState<BrowseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAtRoot = browsePath === cwd;

  // Compute relative path for breadcrumb
  const relativePath = browsePath.startsWith(cwd)
    ? browsePath.slice(cwd.length).replace(/^\//, '') || '.'
    : browsePath;

  // Load directory contents when browsePath changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
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
      setEntries([...dirs, ...files]);
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setError(t('atFile.loadError', 'Failed to load directory'));
      setEntries([]);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [browsePath]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Filter: use part after last "/" so @Documents/Git filters by "Git" inside Documents
  const nameFilter = filter.includes('/') ? (filter.split('/').pop() || '') : (isAtRoot ? filter : '');
  const filtered = nameFilter
    ? entries.filter((e) => e.name.toLowerCase().includes(nameFilter.toLowerCase()))
    : entries;

  // Helper: compute relative path from cwd for a given absolute path
  const relativeFromCwd = (absPath: string): string => {
    if (absPath === cwd) return '';
    return absPath.startsWith(cwd + '/') ? absPath.slice(cwd.length + 1) : '';
  };

  // Navigate into a directory and notify parent
  const doNavigateInto = (entry: BrowseEntry) => {
    setBrowsePath(entry.path);
    onNavigate?.(relativeFromCwd(entry.path));
  };

  // Go up one level and notify parent
  const doGoUp = () => {
    if (isAtRoot) return;
    const parent = browsePath.split('/').slice(0, -1).join('/') || '/';
    const newPath = parent.length >= cwd.length ? parent : cwd;
    setBrowsePath(newPath);
    onNavigate?.(relativeFromCwd(newPath));
  };

  const handleEntryClick = (entry: BrowseEntry) => {
    if (entry.isDirectory) {
      doNavigateInto(entry);
    } else {
      const displayName = entry.path.startsWith(cwd + '/')
        ? entry.path.slice(cwd.length + 1)
        : entry.name;
      onSelectFile(entry.path, displayName);
    }
  };

  // Expose keyboard navigation methods for parent
  useImperativeHandle(ref, () => ({
    activateSelected(index: number) {
      const entry = filtered[index];
      if (!entry) return;
      const displayName = entry.path.startsWith(cwd + '/')
        ? entry.path.slice(cwd.length + 1)
        : entry.name;
      onSelectFile(entry.path, displayName);
    },
    navigateInto(index: number) {
      const entry = filtered[index];
      if (entry?.isDirectory) {
        doNavigateInto(entry);
      }
    },
    navigateUp() {
      doGoUp();
    },
  }));

  if (loading) {
    return (
      <div
        ref={menuRef}
        data-testid="at-file-menu"
        className="absolute bottom-full left-0 mb-1 w-80 bg-bg-elevated border border-border rounded-xl shadow-[var(--shadow-lg)] z-50 p-4 flex items-center justify-center"
      >
        <Loader2 size={16} className="animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">{t('atFile.loading', 'Loading...')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        ref={menuRef}
        data-testid="at-file-menu"
        className="absolute bottom-full left-0 mb-1 w-80 bg-bg-elevated border border-border rounded-xl shadow-[var(--shadow-lg)] z-50 p-3"
      >
        <p className="text-sm text-error">{error}</p>
      </div>
    );
  }

  let flatIndex = 0;

  return (
    <div
      ref={menuRef}
      role="listbox"
      data-testid="at-file-menu"
      className="absolute bottom-full left-0 mb-1 w-80 max-h-72 overflow-y-auto bg-bg-elevated border border-border rounded-xl shadow-[var(--shadow-lg)] z-50"
    >
      {/* Breadcrumb */}
      <div className="px-3 py-1.5 text-xs text-text-muted border-b border-border flex items-center gap-1">
        <span className="font-medium">{relativePath}</span>
      </div>

      {/* Go up */}
      {!isAtRoot && (
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
      {filtered.length === 0 ? (
        <div className="px-3 py-3 text-sm text-text-muted">
          {t('atFile.empty', 'No files found')}
        </div>
      ) : (
        filtered.map((entry) => {
          const idx = flatIndex++;
          return (
            <button
              key={entry.path}
              role="option"
              aria-selected={idx === selectedIndex}
              onClick={() => handleEntryClick(entry)}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors text-sm ${
                idx === selectedIndex
                  ? 'bg-accent-soft text-accent'
                  : 'hover:bg-bg-tertiary text-text-primary'
              }`}
            >
              {entry.isDirectory ? (
                <Folder size={14} className="shrink-0 text-text-muted" />
              ) : (
                <FileText size={14} className="shrink-0 text-text-muted" />
              )}
              <span className="truncate">{entry.name}</span>
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
