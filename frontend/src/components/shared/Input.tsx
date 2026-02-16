import { useState, useRef, useCallback, useEffect } from 'react';
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
  placeholder?: string;
}

export function Input({ onSend, onAbort, isStreaming, disabled, slashCommands, onSlashCommand, enableAttachments, placeholder }: InputProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Detect slash command trigger
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setText(value);

      if (slashCommands && slashCommands.length > 0 && value.startsWith('/')) {
        const filter = value.slice(1).split(' ')[0] || '';
        // Only show menu if there's no space after the command (still typing the command name)
        if (!value.includes(' ') || value === '/') {
          setSlashFilter(filter);
          setShowSlashMenu(true);
          setSelectedIndex(0);
          return;
        }
      }
      setShowSlashMenu(false);
    },
    [slashCommands],
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
        // Insert /command-name with trailing space
        setText(`/${command.name} `);
      } else {
        // Builtin command — fire callback and clear
        setText('');
        onSlashCommand?.(command);
      }
    },
    [onSlashCommand],
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

  // Detect slash command prefix for highlight (e.g. "/brainstorming some args")
  const slashHighlight = slashCommands && /^\/(\S+)\s/.test(text)
    ? text.match(/^(\/\S+)(.*)$/s)
    : null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
        {slashHighlight && (
          <div
            ref={highlightRef}
            data-testid="input-highlight-overlay"
            className="absolute inset-0 w-full px-4 pt-3 pb-10 text-sm pointer-events-none overflow-hidden whitespace-pre-wrap break-words"
            style={{ maxHeight: '200px' }}
            aria-hidden="true"
          >
            <span className="text-accent font-medium">{slashHighlight[1]}</span>
            <span className="text-text-primary">{slashHighlight[2]}</span>
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
            slashHighlight ? 'text-transparent selection:bg-accent/20' : 'text-text-primary'
          }`}
          style={{ maxHeight: '200px', caretColor: slashHighlight ? 'var(--color-text-primary)' : undefined }}
        />
      </div>
      <div className="absolute bottom-2 right-2 flex items-center gap-1">
        {enableAttachments && (
          <>
            <button
              data-testid="attach-button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
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
