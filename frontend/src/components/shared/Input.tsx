import { useState, useRef, useCallback, useEffect, useLayoutEffect, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, Square, Paperclip } from 'lucide-react';
import { SlashCommandMenu } from './SlashCommandMenu';
import type { SlashCommand } from './SlashCommandMenu';
import { AttachmentPreview } from './AttachmentPreview';
import type { AttachedFile } from './AttachmentPreview';
import { AtFileMenu } from './AtFileMenu';
import type { AtFileMenuHandle } from './AtFileMenu';

export interface ContextFileRef {
  path: string;
  displayName: string;
}

interface InputProps {
  onSend: (text: string, attachments?: AttachedFile[], contextFiles?: string[]) => void;
  onAbort: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  slashCommands?: SlashCommand[];
  onSlashCommand?: (command: SlashCommand) => void;
  enableAttachments?: boolean;
  attachmentsDisabledReason?: string;
  placeholder?: string;
  statusText?: string;
  enableAtFiles?: boolean;
  currentCwd?: string;
  /** History of previous user inputs (most recent first) for ArrowUp/Down navigation */
  inputHistory?: string[];
  /** Content rendered at the bottom-left of the input (e.g. mobile toolbar buttons) */
  leftActions?: React.ReactNode;
}

export interface InputHandle {
  focus: () => void;
}

export const Input = forwardRef<InputHandle, InputProps>(function Input({ onSend, onAbort, isStreaming, disabled, slashCommands, onSlashCommand, enableAttachments, attachmentsDisabledReason, placeholder, statusText, enableAtFiles, currentCwd, inputHistory, leftActions }, ref) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  // Input history navigation state
  const [historyIndex, setHistoryIndex] = useState(-1); // -1 = current draft
  const draftTextRef = useRef(''); // saves draft when browsing history
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [slashStart, setSlashStart] = useState(-1); // character index where the active "/" was typed
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  // @ file reference state
  const [showAtMenu, setShowAtMenu] = useState(false);
  const [atFilter, setAtFilter] = useState('');
  const [atSelectedIndex, setAtSelectedIndex] = useState(0);
  const [atStart, setAtStart] = useState(-1);
  const [contextFiles, setContextFiles] = useState<ContextFileRef[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const atMenuRef = useRef<AtFileMenuHandle>(null);
  const pendingCursorRef = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
  }), []);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [text, adjustHeight]);

  // Set pending cursor position after React commits DOM but before browser paint
  useLayoutEffect(() => {
    if (pendingCursorRef.current !== null) {
      const pos = pendingCursorRef.current;
      pendingCursorRef.current = null;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos, pos);
    }
  }, [text]);

  // Add files to attachments
  const addFiles = useCallback((files: FileList | File[]) => {
    const newAttachments: AttachedFile[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      type: file.type,
      size: file.size,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const removed = prev.find((a) => a.id === id);
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  // Handle file input change
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
      }
      // Reset so same file can be selected again
      e.target.value = '';
    },
    [addFiles],
  );

  // Handle paste (for images)
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (!enableAttachments) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        addFiles(imageFiles);
      }
    },
    [enableAttachments, addFiles],
  );

  // Handle drag and drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (!enableAttachments) return;
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [enableAttachments, addFiles],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!enableAttachments) return;
      e.preventDefault();
    },
    [enableAttachments],
  );

  // Find the last slash command trigger relative to cursor position.
  // Returns { start, filter } if a valid slash trigger is found, or null.
  // A valid trigger: "/" preceded by start-of-string, whitespace, or newline,
  // and followed by non-space chars (the partial command name) with no space before cursor.
  const findLastSlashCommand = useCallback(
    (value: string, cursorPos: number): { start: number; filter: string } | null => {
      // Search backwards from cursor for the last "/"
      const textBeforeCursor = value.slice(0, cursorPos);
      // Find the last "/" that is preceded by whitespace/newline or is at position 0
      const match = textBeforeCursor.match(/(?:^|[\s\n])(\/[^\s]*)$/);
      if (!match) return null;
      // Calculate where the "/" actually starts
      const slashIdx = textBeforeCursor.length - match[1].length;
      const filter = match[1].slice(1); // remove the leading "/"
      // If the filter contains a space, it's no longer a command trigger
      if (filter.includes(' ')) return null;
      return { start: slashIdx, filter };
    },
    [],
  );

  // Find the last @ trigger relative to cursor position (same pattern as slash)
  const findLastAtTrigger = useCallback(
    (value: string, cursorPos: number): { start: number; filter: string } | null => {
      const textBeforeCursor = value.slice(0, cursorPos);
      const match = textBeforeCursor.match(/(?:^|[\s\n])(@[^\s]*)$/);
      if (!match) return null;
      const atIdx = textBeforeCursor.length - match[1].length;
      const filter = match[1].slice(1); // remove leading "@"
      return { start: atIdx, filter };
    },
    [],
  );

  // Detect slash command trigger
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      const cursorPos = e.target.selectionStart ?? value.length;
      setText(value);

      if (slashCommands && slashCommands.length > 0) {
        const result = findLastSlashCommand(value, cursorPos);
        if (result) {
          setSlashStart(result.start);
          setSlashFilter(result.filter);
          setShowSlashMenu(true);
          setSelectedIndex(0);
          setShowAtMenu(false);
          return;
        }
      }
      setSlashStart(-1);
      setShowSlashMenu(false);

      // @ file trigger detection
      if (enableAtFiles) {
        const atResult = findLastAtTrigger(value, cursorPos);
        if (atResult) {
          setAtStart(atResult.start);
          setAtFilter(atResult.filter);
          setShowAtMenu(true);
          setAtSelectedIndex(0);
          return;
        }
      }
      setAtStart(-1);
      setShowAtMenu(false);

      // Sync contextFiles: remove references whose @displayName no longer appears in text
      if (contextFiles.length > 0) {
        setContextFiles((prev) =>
          prev.filter((cf) => value.includes(`@${cf.displayName}`)),
        );
      }
    },
    [slashCommands, findLastSlashCommand, enableAtFiles, findLastAtTrigger, contextFiles.length],
  );

  const getFilteredCommands = useCallback(() => {
    if (!slashCommands) return [];
    return slashCommands.filter((cmd) =>
      cmd.name.toLowerCase().includes(slashFilter.toLowerCase()),
    );
  }, [slashCommands, slashFilter]);

  const handleSlashSelect = useCallback(
    (command: SlashCommand) => {
      setShowSlashMenu(false);
      if (command.type === 'skill' || command.type === 'sdk') {
        // Replace the slash trigger portion with /command-name + trailing space
        const before = text.slice(0, slashStart);
        const afterSlash = text.slice(slashStart);
        const spaceIdx = afterSlash.indexOf(' ', 1);
        const after = spaceIdx >= 0 ? afterSlash.slice(spaceIdx) : '';
        const replacement = `/${command.name} `;
        const newText = `${before}${replacement}${after.trimStart()}`;
        const cursorPos = before.length + replacement.length;
        pendingCursorRef.current = cursorPos;
        setText(newText);
      } else {
        // Builtin command — fire callback and remove the slash trigger portion
        const before = text.slice(0, slashStart);
        setText(before.trimEnd());
        onSlashCommand?.(command);
      }
      setSlashStart(-1);
    },
    [onSlashCommand, slashStart, text],
  );

  // When AtFileMenu navigates into a directory, update the input text
  const handleAtNavigate = useCallback(
    (relativePath: string) => {
      const before = text.slice(0, atStart);
      const afterAt = text.slice(atStart);
      // Find the end of the current @ token (next whitespace or end of string)
      const spaceMatch = afterAt.match(/^@\S*/);
      const tokenLen = spaceMatch ? spaceMatch[0].length : 1;
      const after = text.slice(atStart + tokenLen);
      const replacement = relativePath ? `@${relativePath}/` : '@';
      const newText = `${before}${replacement}${after}`;
      const cursorPos = before.length + replacement.length;
      pendingCursorRef.current = cursorPos;
      setText(newText);
      setAtFilter(relativePath ? `${relativePath}/` : '');
      setAtSelectedIndex(0);
    },
    [atStart, text],
  );

  const handleAtFileSelect = useCallback(
    (filePath: string, displayName: string) => {
      setShowAtMenu(false);
      const before = text.slice(0, atStart);
      const afterAt = text.slice(atStart);
      const spaceIdx = afterAt.indexOf(' ', 1);
      const after = spaceIdx >= 0 ? afterAt.slice(spaceIdx) : '';
      const replacement = `@${displayName} `;
      const newText = `${before}${replacement}${after.trimStart()}`;
      const cursorPos = before.length + replacement.length;
      pendingCursorRef.current = cursorPos;
      setContextFiles((prev) => [...prev, { path: filePath, displayName }]);
      setText(newText);
      setAtStart(-1);
    },
    [atStart, text],
  );

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    const ctxFiles = contextFiles.length > 0 ? contextFiles.map((cf) => cf.path) : undefined;
    if (enableAttachments) {
      onSend(trimmed, [...attachments], ctxFiles);
      setAttachments([]);
    } else {
      onSend(trimmed, undefined, ctxFiles);
    }
    setText('');
    setShowSlashMenu(false);
    setShowAtMenu(false);
    setContextFiles([]);
    setHistoryIndex(-1);
    draftTextRef.current = '';
  }, [text, isStreaming, onSend, enableAttachments, attachments, contextFiles]);

  // Sync highlight overlay scroll with textarea
  const handleTextareaScroll = useCallback(() => {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // Detect slash command and @file prefixes for highlight overlay
  const highlightParts: Array<{ type: 'text' | 'cmd' | 'atfile'; value: string }> | null = (() => {
    if (!text) return null;

    // Build a set of display names for quick lookup
    const atDisplayNames = new Set(contextFiles.map((cf) => cf.displayName));

    // Collect highlight ranges: { start, end, type }
    const ranges: Array<{ start: number; end: number; type: 'cmd' | 'atfile' }> = [];

    // Slash commands
    if (slashCommands) {
      const slashRegex = /(^|[\s\n])(\/\S+)/g;
      let m: RegExpExecArray | null;
      while ((m = slashRegex.exec(text)) !== null) {
        const cmdStart = m.index + m[1].length;
        const cmdEnd = cmdStart + m[2].length;
        if (cmdEnd >= text.length || text[cmdEnd] !== ' ') continue;
        ranges.push({ start: cmdStart, end: cmdEnd, type: 'cmd' });
      }
    }

    // @file references
    if (atDisplayNames.size > 0) {
      const atRegex = /(^|[\s\n])(@\S+)/g;
      let m: RegExpExecArray | null;
      while ((m = atRegex.exec(text)) !== null) {
        const atStart = m.index + m[1].length;
        const refText = m[2].slice(1); // remove leading @
        if (atDisplayNames.has(refText)) {
          ranges.push({ start: atStart, end: atStart + m[2].length, type: 'atfile' });
        }
      }
    }

    if (ranges.length === 0) return null;

    // Sort ranges by start position
    ranges.sort((a, b) => a.start - b.start);

    const parts: Array<{ type: 'text' | 'cmd' | 'atfile'; value: string }> = [];
    let lastIndex = 0;
    for (const range of ranges) {
      if (range.start > lastIndex) {
        parts.push({ type: 'text', value: text.slice(lastIndex, range.start) });
      }
      parts.push({ type: range.type, value: text.slice(range.start, range.end) });
      lastIndex = range.end;
    }
    if (lastIndex < text.length) {
      parts.push({ type: 'text', value: text.slice(lastIndex) });
    }
    return parts;
  })();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // IME composition guard: prevent sending during CJK input method composition
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;

    if (showSlashMenu) {
      const filtered = getFilteredCommands();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          handleSlashSelect(filtered[selectedIndex]);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSlashMenu(false);
        return;
      }
    }

    if (showAtMenu) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowAtMenu(false);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAtSelectedIndex((prev) => prev + 1);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAtSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        atMenuRef.current?.navigateInto(atSelectedIndex);
        setAtSelectedIndex(0);
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        atMenuRef.current?.navigateUp();
        setAtSelectedIndex(0);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        atMenuRef.current?.activateSelected(atSelectedIndex);
        return;
      }
    }

    // Input history navigation (ArrowUp/Down when cursor is at first/last line)
    if (inputHistory && inputHistory.length > 0 && !showSlashMenu && !showAtMenu) {
      const ta = textareaRef.current;
      if (e.key === 'ArrowUp' && ta) {
        // Only navigate history when cursor is on the first line
        const cursorPos = ta.selectionStart;
        const textBeforeCursor = text.slice(0, cursorPos);
        if (!textBeforeCursor.includes('\n')) {
          e.preventDefault();
          if (historyIndex === -1) {
            draftTextRef.current = text; // save current draft
          }
          const nextIndex = Math.min(historyIndex + 1, inputHistory.length - 1);
          setHistoryIndex(nextIndex);
          setText(inputHistory[nextIndex]);
          return;
        }
      }
      if (e.key === 'ArrowDown' && ta) {
        // Only navigate history when cursor is on the last line
        const cursorPos = ta.selectionStart;
        const textAfterCursor = text.slice(cursorPos);
        if (!textAfterCursor.includes('\n') && historyIndex >= 0) {
          e.preventDefault();
          const nextIndex = historyIndex - 1;
          if (nextIndex < 0) {
            setHistoryIndex(-1);
            setText(draftTextRef.current);
          } else {
            setHistoryIndex(nextIndex);
            setText(inputHistory[nextIndex]);
          }
          return;
        }
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="relative bg-bg-elevated border border-border rounded-2xl shadow-[var(--shadow-input)] transition-shadow focus-within:border-border-focus focus-within:shadow-[var(--shadow-md)]"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {showSlashMenu && slashCommands && (
        <SlashCommandMenu
          commands={slashCommands}
          filter={slashFilter}
          selectedIndex={selectedIndex}
          onSelect={handleSlashSelect}
          onClose={() => setShowSlashMenu(false)}
        />
      )}
      {showAtMenu && enableAtFiles && currentCwd && (
        <AtFileMenu
          ref={atMenuRef}
          cwd={currentCwd}
          filter={atFilter}
          selectedIndex={atSelectedIndex}
          onSelectFile={handleAtFileSelect}
          onNavigate={handleAtNavigate}
          onClose={() => setShowAtMenu(false)}
        />
      )}
      {enableAttachments && attachments.length > 0 && (
        <div className="px-3 pt-2">
          <AttachmentPreview files={attachments} onRemove={removeAttachment} />
        </div>
      )}
      <div className="relative">
        {/* Highlight overlay for slash command coloring */}
        {highlightParts && (
          <div
            ref={highlightRef}
            data-testid="input-highlight-overlay"
            className="absolute inset-0 w-full px-4 pt-3 pb-10 text-sm pointer-events-none overflow-hidden whitespace-pre-wrap break-words"
            style={{ maxHeight: '200px' }}
            aria-hidden="true"
          >
            {highlightParts.map((part, i) =>
              part.type === 'cmd' ? (
                <span key={i} className="text-accent">{part.value}</span>
              ) : part.type === 'atfile' ? (
                <span key={i} className="bg-accent/15 text-accent rounded px-0.5">{part.value}</span>
              ) : (
                <span key={i} className="text-text-primary">{part.value}</span>
              ),
            )}
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onScroll={handleTextareaScroll}
          placeholder={placeholder ?? t('input.placeholder')}
          disabled={disabled}
          rows={1}
          className={`w-full resize-none bg-transparent px-4 pt-3 pb-10 text-sm placeholder:text-text-muted focus:outline-none overflow-y-auto ${
            highlightParts ? 'text-transparent selection:bg-accent/20' : 'text-text-primary'
          }`}
          style={{ maxHeight: '200px', caretColor: highlightParts ? 'var(--color-text-primary)' : undefined }}
        />
      </div>
      {leftActions && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1">
          {leftActions}
        </div>
      )}
      <div className="absolute bottom-2 right-2 flex items-center gap-1">
        {statusText && (
          <span className="text-[10px] text-text-muted tabular-nums mr-1">{statusText}</span>
        )}
        {enableAttachments && (
          <>
            <button
              data-testid="attach-button"
              onClick={() => !attachmentsDisabledReason && fileInputRef.current?.click()}
              disabled={!!attachmentsDisabledReason}
              title={attachmentsDisabledReason}
              className={`p-2 rounded-lg transition-colors ${attachmentsDisabledReason ? 'text-text-muted opacity-40 cursor-not-allowed' : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'}`}
              aria-label={t('input.attach', 'Attach file')}
              type="button"
            >
              <Paperclip size={16} />
            </button>
            <input
              ref={fileInputRef}
              data-testid="file-input"
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInputChange}
              accept="image/*,.pdf,.txt,.md,.csv,.json"
            />
          </>
        )}
        {isStreaming ? (
          <button
            onClick={onAbort}
            className="p-2 rounded-lg bg-bg-tertiary hover:bg-error hover:text-white transition-colors text-text-secondary"
            aria-label={t('input.stop')}
          >
            <Square size={16} />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!text.trim() || disabled}
            className="p-2 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('input.send')}
          >
            <ArrowUp size={16} />
          </button>
        )}
      </div>
    </div>
  );
});
