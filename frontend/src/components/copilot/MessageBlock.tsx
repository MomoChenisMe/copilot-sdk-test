import { useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Message, MessageMetadata, AttachmentMeta, TurnSegment } from '../../lib/api';
import { useAppStore } from '../../store';
import { Markdown } from '../shared/Markdown';
import { useLightbox } from '../shared/LightboxContext';
import { BashPrompt } from './BashPrompt';
import { BashOutput } from './BashOutput';
import { ReasoningBlock } from './ReasoningBlock';
import { ToolRecord } from './ToolRecord';
import { ToolRecordErrorBoundary } from './ToolRecordErrorBoundary';
import { ToolResultBlock } from './ToolResultBlock';
import { parseArtifacts, parseToolArtifacts } from '../../lib/artifact-parser';
import { Sparkles, FileText, Code, Globe, Image as ImageIcon } from 'lucide-react';
import { ContextCard } from './ContextCard';

const INLINE_RESULT_TOOLS = ['bash', 'shell', 'execute', 'run'];

const COMMAND_RE = /^\/(\S+)(?:\s(.*))?$/s;

function renderUserContent(content: string, skills: Array<{ name: string; description: string }>) {
  const match = COMMAND_RE.exec(content);
  if (!match) {
    return <p className="text-sm leading-relaxed text-text-primary whitespace-pre-wrap">{content}</p>;
  }
  const commandName = match[1];
  const rest = match[2]?.trim();
  const matchedSkill = skills.find((s) => s.name === commandName);
  return (
    <>
      <p className="text-sm leading-relaxed text-text-primary whitespace-pre-wrap">
        <span
          data-testid="command-badge"
          className="inline-flex px-1.5 py-0.5 rounded-md bg-accent/15 text-accent font-medium text-xs"
        >
          /{commandName}
        </span>
        {rest ? ` ${rest}` : ''}
      </p>
      {matchedSkill && (
        <details data-testid="skill-details" className="mt-1.5">
          <summary className="text-xs text-text-muted cursor-pointer hover:text-text-secondary transition-colors">
            {commandName}
          </summary>
          <p className="mt-1 text-xs text-text-secondary pl-2 border-l-2 border-border">
            {matchedSkill.description}
          </p>
        </details>
      )}
    </>
  );
}

interface MessageBlockProps {
  message: Message;
}

export function MessageBlock({ message }: MessageBlockProps) {
  const { t } = useTranslation();
  const skills = useAppStore((s) => s.skills);
  const { openLightbox } = useLightbox();
  const isUser = message.role === 'user';

  if (isUser) {
    const userMeta = message.metadata as (MessageMetadata & { bash?: boolean }) | null | undefined;
    const attachments = userMeta?.attachments;

    // Bash command: render as terminal prompt
    if (userMeta?.bash) {
      // Backward compat: old format stored content as "$ command\noutput\n[exit code: N]"
      // New format stores just the command. Strip leading "$ " if present.
      const displayContent = message.content.startsWith('$ ') ? message.content.slice(2) : message.content;
      return (
        <div className="mb-2" data-testid="bash-command">
          <pre className="text-xs font-mono text-text-secondary">
            <span className="text-accent font-medium">$</span> {displayContent}
          </pre>
        </div>
      );
    }

    return (
      <div className="flex justify-end mb-6">
        <div
          data-testid="user-bubble"
          className="max-w-[85%] bg-user-msg-bg border border-user-msg-border rounded-2xl rounded-br-sm px-4 py-3"
        >
          {attachments && attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {(() => {
                const imageAttachments = attachments.filter((a: AttachmentMeta) => a.mimeType.startsWith('image/'));
                return attachments.map((a: AttachmentMeta) =>
                  a.mimeType.startsWith('image/') ? (
                    <img
                      key={a.id}
                      src={`/api/upload/${a.id}`}
                      alt={a.originalName}
                      className="w-24 h-24 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => {
                        const images = imageAttachments.map((img: AttachmentMeta) => ({
                          src: `/api/upload/${img.id}`,
                          alt: img.originalName,
                        }));
                        const idx = imageAttachments.findIndex((img: AttachmentMeta) => img.id === a.id);
                        openLightbox(images, idx);
                      }}
                    />
                  ) : (
                    <span
                      key={a.id}
                      className="inline-flex items-center px-2 py-1 rounded-md bg-bg-tertiary text-xs text-text-secondary"
                    >
                      {a.originalName}
                    </span>
                  ),
                );
              })()}
            </div>
          )}
          {renderUserContent(message.content, skills)}
        </div>
      </div>
    );
  }

  // Parse metadata for assistant messages
  const metadata = message.metadata as (MessageMetadata & {
    exitCode?: number;
    user?: string;
    hostname?: string;
    gitBranch?: string;
    cwd?: string;
  }) | null | undefined;
  const isTerminalOutput = typeof metadata?.exitCode === 'number';

  // Terminal output rendering with Oh My Posh style
  if (isTerminalOutput) {
    const { user, hostname, gitBranch } = metadata;
    const hasBashEnv = !!(user && hostname);
    return (
      <div className="mb-4">
        {hasBashEnv && (
          <BashPrompt
            user={user}
            hostname={hostname}
            cwd={metadata.cwd ?? ''}
            gitBranch={gitBranch}
          />
        )}
        <BashOutput content={message.content} exitCode={metadata.exitCode!} />
      </div>
    );
  }

  // Context card rendering
  if (message.role === 'system' && (metadata as any)?.type === 'context' && (metadata as any)?.contextData) {
    return (
      <div className="mb-4 flex gap-3" data-testid="context-card-wrapper">
        <div className="shrink-0 w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center mt-0.5">
          <Sparkles size={14} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <ContextCard data={(metadata as any).contextData} />
        </div>
      </div>
    );
  }

  const turnSegments = metadata?.turnSegments;
  const toolRecords = metadata?.toolRecords;
  const reasoning = metadata?.reasoning;

  // Detect artifacts from message content AND tool records
  const artifacts = useMemo(() => {
    const contentArtifacts = message.content ? parseArtifacts(message.content) : [];
    const toolArtifacts = toolRecords ? parseToolArtifacts(toolRecords) : [];
    return [...contentArtifacts, ...toolArtifacts];
  }, [message.content, toolRecords]);

  // Auto-open artifacts panel when new artifacts are detected
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (artifacts.length > 0 && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      const state = useAppStore.getState();
      const tabId = state.activeTabId;
      if (tabId) {
        state.addTabArtifacts(tabId, artifacts);
        state.setTabActiveArtifact(tabId, artifacts[0].id);
        state.setTabArtifactsPanelOpen(tabId, true);
      }
    }
  }, [artifacts]);

  // Render content area based on turnSegments availability
  const renderContent = () => {
    // New path: ordered turnSegments rendering
    if (turnSegments && turnSegments.length > 0) {
      // Canonical order: reasoning first, then tools/text in original order
      const reasoningSegments = turnSegments.filter(s => s.type === 'reasoning');
      const nonReasoningSegments = turnSegments.filter(s => s.type !== 'reasoning');

      return (
        <>
          {/* Legacy fallback: turnSegments has no reasoning entry but metadata.reasoning exists */}
          {reasoningSegments.length === 0 && reasoning && (
            <ReasoningBlock text={reasoning} isStreaming={false} />
          )}
          {/* Always render reasoning first */}
          {reasoningSegments.map((segment, index) => (
            <ReasoningBlock key={`reasoning-${index}`} text={segment.content} isStreaming={false} />
          ))}
          {/* Then tools and text in their original order */}
          {nonReasoningSegments.map((segment, index) => {
            switch (segment.type) {
              case 'text':
                return (
                  <div key={`text-${index}`} className="text-sm leading-relaxed">
                    <Markdown content={segment.content} />
                  </div>
                );
              case 'tool': {
                const toolSeg = segment as TurnSegment & { type: 'tool' };
                const isInlineTool = INLINE_RESULT_TOOLS.includes(toolSeg.toolName);
                const showResult = isInlineTool &&
                  toolSeg.status !== 'running' &&
                  (toolSeg.result != null || toolSeg.error != null);
                const resultValue = toolSeg.result ?? toolSeg.error;
                return (
                  <div key={`tool-${toolSeg.toolCallId}`}>
                    <ToolRecordErrorBoundary>
                      <ToolRecord record={toolSeg} />
                    </ToolRecordErrorBoundary>
                    {showResult && (
                      <ToolResultBlock result={resultValue} toolName={toolSeg.toolName} status={toolSeg.status} />
                    )}
                  </div>
                );
              }
              default:
                return null;
            }
          })}
        </>
      );
    }

    // Fallback: old rendering order (reasoning → tools → text)
    return (
      <>
        {reasoning && (
          <ReasoningBlock text={reasoning} isStreaming={false} />
        )}
        {toolRecords && toolRecords.map((record) => (
          <ToolRecordErrorBoundary key={record.toolCallId}>
            <ToolRecord record={record} />
          </ToolRecordErrorBoundary>
        ))}
        {message.content && (
          <div className="text-sm leading-relaxed">
            <Markdown content={message.content} />
          </div>
        )}
      </>
    );
  };

  // Assistant message
  return (
    <div className="mb-6">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-accent-soft flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles size={16} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-text-muted mb-2 block">
            {t('chat.assistant')}
          </span>
          {renderContent()}
          {artifacts.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {artifacts.map((artifact, index) => {
                const iconMap = {
                  markdown: <FileText size={14} />,
                  code: <Code size={14} />,
                  html: <Globe size={14} />,
                  svg: <ImageIcon size={14} />,
                  mermaid: <ImageIcon size={14} />,
                };
                return (
                  <button
                    key={artifact.id}
                    data-testid={`artifact-card-${index}`}
                    onClick={() => {
                      const state = useAppStore.getState();
                      const tabId = state.activeTabId;
                      if (tabId) {
                        state.addTabArtifacts(tabId, [artifact]);
                        state.setTabActiveArtifact(tabId, artifact.id);
                        state.setTabArtifactsPanelOpen(tabId, true);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-bg-secondary hover:bg-bg-tertiary transition-colors cursor-pointer"
                  >
                    <span className="text-accent">{iconMap[artifact.type]}</span>
                    <span className="text-xs font-medium text-text-primary">{artifact.title}</span>
                    <span className="text-xs text-text-tertiary">{artifact.type}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
