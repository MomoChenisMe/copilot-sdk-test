import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, Square, Paperclip } from 'lucide-react';
import { SlashCommandMenu } from './SlashCommandMenu';
import type { SlashCommand } from './SlashCommandMenu';
import { AttachmentPreview } from './AttachmentPreview';
import type { AttachedFile } from './AttachmentPreview';

interface InputProps {
  onSend: (text: string, attachments?: AttachedFile[]) => void;
  onAbort: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  slashCommands?: SlashCommand[];
  onSlashCommand?: (command: SlashCommand) => void;
  enableAttachments?: boolean;
  attachmentsDisabledReason?: string;
  placeholder?: string;
}

export function Input({ onSend, onAbort, isStreaming, disabled, slashCommands, onSlashCommand, enableAttachments, attachmentsDisabledReason, placeholder }: InputProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [slashStart, setSlashStart] = useState(-1); // character index where the active "/" was typed
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingCursorRef = useRef<number | null>(null);

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
          return;
        }
      }
      setSlashStart(-1);
      setShowSlashMenu(false);
    },
    [slashCommands, findLastSlashCommand],
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

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    if (enableAttachments) {
      onSend(trimmed, [...attachments]);
      setAttachments([]);
    } else {
      onSend(trimmed);
    }
    setText('');
    setShowSlashMenu(false);
  }, [text, isStreaming, onSend, enableAttachments, attachments]);

  // Sync highlight overlay scroll with textarea
  const handleTextareaScroll = useCallback(() => {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // Detect slash command prefixes for highlight (supports multiple commands)
  // Finds all slash commands preceded by start-of-string or whitespace that have trailing content
  const slashHighlightParts: Array<{ type: 'text' | 'cmd'; value: string }> | null = (() => {
    if (!slashCommands || !text) return null;
    const regex = /(^|[\s\n])(\/\S+)/g;
    const parts: Array<{ type: 'text' | 'cmd'; value: string }> = [];
    let lastIndex = 0;
    let hasCmd = false;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const cmdStart = match.index + match[1].length;
      // Only highlight if this command has trailing content (space after it)
      const cmdEnd = cmdStart + match[2].length;
      if (cmdEnd >= text.length || text[cmdEnd] !== ' ') continue;
      if (cmdStart > lastIndex) {
        parts.push({ type: 'text', value: text.slice(lastIndex, cmdStart) });
      }
      parts.push({ type: 'cmd', value: match[2] });
      lastIndex = cmdEnd;
      hasCmd = true;
    }
    if (!hasCmd) return null;
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
      {enableAttachments && attachments.length > 0 && (
        <div className="px-3 pt-2">
          <AttachmentPreview files={attachments} onRemove={removeAttachment} />
        </div>
      )}
      <div className="relative">
        {/* Highlight overlay for slash command coloring */}
        {slashHighlightParts && (
          <div
            ref={highlightRef}
            data-testid="input-highlight-overlay"
            className="absolute inset-0 w-full px-4 pt-3 pb-10 text-sm pointer-events-none overflow-hidden whitespace-pre-wrap break-words"
            style={{ maxHeight: '200px' }}
            aria-hidden="true"
          >
            {slashHighlightParts.map((part, i) =>
              part.type === 'cmd' ? (
                <span key={i} className="text-accent">{part.value}</span>
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
            slashHighlightParts ? 'text-transparent selection:bg-accent/20' : 'text-text-primary'
          }`}
          style={{ maxHeight: '200px', caretColor: slashHighlightParts ? 'var(--color-text-primary)' : undefined }}
        />
      </div>
      <div className="absolute bottom-2 right-2 flex items-center gap-1">
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
}
