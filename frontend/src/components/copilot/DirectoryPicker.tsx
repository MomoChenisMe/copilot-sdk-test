import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Folder, FolderUp, Search, Check, FolderOpen, AlertCircle, ChevronRight } from 'lucide-react';
import { directoryApi } from '../../lib/api';
import type { DirectoryEntry } from '../../lib/api';

interface DirectoryPickerProps {
  currentPath: string;
  onSelect: (path: string) => void;
  onClose: () => void;
}

/** Client-side parent path computation (fallback when API fails) */
function getParentPath(p: string): string {
  const parts = p.replace(/\/+$/, '').split('/');
  if (parts.length <= 1) return '/';
  parts.pop();
  return parts.join('/') || '/';
}

export function DirectoryPicker({ currentPath, onSelect, onClose }: DirectoryPickerProps) {
  const { t } = useTranslation();
  const [browsePath, setBrowsePath] = useState(currentPath);
  const [parentPath, setParentPath] = useState(() => getParentPath(currentPath));
  const [directories, setDirectories] = useState<DirectoryEntry[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const loadDirectories = useCallback(async (dirPath: string) => {
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
      // Still update browsePath so the user can see where they tried to go
      setBrowsePath(dirPath);
      setParentPath(getParentPath(dirPath));
      setDirectories([]);
      setError(err instanceof Error ? err.message : t('directoryPicker.empty'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadDirectories(currentPath);
  }, [currentPath, loadDirectories]);

  // Escape key closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const filtered = directories.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()),
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
      // If nothing selected, select the current browsePath
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
        // Enter navigates into the selected directory
        handleNavigateInto(filtered[selectedIndex]);
      }
    } else if (e.key === 'Backspace' && !search) {
      handleNavigateParent();
    }
  };

  const isAtRoot = browsePath === '/' || browsePath === parentPath;

  return (
    <div className="absolute bottom-full left-0 mb-2 w-80 max-h-96 bg-bg-elevated border border-border rounded-xl shadow-[var(--shadow-lg)] flex flex-col overflow-hidden z-50">
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
    </div>
  );
}
