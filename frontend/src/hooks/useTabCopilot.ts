import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store';
import { conversationApi } from '../lib/api';
import type { MessageMetadata, TurnSegment } from '../lib/api';
import type { WsMessage, WsStatus } from '../lib/ws-types';
import type { ParsedArtifact } from '../lib/artifact-parser';

interface UseTabCopilotOptions {
  subscribe: (listener: (message: WsMessage) => void) => () => void;
  send: (message: WsMessage) => void;
  status?: WsStatus;
}

// Per-conversation dedup state
interface ConversationDedup {
  seenMessageIds: Set<string>;
  seenToolCallIds: Set<string>;
  seenReasoningIds: Set<string>;
  receivedMessage: boolean;
}

/** Scan all tabs to find the tabId that has the given conversationId */
function findTabIdByConversationId(conversationId: string): string | undefined {
  const tabs = useAppStore.getState().tabs;
  return Object.keys(tabs).find((id) => tabs[id].conversationId === conversationId);
}

export function useTabCopilot({ subscribe, send, status }: UseTabCopilotOptions) {
  // Per-conversation dedup maps
  const dedupMapRef = useRef<Map<string, ConversationDedup>>(new Map());

  function getDedup(conversationId: string): ConversationDedup {
    let d = dedupMapRef.current.get(conversationId);
    if (!d) {
      d = {
        seenMessageIds: new Set(),
        seenToolCallIds: new Set(),
        seenReasoningIds: new Set(),
        receivedMessage: false,
      };
      dedupMapRef.current.set(conversationId, d);
    }
    return d;
  }

  // Send query_state whenever WebSocket connects/reconnects
  useEffect(() => {
    if (status === 'connected') {
      send({ type: 'copilot:query_state' });
    }
  }, [status, send]);

  useEffect(() => {
    const unsub = subscribe((msg) => {
      const data = (msg.data ?? {}) as Record<string, unknown>;
      const conversationId = data.conversationId as string | undefined;

      // Debug: log key copilot events to help trace ask_user flow
      if (msg.type === 'copilot:user_input_request' || msg.type === 'copilot:tool_start' || msg.type === 'copilot:tool_end' || msg.type === 'copilot:idle' || msg.type === 'copilot:state_response' || msg.type === 'copilot:message') {
        const tabId = conversationId ? findTabIdByConversationId(conversationId) : undefined;
        console.debug(`[useTabCopilot] ${msg.type}`, { conversationId, tabId, hasTab: !!tabId, data: msg.type === 'copilot:state_response' ? { activeStreams: (data.activeStreams as any[])?.length, pendingUserInputs: (data.pendingUserInputs as any[])?.length } : data });
      }

      // Global events — no conversationId routing needed
      switch (msg.type) {
        case 'copilot:active-streams': {
          const streamIds = data.streamIds as string[];
          useAppStore.getState().setActiveStreams(streamIds);
          return;
        }
        case 'copilot:stream-status': {
          const cid = data.conversationId as string;
          const subscribed = data.subscribed as boolean;
          if (subscribed) {
            useAppStore.getState().updateStreamStatus(cid, 'running');
          } else {
            useAppStore.getState().removeStream(cid);
          }
          return;
        }
        case 'copilot:state_response': {
          const activeStreams = data.activeStreams as Array<{ conversationId: string; status: string; startedAt: string }> | undefined;
          const pendingUserInputs = data.pendingUserInputs as Array<{ requestId: string; question: string; choices?: string[]; allowFreeform: boolean; multiSelect?: boolean; conversationId: string }> | undefined;
          const state = useAppStore.getState();

          // Restore streaming state for active streams (including plan mode)
          if (activeStreams) {
            for (const stream of activeStreams) {
              const tid = findTabIdByConversationId(stream.conversationId);
              if (tid) {
                state.setTabIsStreaming(tid, true);
                state.updateStreamStatus(stream.conversationId, 'running');
                // Restore plan mode from the backend stream state
                if ((stream as any).mode === 'plan') {
                  state.setTabPlanMode(tid, true);
                }
              }
            }
          }

          // Build set of active conversationIds for quick lookup
          const activeConversationIds = new Set(activeStreams?.map((s) => s.conversationId) ?? []);

          // Refresh messages from DB for all open tabs on reconnect.
          // This fills in content that was lost during the disconnect window
          // (events broadcast while frontend was disconnected are never replayed).
          // Also handles the case where a stream finished during disconnect —
          // the frontend never received copilot:idle, so it must fetch from DB.
          const allTabs = state.tabs;
          for (const tid of Object.keys(allTabs)) {
            const tab = allTabs[tid];
            if (!tab?.conversationId) continue;
            // If the stream is NOT active (finished during disconnect), ensure streaming is off
            if (!activeConversationIds.has(tab.conversationId)) {
              if (tab.isStreaming) {
                state.setTabIsStreaming(tid, false);
                state.removeStream(tab.conversationId);
              }
            }
            // Fetch latest messages from DB for this tab
            conversationApi.getMessages(tab.conversationId).then((msgs) => {
              const s = useAppStore.getState();
              // Only update if the tab still exists and is not actively streaming new content
              // (active streams will get their content via live events + DB fetch on idle)
              const currentTab = s.tabs[tid];
              if (currentTab) {
                s.setTabMessages(tid, msgs);
              }
            }).catch(() => {
              // Silently ignore — messages will load when tab is next selected
            });
          }

          // Restore pending user input requests
          if (pendingUserInputs && pendingUserInputs.length > 0) {
            console.debug('[useTabCopilot] state_response: restoring pending user inputs', {
              count: pendingUserInputs.length,
              inputs: pendingUserInputs.map((p: any) => ({ conversationId: p.conversationId, requestId: p.requestId, question: p.question })),
              availableTabs: Object.keys(allTabs).map(id => ({ id, conversationId: allTabs[id]?.conversationId })),
            });
            const unresolved: typeof pendingUserInputs = [];
            for (const input of pendingUserInputs) {
              const tid = findTabIdByConversationId(input.conversationId);
              if (tid) {
                console.debug('[useTabCopilot] state_response: setting userInputRequest', { tabId: tid, conversationId: input.conversationId, requestId: input.requestId });
                state.setTabUserInputRequest(tid, {
                  requestId: input.requestId,
                  question: input.question,
                  choices: input.choices,
                  allowFreeform: input.allowFreeform,
                  multiSelect: input.multiSelect,
                });
                // Also ensure isStreaming is true (stream is active waiting for input)
                state.setTabIsStreaming(tid, true);
              } else {
                unresolved.push(input);
                console.debug('[useTabCopilot] state_response: tab not found for pending user input', { conversationId: input.conversationId, requestId: input.requestId });
              }
            }
            // Retry unresolved inputs after 1s (tabs may still be loading from localStorage)
            if (unresolved.length > 0) {
              console.debug('[useTabCopilot] state_response: retrying unresolved user inputs in 1s', { count: unresolved.length });
              setTimeout(() => {
                const latestState = useAppStore.getState();
                for (const input of unresolved) {
                  const tid = findTabIdByConversationId(input.conversationId);
                  if (tid) {
                    latestState.setTabUserInputRequest(tid, {
                      requestId: input.requestId,
                      question: input.question,
                      choices: input.choices,
                      allowFreeform: input.allowFreeform,
                      multiSelect: input.multiSelect,
                    });
                    latestState.setTabIsStreaming(tid, true);
                    console.debug('[useTabCopilot] state_response retry: restored user input', { conversationId: input.conversationId, tabId: tid });
                  } else {
                    console.warn('[useTabCopilot] state_response retry: tab STILL not found', { conversationId: input.conversationId });
                  }
                }
              }, 1000);
            }
          } else {
            // No pending user inputs from backend — check if localStorage had a stale one
            const allTabsAfter = useAppStore.getState().tabs;
            for (const tid of Object.keys(allTabsAfter)) {
              const t = allTabsAfter[tid];
              if (t?.userInputRequest) {
                console.warn('[useTabCopilot] state_response: tab has localStorage userInputRequest but backend has no pending inputs — stale?', {
                  tabId: tid,
                  conversationId: t.conversationId,
                  requestId: t.userInputRequest.requestId,
                });
              }
            }
          }
          return;
        }
      }

      // Scoped events — need conversationId + matching tab (scan by conversationId)
      if (!conversationId) return;

      const tabId = findTabIdByConversationId(conversationId);
      if (!tabId) return; // No matching tab, silently discard

      const state = useAppStore.getState();
      const dedup = getDedup(conversationId);

      switch (msg.type) {
        case 'copilot:delta':
          state.setTabIsStreaming(tabId, true);
          state.appendTabStreamingText(tabId, data.content as string);
          break;

        case 'copilot:message': {
          const content = data.content as string | undefined;
          const messageId = data.messageId as string | undefined;

          if (messageId && dedup.seenMessageIds.has(messageId)) break;
          if (messageId) dedup.seenMessageIds.add(messageId);

          if (content) {
            dedup.receivedMessage = true;
            state.addTabTurnContentSegment(tabId, content);
            state.addTabTurnSegment(tabId, { type: 'text', content });
          }
          // Clear streamingText when a message event arrives
          useAppStore.setState((s) => {
            const t = s.tabs[tabId];
            if (!t) return s;
            return { tabs: { ...s.tabs, [tabId]: { ...t, streamingText: '' } } };
          });
          break;
        }

        case 'copilot:tool_start': {
          const toolCallId = data.toolCallId as string;
          const toolName = data.toolName as string;

          if (toolCallId && dedup.seenToolCallIds.has(toolCallId)) break;
          if (toolCallId) dedup.seenToolCallIds.add(toolCallId);

          state.addTabToolRecord(tabId, {
            toolCallId,
            toolName,
            arguments: data.arguments,
            status: 'running',
          });
          state.addTabTurnSegment(tabId, {
            type: 'tool',
            toolCallId,
            toolName,
            arguments: data.arguments,
            status: 'running',
          });
          break;
        }

        case 'copilot:tool_end': {
          const toolCallId = data.toolCallId as string;
          const toolName = data.toolName as string | undefined;
          const currentTab = useAppStore.getState().tabs[tabId];

          const updates = {
            status: (data.success ? 'success' : 'error') as 'success' | 'error',
            result: data.result as unknown,
            error: data.error as string | undefined,
          };

          // If tool record doesn't exist in live stream state, check DB-loaded messages.
          // After page refresh, tool_start was persisted to DB by premature idle but
          // never appeared in the live toolRecords. Update the DB message directly
          // to avoid creating a duplicate assistant block.
          if (!currentTab?.toolRecords.find((r) => r.toolCallId === toolCallId)) {
            const updatedInDb = state.updateMessageToolRecord(tabId, toolCallId, updates);
            if (updatedInDb) {
              console.debug('[useTabCopilot] copilot:tool_end — updated DB message tool record', { toolCallId, conversationId });
              break;
            }
            // Not in DB either — create on-the-fly (original fallback)
            if (toolName) {
              state.addTabToolRecord(tabId, {
                toolCallId,
                toolName,
                arguments: data.arguments,
                status: 'running',
              });
              state.addTabTurnSegment(tabId, {
                type: 'tool',
                toolCallId,
                toolName,
                arguments: data.arguments,
                status: 'running',
              });
            } else {
              // No toolName available — can't create a meaningful record
              console.debug('[useTabCopilot] copilot:tool_end for unknown tool — skipping', { toolCallId, conversationId });
              break;
            }
          }

          state.updateTabToolRecord(tabId, toolCallId, updates);
          state.updateTabToolInTurnSegments(tabId, toolCallId, updates);

          // Parse task tool results to update tab tasks
          if (toolName?.startsWith('task_') && data.success && data.result) {
            try {
              const result = (typeof data.result === 'string' ? JSON.parse(data.result) : data.result) as Record<string, unknown>;
              if (toolName === 'task_list' && Array.isArray(result.tasks)) {
                const tasks = (result.tasks as Array<Record<string, unknown>>).map((t) => ({
                  id: t.id as string,
                  subject: t.subject as string,
                  description: (t.description as string) ?? '',
                  activeForm: (t.activeForm as string) ?? '',
                  status: t.status as 'pending' | 'in_progress' | 'completed',
                  owner: t.owner as string | undefined,
                  blockedBy: (t.blockedBy as string[]) ?? [],
                }));
                state.setTabTasks(tabId, tasks);
              } else if (result.task && typeof result.task === 'object') {
                const t = result.task as Record<string, unknown>;
                state.upsertTabTask(tabId, {
                  id: t.id as string,
                  subject: t.subject as string,
                  description: (t.description as string) ?? '',
                  activeForm: (t.activeForm as string) ?? '',
                  status: t.status as 'pending' | 'in_progress' | 'completed',
                  owner: t.owner as string | undefined,
                  blockedBy: (t.blockedBy as string[]) ?? [],
                });
              }
            } catch {
              // Ignore parse errors
            }
          }
          break;
        }

        case 'copilot:reasoning_delta': {
          const reasoningId = data.reasoningId as string | undefined;
          if (reasoningId && dedup.seenReasoningIds.has(reasoningId)) break;
          state.appendTabReasoningText(tabId, data.content as string);
          break;
        }

        case 'copilot:reasoning': {
          const reasoningId = data.reasoningId as string | undefined;
          if (reasoningId && dedup.seenReasoningIds.has(reasoningId)) break;
          if (reasoningId) dedup.seenReasoningIds.add(reasoningId);

          const currentTab = useAppStore.getState().tabs[tabId];
          if (!currentTab) break;
          const content = data.content as string | undefined;

          // If reasoningText is empty (complete event arrived without deltas), use content directly
          const reasoningContent = currentTab.reasoningText || content || '';
          if (!reasoningContent) break;

          // Commit accumulated reasoning as a new segment and clear reasoningText for the next block
          useAppStore.setState((s) => {
            const t = s.tabs[tabId];
            if (!t) return s;
            const reasoningSeg: TurnSegment = { type: 'reasoning', content: reasoningContent };
            return {
              tabs: {
                ...s.tabs,
                [tabId]: {
                  ...t,
                  turnSegments: [...t.turnSegments, reasoningSeg],
                  reasoningText: '',
                },
              },
            };
          });
          break;
        }

        case 'copilot:idle': {
          const currentTab = useAppStore.getState().tabs[tabId];
          if (!currentTab) {
            console.debug('[useTabCopilot] copilot:idle — tab not found', { tabId, conversationId });
            break;
          }

          // Guard: if there's a pending userInputRequest, the turn is NOT actually complete.
          if (currentTab.userInputRequest) {
            console.debug('[useTabCopilot] Ignoring premature copilot:idle — pending userInputRequest', { conversationId });
            break;
          }

          // 1. Handle plan artifact (synchronous, from idle event data)
          const planFilePath = data.planFilePath as string | undefined;
          if (planFilePath) {
            state.setTabPlanFilePath(tabId, planFilePath);
          }

          const planArtifact = data.planArtifact as { title: string; content: string; filePath: string } | undefined;
          if (planArtifact?.content) {
            const artifactId = `plan-${conversationId}`;
            const artifact: ParsedArtifact = {
              id: artifactId,
              type: 'plan',
              title: planArtifact.title,
              content: planArtifact.content,
            };
            state.upsertTabArtifact(tabId, artifact);
            state.setTabActiveArtifact(tabId, artifactId);
            state.setTabArtifactsPanelOpen(tabId, true);
          }

          // 2. Stop streaming indicators
          state.incrementTabPremiumLocal(tabId);
          state.removeStream(conversationId);
          state.setTabIsStreaming(tabId, false);

          // 3. DB-as-Source-of-Truth: fetch authoritative message list from the database
          // This eliminates all race conditions related to event buffer replay / state management.
          conversationApi.getMessages(conversationId).then((msgs) => {
            const s = useAppStore.getState();
            s.setTabMessages(tabId, msgs);
            s.clearTabStreaming(tabId);
            // Show plan-complete prompt if we just finished in plan mode
            const finalTab = s.tabs[tabId];
            if (finalTab?.planMode) {
              s.setTabShowPlanCompletePrompt(tabId, true);
            }
          }).catch((err) => {
            console.warn('[useTabCopilot] Failed to fetch messages from DB, fallback to streaming state', err);
            // Fallback: build message from streaming state (original logic)
            const fallbackTab = useAppStore.getState().tabs[tabId];
            if (!fallbackTab) return;

            let content = '';
            if (fallbackTab.turnContentSegments.length > 0) {
              content = fallbackTab.turnContentSegments.filter((s) => s).join('\n\n');
            } else if (!dedup.receivedMessage && fallbackTab.streamingText) {
              content = fallbackTab.streamingText;
            }

            let metadata: MessageMetadata | null = null;
            if (fallbackTab.toolRecords.length > 0 || fallbackTab.turnSegments.length > 0) {
              metadata = {};
              if (fallbackTab.toolRecords.length > 0) metadata.toolRecords = [...fallbackTab.toolRecords];
              if (fallbackTab.turnSegments.length > 0) metadata.turnSegments = [...fallbackTab.turnSegments];
            }

            if (content || metadata) {
              const s = useAppStore.getState();
              s.addTabMessage(tabId, {
                id: crypto.randomUUID(),
                conversationId,
                role: 'assistant',
                content,
                metadata,
                createdAt: new Date().toISOString(),
              });
            }

            useAppStore.getState().clearTabStreaming(tabId);
            const finalTab = useAppStore.getState().tabs[tabId];
            if (finalTab?.planMode) {
              useAppStore.getState().setTabShowPlanCompletePrompt(tabId, true);
            }
          });

          dedup.receivedMessage = false;
          break;
        }

        case 'copilot:usage':
          state.updateTabUsage(
            tabId,
            (data.inputTokens as number) ?? 0,
            (data.outputTokens as number) ?? 0,
            data.cacheReadTokens as number | undefined,
            data.cacheWriteTokens as number | undefined,
            data.model as string | undefined,
          );
          break;

        case 'copilot:quota': {
          // SDK sends quotaSnapshots as a dictionary with keys like "chat", "completions", "premium_interactions"
          // We prefer "premium_interactions" which has actual usage data; fall back to first non-unlimited entry
          const snapshots = data.quotaSnapshots as Record<string, { usedRequests?: number; entitlementRequests?: number; resetDate?: string; isUnlimitedEntitlement?: boolean; remainingPercentage?: number }> | undefined;
          if (snapshots && typeof snapshots === 'object') {
            const entries = Object.entries(snapshots);
            // Priority: 1) premium_interactions key  2) first entry with !isUnlimitedEntitlement  3) first entry
            const premiumEntry = entries.find(([k]) => k === 'premium_interactions');
            const nonUnlimitedEntry = entries.find(([, v]) => v && !v.isUnlimitedEntitlement);
            const [, snap] = premiumEntry ?? nonUnlimitedEntry ?? entries[0] ?? [];
            if (snap) {
              const unlimited = !!snap.isUnlimitedEntitlement;
              state.updateTabQuota(
                tabId,
                snap.usedRequests ?? 0,
                snap.entitlementRequests ?? 0,
                snap.resetDate ?? null,
                unlimited,
              );
              // Dual-write to global store for cross-tab premium badge
              state.setPremiumQuota({
                used: snap.usedRequests ?? 0,
                total: snap.entitlementRequests ?? 0,
                resetDate: snap.resetDate ?? null,
                unlimited,
              });
            }
          }
          break;
        }

        case 'copilot:shutdown': {
          // session.shutdown includes totalPremiumRequests
          const totalPR = data.totalPremiumRequests as number | undefined;
          if (totalPR != null && totalPR > 0) {
            const currentTab = useAppStore.getState().tabs[tabId];
            if (currentTab) {
              // Only update used count if higher than what we already have (quota snapshot is more accurate for total)
              const currentUsed = currentTab.usage.premiumRequestsUsed;
              if (totalPR > currentUsed) {
                state.updateTabQuota(
                  tabId,
                  totalPR,
                  currentTab.usage.premiumRequestsTotal,
                  currentTab.usage.premiumResetDate,
                  currentTab.usage.premiumUnlimited,
                );
              }
            }
          }
          break;
        }

        case 'copilot:context_window':
          state.updateTabContextWindow(
            tabId,
            (data.contextWindowUsed as number) ?? 0,
            (data.contextWindowMax as number) ?? 0,
          );
          break;

        case 'copilot:mode_changed':
          state.setTabPlanMode(tabId, (data.mode as string) === 'plan');
          break;

        case 'copilot:user_input_request':
          // Ensure streaming state is active — the stream is still running while waiting for user input
          state.setTabIsStreaming(tabId, true);
          // Clear any premature plan-complete prompt that may have been set by a premature idle
          state.setTabShowPlanCompletePrompt(tabId, false);
          state.setTabUserInputRequest(tabId, {
            requestId: data.requestId as string,
            question: data.question as string,
            choices: data.choices as string[] | undefined,
            allowFreeform: (data.allowFreeform as boolean) ?? true,
            multiSelect: data.multiSelect as boolean | undefined,
          });
          break;

        case 'copilot:user_input_timeout':
          state.setTabUserInputRequest(tabId, {
            requestId: data.requestId as string,
            question: data.question as string,
            choices: data.choices as string[] | undefined,
            allowFreeform: (data.allowFreeform as boolean) ?? true,
            timedOut: true,
          });
          break;

        case 'copilot:error':
          state.setTabCopilotError(tabId, data.message as string);
          state.setTabIsStreaming(tabId, false);
          break;
      }
    });

    return unsub;
  }, [subscribe]);

  // sendMessage now takes tabId, resolves conversationId from tab state
  const sendMessage = useCallback(
    (tabId: string, prompt: string, files?: Array<{ id: string; originalName: string; mimeType: string; size: number; path: string }>, contextFiles?: string[]) => {
      const state = useAppStore.getState();
      const tab = state.tabs[tabId];
      if (!tab) return;

      const conversationId = tab.conversationId;
      if (!conversationId) return; // Draft tab — must be materialized first

      // Auto-title: if this is the first message, set conversation title from prompt
      const isFirstMessage = tab.messages.length === 0;

      state.clearTabStreaming(tabId);
      state.setTabIsStreaming(tabId, true);

      // Reset per-conversation receivedMessage flag
      const dedup = getDedup(conversationId);
      dedup.receivedMessage = false;

      // Build user message metadata (include attachments and contextFiles if present)
      let userMetadata: MessageMetadata | null = null;
      if ((files && files.length > 0) || (contextFiles && contextFiles.length > 0)) {
        userMetadata = {};
        if (files && files.length > 0) {
          userMetadata.attachments = files.map((f) => ({
            id: f.id,
            originalName: f.originalName,
            mimeType: f.mimeType,
            size: f.size,
          }));
        }
        if (contextFiles && contextFiles.length > 0) {
          userMetadata.contextFiles = contextFiles;
        }
      }

      // Add user message to tab
      state.addTabMessage(tabId, {
        id: crypto.randomUUID(),
        conversationId,
        role: 'user',
        content: prompt,
        metadata: userMetadata,
        createdAt: new Date().toISOString(),
      });

      const { disabledSkills, language, llmLanguage } = state;
      const data: Record<string, unknown> = { conversationId, prompt, disabledSkills, locale: llmLanguage || language };
      if (files && files.length > 0) {
        data.files = files;
      }
      if (contextFiles && contextFiles.length > 0) {
        data.contextFiles = contextFiles;
      }
      if (tab.planMode) {
        data.mode = 'plan';
      }
      if (tab.webSearchForced) {
        data.webSearchForced = true;
      }
      send({
        type: 'copilot:send',
        data,
      });

      // Auto-title on first message
      if (isFirstMessage) {
        const title = prompt.slice(0, 50).trim() || 'New Chat';
        useAppStore.getState().updateTabTitle(tabId, title);
        conversationApi.update(conversationId, { title }).catch(() => {/* ignore */});
      }
    },
    [send],
  );

  const abortMessage = useCallback(
    (conversationId: string) => {
      send({ type: 'copilot:abort', data: { conversationId } });
    },
    [send],
  );

  const sendUserInputResponse = useCallback(
    (conversationId: string, requestId: string, answer: string, wasFreeform: boolean) => {
      send({
        type: 'copilot:user_input_response',
        data: { conversationId, requestId, answer, wasFreeform },
      });
    },
    [send],
  );

  // Cleanup dedup sets when tabs are closed
  const cleanupDedup = useCallback((conversationId: string) => {
    dedupMapRef.current.delete(conversationId);
  }, []);

  return { sendMessage, abortMessage, sendUserInputResponse, cleanupDedup };
}
