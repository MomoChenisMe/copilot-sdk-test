import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Plus, X, MessageSquare } from 'lucide-react';
import { useAppStore } from '../../store';
import { modelSupportsAttachments } from '../../lib/model-capabilities';
import { MessageBlock } from './MessageBlock';
import { StreamingText } from './StreamingText';
import { ToolRecord } from './ToolRecord';
import { ToolRecordErrorBoundary } from './ToolRecordErrorBoundary';
import { ToolResultBlock } from './ToolResultBlock';
import { ReasoningBlock } from './ReasoningBlock';
import { ModelSelector } from './ModelSelector';
import { CwdSelector } from './CwdSelector';
import { Input } from '../shared/Input';
import { UsageBar } from './UsageBar';
import { ScrollToBottom } from './ScrollToBottom';
import PlanActToggle from './PlanActToggle';
import { UserInputDialog } from './UserInputDialog';
import { TaskPanel } from './TaskPanel';
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
  onUserInputResponse?: (requestId: string, answer: string, wasFreeform: boolean) => void;
  onOpenConversation?: (conversationId: string) => void;
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
  onUserInputResponse,
  onOpenConversation,
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
  const setTabPlanMode = useAppStore((s) => s.setTabPlanMode);
  const setTabUserInputRequest = useAppStore((s) => s.setTabUserInputRequest);
  const userInputRequest = tab?.userInputRequest ?? null;
  const tabMode = tab?.mode ?? 'copilot';
  const isTerminalMode = tabMode === 'terminal';
  const planMode = tab?.planMode ?? false;
  const showPlanCompletePrompt = tab?.showPlanCompletePrompt ?? false;
  const tasks = tab?.tasks ?? [];
  const setTabShowPlanCompletePrompt = useAppStore((s) => s.setTabShowPlanCompletePrompt);

  const handleModeChange = useCallback(
    (mode: 'copilot' | 'terminal') => {
      if (tabId) setTabMode(tabId, mode);
    },
    [tabId, setTabMode],
  );

  const handlePlanModeToggle = useCallback(
    (newPlanMode: boolean) => {
      if (tabId) setTabPlanMode(tabId, newPlanMode);
    },
    [tabId, setTabPlanMode],
  );

  const handleSwitchToAct = useCallback(() => {
    if (tabId) {
      setTabPlanMode(tabId, false); // This also clears showPlanCompletePrompt
    }
  }, [tabId, setTabPlanMode]);

  const handleDismissPlanPrompt = useCallback(() => {
    if (tabId) {
      setTabShowPlanCompletePrompt(tabId, false);
    }
  }, [tabId, setTabShowPlanCompletePrompt]);

  const handleUserInputSubmit = useCallback(
    (answer: string, wasFreeform: boolean) => {
      if (!userInputRequest || !tabId) return;
      onUserInputResponse?.(userInputRequest.requestId, answer, wasFreeform);
      setTabUserInputRequest(tabId, null);
    },
    [userInputRequest, tabId, onUserInputResponse, setTabUserInputRequest],
  );

  const handleUserInputSkip = useCallback(() => {
    if (!userInputRequest || !tabId) return;
    onUserInputResponse?.(userInputRequest.requestId, 'User chose to skip. Please decide on your own and continue.', true);
    setTabUserInputRequest(tabId, null);
  }, [userInputRequest, tabId, onUserInputResponse, setTabUserInputRequest]);

  const handleTimeoutDismiss = useCallback(() => {
    if (!tabId) return;
    setTabUserInputRequest(tabId, null);
  }, [tabId, setTabUserInputRequest]);

  const handleTerminalSend = useCallback(
    (text: string) => {
      onBashSend?.(text);
    },
    [onBashSend],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const isAutoScrolling = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 50;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    isAutoScrolling.current = isAtBottom;
    setShowScrollButton(!isAtBottom);
    if (isAtBottom) setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (isAutoScrolling.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    } else {
      setUnreadCount((prev) => prev + 1);
    }
  }, [messages, streamingText, toolRecords]);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
    setShowScrollButton(false);
    setUnreadCount(0);
  }, []);

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

  // Recent conversations for welcome page
  const conversations = useAppStore((s) => s.conversations);
  const recentConversations = useMemo(() => conversations.slice(0, 10), [conversations]);

  const showStreamingBlock = isStreaming || streamingText || toolRecords.length > 0 || turnSegments.length > 0 || copilotError;

  // Model-based attachment gating
  const canAttach = !isTerminalMode && modelSupportsAttachments(currentModel);
  const attachmentsDisabledReason = !isTerminalMode && !modelSupportsAttachments(currentModel)
    ? t('input.modelNoAttachments', 'This model does not support file attachments')
    : undefined;

  // Welcome screen — no active conversation/tab
  if (!tabId && !activeConversationId) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto flex items-center justify-center">
          <div className="text-center px-4 max-w-lg">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-accent-soft flex items-center justify-center">
              <Sparkles size={28} className="text-accent" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-text-primary mb-2">
              {t('chat.welcomeTitle')}
            </h2>
            <p className="text-sm leading-relaxed text-text-secondary mb-6 max-w-md mx-auto">
              {t('chat.welcomeDescription')}
            </p>
            <button
              onClick={onNewConversation}
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent-hover transition-colors shadow-[var(--shadow-sm)]"
            >
              <Plus size={18} />
              {t('chat.startConversation')}
            </button>

            {/* Recent conversations */}
            {recentConversations.length > 0 && (
              <div data-testid="recent-conversations" className="mt-8 text-left">
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 px-1">
                  {t('chat.recentConversations')}
                </h3>
                <div className="space-y-1">
                  {recentConversations.map((conv) => (
                    <button
                      key={conv.id}
                      data-testid={`recent-conv-${conv.id}`}
                      onClick={() => onOpenConversation?.(conv.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
                    >
                      <MessageSquare size={14} className="shrink-0 text-text-muted" />
                      <span className="truncate flex-1">{conv.title}</span>
                      {conv.model && (
                        <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted">
                          {conv.model.split('/').pop()?.split('-').slice(0, 2).join('-') || conv.model}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Loading state — tab has a conversation but messages haven't loaded yet
  if (tab && tab.conversationId && !tab.messagesLoaded && messages.length === 0 && !showStreamingBlock) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto flex items-center justify-center">
          <div data-testid="messages-loading" className="flex items-center gap-2 text-text-muted text-sm">
            <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            {t('chat.loading', 'Loading...')}
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
              {tabId && <PlanActToggle planMode={planMode} onToggle={handlePlanModeToggle} disabled={isStreaming} />}
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
              enableAttachments={canAttach}
              attachmentsDisabledReason={attachmentsDisabledReason}
              placeholder={isTerminalMode ? t('terminal.placeholder', '$ enter command...') : undefined}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Plan mode banner */}
      {planMode && (
        <div data-testid="plan-mode-banner" className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-xs text-center">
          {t('planMode.active', 'Plan mode active — AI will plan but not execute tools')}
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-hidden relative">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto"
      >
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {/* Task panel */}
          {tasks.length > 0 && <TaskPanel tasks={tasks} />}

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

          {/* Waiting for user input indicator */}
          {userInputRequest && (
            <div data-testid="waiting-for-input" className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-sm">
              <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin shrink-0" />
              {t('chat.waitingForResponse', 'Waiting for your response...')}
            </div>
          )}

          {/* Plan mode complete prompt */}
          {showPlanCompletePrompt && !isStreaming && (
            <div data-testid="plan-complete-prompt" className="max-w-3xl mx-auto px-4 mb-4">
              <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <span className="text-sm text-amber-600 dark:text-amber-400 flex-1">
                  {t('planMode.planComplete')}
                </span>
                <button
                  data-testid="switch-to-act-btn"
                  onClick={handleSwitchToAct}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors"
                >
                  {t('planMode.switchToAct')}
                </button>
                <button
                  data-testid="dismiss-plan-prompt-btn"
                  onClick={handleDismissPlanPrompt}
                  className="px-3 py-1.5 text-xs font-medium text-text-secondary bg-bg-tertiary rounded-lg hover:bg-bg-secondary transition-colors"
                >
                  {t('planMode.stayInPlan')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ScrollToBottom
        visible={showScrollButton}
        unreadCount={unreadCount}
        onClick={scrollToBottom}
      />
      </div>

      {/* Usage bar */}
      {tab?.usage && (
        <div className="px-4">
          <div className="max-w-3xl mx-auto">
            <UsageBar
              inputTokens={tab.usage.inputTokens}
              outputTokens={tab.usage.outputTokens}
              cacheReadTokens={tab.usage.cacheReadTokens}
              cacheWriteTokens={tab.usage.cacheWriteTokens}
              contextWindowUsed={tab.usage.contextWindowUsed}
              contextWindowMax={tab.usage.contextWindowMax}
              premiumRequestsUsed={tab.usage.premiumRequestsUsed}
              premiumRequestsLocal={tab.usage.premiumRequestsLocal}
              premiumRequestsTotal={tab.usage.premiumRequestsTotal}
              premiumResetDate={tab.usage.premiumResetDate}
              premiumUnlimited={tab.usage.premiumUnlimited}
              model={tab.usage.model}
            />
          </div>
        </div>
      )}

      {/* Input area (shrink-0) */}
      <div className="shrink-0 pb-4 pt-2 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="mb-2 flex items-center gap-2">
            <ModelSelector currentModel={currentModel} onSelect={onModelChange} />
            {currentCwd && onCwdChange && (
              <CwdSelector currentCwd={currentCwd} onCwdChange={onCwdChange} mode={tabMode} onModeChange={handleModeChange} />
            )}
            {tabId && <PlanActToggle planMode={planMode} onToggle={handlePlanModeToggle} disabled={isStreaming} />}
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
            enableAttachments={canAttach}
            attachmentsDisabledReason={attachmentsDisabledReason}
            placeholder={isTerminalMode ? t('terminal.placeholder', '$ enter command...') : undefined}
          />
        </div>
      </div>

      {/* User input request dialog */}
      {userInputRequest && (
        <UserInputDialog
          question={userInputRequest.question}
          choices={userInputRequest.choices}
          allowFreeform={userInputRequest.allowFreeform}
          timedOut={userInputRequest.timedOut}
          onSubmit={handleUserInputSubmit}
          onSkip={handleUserInputSkip}
          onDismissTimeout={handleTimeoutDismiss}
        />
      )}
    </div>
  );
}
