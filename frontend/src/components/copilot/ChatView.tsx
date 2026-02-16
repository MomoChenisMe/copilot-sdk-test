import { useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Plus, X } from 'lucide-react';
import { useAppStore } from '../../store';
import { MessageBlock } from './MessageBlock';
import { StreamingText } from './StreamingText';
import { ToolRecord } from './ToolRecord';
import { ToolRecordErrorBoundary } from './ToolRecordErrorBoundary';
import { ToolResultBlock } from './ToolResultBlock';
import { ReasoningBlock } from './ReasoningBlock';
import { ModelSelector } from './ModelSelector';
import { CwdSelector } from './CwdSelector';
import { Input } from '../shared/Input';
import type { SlashCommand } from '../shared/SlashCommandMenu';

const INLINE_RESULT_TOOLS = ['bash', 'shell', 'execute', 'run'];

interface ChatViewProps {
  tabId?: string | null;
  onNewConversation: () => void;
  onSend: (text: string, files?: import('../shared/AttachmentPreview').AttachedFile[]) => void;
  onAbort: () => void;
  onBashSend?: (command: string) => void;
  isStreaming: boolean;
  disabled: boolean;
  currentModel: string;
  onModelChange: (modelId: string) => void;
  currentCwd?: string;
  onCwdChange?: (newCwd: string) => void;
  onClearConversation?: () => void;
  onSettingsOpen?: () => void;
}

export function ChatView({
  tabId,
  onNewConversation,
  onSend,
  onAbort,
  onBashSend,
  isStreaming,
  disabled,
  currentModel,
  onModelChange,
  currentCwd,
  onCwdChange,
  onClearConversation,
  onSettingsOpen,
}: ChatViewProps) {
  const { t } = useTranslation();
  const activeConversationId = useAppStore((s) => s.activeConversationId);

  // Always call all hooks unconditionally (Rules of Hooks), then pick the right value
  const tab = useAppStore((s) => tabId ? s.tabs[tabId] : null);
  const globalMessages = useAppStore((s) => s.messages);
  const globalStreamingText = useAppStore((s) => s.streamingText);
  const globalToolRecords = useAppStore((s) => s.toolRecords);
  const globalReasoningText = useAppStore((s) => s.reasoningText);
  const globalTurnSegments = useAppStore((s) => s.turnSegments);
  const globalCopilotError = useAppStore((s) => s.copilotError);

  const messages = tab?.messages ?? globalMessages;
  const streamingText = tab?.streamingText ?? globalStreamingText;
  const toolRecords = tab?.toolRecords ?? globalToolRecords;
  const reasoningText = tab?.reasoningText ?? globalReasoningText;
  const turnSegments = tab?.turnSegments ?? globalTurnSegments;
  const copilotError = tab?.copilotError ?? globalCopilotError;
  const activePresets = useAppStore((s) => s.activePresets);
  const removePreset = useAppStore((s) => s.removePreset);
  const skills = useAppStore((s) => s.skills);
  const disabledSkills = useAppStore((s) => s.disabledSkills);
  const sdkCommands = useAppStore((s) => s.sdkCommands);
  const setTabMode = useAppStore((s) => s.setTabMode);
  const tabMode = tab?.mode ?? 'copilot';
  const isTerminalMode = tabMode === 'terminal';

  const handleModeChange = useCallback(
    (mode: 'copilot' | 'terminal') => {
      if (tabId) setTabMode(tabId, mode);
    },
    [tabId, setTabMode],
  );

  const handleTerminalSend = useCallback(
    (text: string) => {
      onBashSend?.(text);
    },
    [onBashSend],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const isAutoScrolling = useRef(true);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 50;
    isAutoScrolling.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  useEffect(() => {
    if (isAutoScrolling.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText, toolRecords]);

  // Assemble slash commands from builtin + enabled skills
  const slashCommands: SlashCommand[] = useMemo(() => {
    const builtin: SlashCommand[] = [
      { name: 'clear', description: t('slashCommand.clearDesc', 'Clear conversation'), type: 'builtin' },
      { name: 'settings', description: t('slashCommand.settingsDesc', 'Open settings'), type: 'builtin' },
      { name: 'new', description: t('slashCommand.newDesc', 'New conversation'), type: 'builtin' },
    ];
    const skillCmds: SlashCommand[] = skills
      .filter((s) => !disabledSkills.includes(s.name))
      .map((s) => ({ name: s.name, description: s.description, type: 'skill' as const }));
    const sdkCmds: SlashCommand[] = sdkCommands.map((c) => ({
      name: c.name,
      description: c.description,
      type: 'sdk' as const,
    }));
    return [...builtin, ...skillCmds, ...sdkCmds];
  }, [skills, disabledSkills, sdkCommands, t]);

  const handleSlashCommand = useCallback(
    (command: SlashCommand) => {
      if (command.type === 'builtin') {
        switch (command.name) {
          case 'clear':
            onClearConversation?.();
            break;
          case 'settings':
            onSettingsOpen?.();
            break;
          case 'new':
            onNewConversation();
            break;
        }
      }
    },
    [onClearConversation, onSettingsOpen, onNewConversation],
  );

  const showStreamingBlock = isStreaming || streamingText || toolRecords.length > 0 || turnSegments.length > 0 || copilotError;

  // Welcome screen — no active conversation/tab
  if (!tabId && !activeConversationId) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto flex items-center justify-center">
          <div className="text-center px-4">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-accent-soft flex items-center justify-center">
              <Sparkles size={28} className="text-accent" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-text-primary mb-2">
              {t('chat.welcomeTitle')}
            </h2>
            <p className="text-sm leading-relaxed text-text-secondary mb-6 max-w-md">
              {t('chat.welcomeDescription')}
            </p>
            <button
              onClick={onNewConversation}
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent-hover transition-colors shadow-[var(--shadow-sm)]"
            >
              <Plus size={18} />
              {t('chat.startConversation')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty conversation prompt
  if (messages.length === 0 && !showStreamingBlock) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto flex items-center justify-center">
          <p className="text-text-muted text-sm">{t('chat.emptyPrompt')}</p>
        </div>
        {/* Input area */}
        <div className="shrink-0 pb-4 pt-2 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="mb-2 flex items-center gap-2">
              <ModelSelector currentModel={currentModel} onSelect={onModelChange} />
              {currentCwd && onCwdChange && (
                <CwdSelector currentCwd={currentCwd} onCwdChange={onCwdChange} mode={tabMode} onModeChange={handleModeChange} />
              )}
            </div>
            {activePresets.length > 0 && (
              <div data-testid="preset-pills" className="mb-2 flex gap-1.5 overflow-x-auto whitespace-nowrap">
                {activePresets.map((name) => (
                  <span
                    key={name}
                    data-testid={`preset-pill-${name}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-accent-soft text-accent border border-accent/20"
                  >
                    {name}
                    <button
                      data-testid={`preset-pill-remove-${name}`}
                      onClick={() => removePreset(name)}
                      className="hover:text-error"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <Input
              onSend={isTerminalMode ? handleTerminalSend : onSend}
              onAbort={onAbort}
              isStreaming={isStreaming}
              disabled={disabled}
              slashCommands={isTerminalMode ? undefined : slashCommands}
              onSlashCommand={isTerminalMode ? undefined : handleSlashCommand}
              enableAttachments={!isTerminalMode}
              placeholder={isTerminalMode ? t('terminal.placeholder', '$ enter command...') : undefined}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Historical messages */}
          {messages.map((msg) => (
            <MessageBlock key={msg.id} message={msg} />
          ))}

          {/* Active streaming block */}
          {showStreamingBlock && (
            <div className="mb-6">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-accent-soft flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={16} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-text-muted mb-2 block">
                    {t('chat.assistant')}
                  </span>

                  {/* Render turnSegments if available, otherwise fallback */}
                  {turnSegments.length > 0 ? (
                    <>
                      {/* Mid-stream: reasoning_delta accumulated but reasoning complete not yet arrived */}
                      {!turnSegments.some(s => s.type === 'reasoning') && reasoningText && (
                        <ReasoningBlock text={reasoningText} isStreaming={isStreaming} />
                      )}
                      {turnSegments.map((segment, index) => {
                        switch (segment.type) {
                          case 'reasoning':
                            return <ReasoningBlock key={`reasoning-${index}`} text={segment.content} isStreaming={false} />;
                          case 'tool': {
                            const showResult = INLINE_RESULT_TOOLS.includes(segment.toolName) &&
                              segment.status !== 'running' &&
                              (segment.result != null || segment.error != null);
                            const resultValue = segment.result ?? segment.error;
                            return (
                              <div key={`tool-${segment.toolCallId}`}>
                                <ToolRecordErrorBoundary>
                                  <ToolRecord record={segment} />
                                </ToolRecordErrorBoundary>
                                {showResult && (
                                  <ToolResultBlock result={resultValue} toolName={segment.toolName} status={segment.status} />
                                )}
                              </div>
                            );
                          }
                          case 'text':
                            return null; // Text segments are handled via streamingText
                          default:
                            return null;
                        }
                      })}
                      {/* Streaming text at the end */}
                      {(streamingText || isStreaming) && (
                        <StreamingText text={streamingText} isStreaming={isStreaming} />
                      )}
                    </>
                  ) : (
                    <>
                      {/* Fallback: old rendering order */}
                      <ReasoningBlock text={reasoningText} isStreaming={isStreaming} />

                      {toolRecords.map((record) => (
                        <ToolRecordErrorBoundary key={record.toolCallId}>
                          <ToolRecord record={record} />
                        </ToolRecordErrorBoundary>
                      ))}

                      {(streamingText || isStreaming) && (
                        <StreamingText text={streamingText} isStreaming={isStreaming} />
                      )}
                    </>
                  )}

                  {/* Error */}
                  {copilotError && (
                    <div className="mt-2 p-3 bg-error-soft border border-error/30 rounded-lg text-error text-sm">
                      {copilotError}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input area (shrink-0) */}
      <div className="shrink-0 pb-4 pt-2 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="mb-2 flex items-center gap-2">
            <ModelSelector currentModel={currentModel} onSelect={onModelChange} />
            {currentCwd && onCwdChange && (
              <CwdSelector currentCwd={currentCwd} onCwdChange={onCwdChange} mode={tabMode} onModeChange={handleModeChange} />
            )}
          </div>
          {activePresets.length > 0 && (
            <div data-testid="preset-pills" className="mb-2 flex gap-1.5 overflow-x-auto whitespace-nowrap">
              {activePresets.map((name) => (
                <span
                  key={name}
                  data-testid={`preset-pill-${name}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-accent-soft text-accent border border-accent/20"
                >
                  {name}
                  <button
                    data-testid={`preset-pill-remove-${name}`}
                    onClick={() => removePreset(name)}
                    className="hover:text-error"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <Input
            onSend={isTerminalMode ? handleTerminalSend : onSend}
            onAbort={onAbort}
            isStreaming={isStreaming}
            disabled={disabled}
            slashCommands={isTerminalMode ? undefined : slashCommands}
            onSlashCommand={isTerminalMode ? undefined : handleSlashCommand}
            enableAttachments={!isTerminalMode}
            placeholder={isTerminalMode ? t('terminal.placeholder', '$ enter command...') : undefined}
          />
        </div>
      </div>
    </div>
  );
}
