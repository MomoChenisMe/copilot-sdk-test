import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useConversations } from '../../hooks/useConversations';
import { useTabCopilot } from '../../hooks/useTabCopilot';
import { useTerminal } from '../../hooks/useTerminal';
import { useBashMode } from '../../hooks/useBashMode';
import { useModels } from '../../hooks/useModels';
import { useSkills } from '../../hooks/useSkills';
import { useGlobalShortcuts } from '../../hooks/useGlobalShortcuts';
import { useCronNotifications } from '../../hooks/useCronNotifications';
import { useQuota } from '../../hooks/useQuota';
import { conversationApi, configApi } from '../../lib/api';
import { skillsApi } from '../../lib/prompts-api';
import { settingsApi } from '../../lib/settings-api';
import { sumUsageFromMessages } from '../../lib/usage-utils';
import { uploadFiles } from '../../lib/upload-api';
import type { AttachedFile } from '../shared/AttachmentPreview';
import { TopBar } from './TopBar';
import { TabBar } from './TabBar';
import { ChatView } from '../copilot/ChatView';
import { ArtifactsPanel } from '../copilot/ArtifactsPanel';
import { CronPage } from '../cron/CronPage';
import { SettingsPanel } from '../settings/SettingsPanel';
import { ShortcutsPanel } from '../shared/ShortcutsPanel';
import { SdkUpdateBanner } from '../copilot/SdkUpdateBanner';
import { ToastContainer } from '../shared/ToastContainer';

export function AppShell({ onLogout }: { onLogout: () => void }) {
  const { t } = useTranslation();
  const [cwd, setCwd] = useState('~');

  const { status, send, subscribe } = useWebSocket(onLogout);
  const {
    conversations,
    create: createConversation,
    update: updateConversation,
    remove: removeConversation,
    search: searchConversations,
  } = useConversations();

  // Load models, skills, and quota from API
  useModels();
  useSkills();
  useQuota();

  // Subscribe to cron job notifications
  useCronNotifications({ subscribe, send });

  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const setActiveConversationId = useAppStore((s) => s.setActiveConversationId);
  const models = useAppStore((s) => s.models);

  // Tab state
  const activeTabId = useAppStore((s) => s.activeTabId);
  const tabs = useAppStore((s) => s.tabs);
  const openTab = useAppStore((s) => s.openTab);
  const closeTab = useAppStore((s) => s.closeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const switchTabConversation = useAppStore((s) => s.switchTabConversation);

  const { sendMessage, abortMessage, sendUserInputResponse, cleanupDedup } = useTabCopilot({ subscribe, send });

  const handleBashCwdChange = useCallback(
    async (newCwd: string) => {
      const tabId = useAppStore.getState().activeTabId;
      if (!tabId) return;
      const tab = useAppStore.getState().tabs[tabId];
      if (!tab?.conversationId) return;
      await updateConversation(tab.conversationId, { cwd: newCwd, sdkSessionId: null });
    },
    [updateConversation],
  );

  const { sendBashCommand } = useBashMode({
    subscribe,
    send,
    tabId: activeTabId ?? '',
    onCwdChange: handleBashCwdChange,
  });

  const terminalWriteRef = useRef<((data: string) => void) | null>(null);
  const { writeRef, handleData, handleResize, handleReady } = useTerminal({
    send,
    subscribe,
    cwd,
  });

  // Assign the terminal writeRef
  terminalWriteRef.current = writeRef.current;

  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const getInitialTheme = useAppStore((s) => s.getInitialTheme);
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const settingsOpen = useAppStore((s) => s.settingsOpen);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const savedTheme = getInitialTheme();
    if (savedTheme !== theme) {
      useAppStore.setState({ theme: savedTheme });
    }
    document.documentElement.dataset.theme = savedTheme;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync data-theme attribute when theme changes
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Fetch default CWD from backend on mount
  useEffect(() => {
    configApi.get().then((config) => {
      setCwd(config.defaultCwd);
    }).catch(() => {
      // Fallback: keep '~'
    });
  }, []);

  // Load persisted settings from backend on mount (overrides localStorage if present)
  useEffect(() => {
    settingsApi.get().then((settings) => {
      const state = useAppStore.getState();
      const hasBackendData = settings.theme || settings.language || settings.lastSelectedModel || settings.disabledSkills;

      if (hasBackendData) {
        // Apply backend settings to store
        if (settings.theme && settings.theme !== state.theme) {
          useAppStore.setState({ theme: settings.theme as 'light' | 'dark' });
          document.documentElement.dataset.theme = settings.theme;
          try { localStorage.setItem('theme', settings.theme); } catch { /* noop */ }
        }
        if (settings.language && settings.language !== state.language) {
          useAppStore.setState({ language: settings.language });
          i18n.changeLanguage(settings.language);
          try { localStorage.setItem('i18nextLng', settings.language); } catch { /* noop */ }
        }
        if (settings.lastSelectedModel) {
          useAppStore.setState({ lastSelectedModel: settings.lastSelectedModel });
          try { localStorage.setItem('codeforge:lastSelectedModel', settings.lastSelectedModel); } catch { /* noop */ }
        }
        if (settings.disabledSkills) {
          useAppStore.setState({ disabledSkills: settings.disabledSkills });
          try { localStorage.setItem('codeforge:disabledSkills', JSON.stringify(settings.disabledSkills)); } catch { /* noop */ }
        }
      } else {
        // One-time migration: push localStorage settings to backend
        const migrationData: Record<string, unknown> = {};
        if (state.theme) migrationData.theme = state.theme;
        if (state.language) migrationData.language = state.language;
        if (state.lastSelectedModel) migrationData.lastSelectedModel = state.lastSelectedModel;
        if (state.disabledSkills.length > 0) migrationData.disabledSkills = state.disabledSkills;
        if (Object.keys(migrationData).length > 0) {
          settingsApi.patch(migrationData).catch(() => {});
        }
      }
    }).catch(() => {
      // Backend unreachable — fallback to localStorage (already initialized)
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize language from i18n on mount
  const { i18n } = useTranslation();
  useEffect(() => {
    const currentLng = i18n.language || 'en';
    const normalized = currentLng.startsWith('zh') ? 'zh-TW' : 'en';
    if (normalized !== language) {
      setLanguage(normalized);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore persisted state on mount
  useEffect(() => {
    useAppStore.getState().restoreOpenTabs();
    useAppStore.getState().restoreDisabledSkills();
    // Sync openspec skills disabled state based on toggle
    configApi.getOpenspecSdd().then(({ enabled }) => {
      skillsApi.list().then(({ skills }) => {
        const names = skills.filter((s: { name: string }) => s.name.startsWith('openspec-')).map((s: { name: string }) => s.name);
        useAppStore.getState().batchSetSkillsDisabled(names, !enabled);
      }).catch(() => {});
    }).catch(() => {});
    // Sync activeConversationId with restored activeTabId
    const restoredTabId = useAppStore.getState().activeTabId;
    if (restoredTabId) {
      const restoredTab = useAppStore.getState().tabs[restoredTabId];
      setActiveConversationId(restoredTab?.conversationId ?? null);
      // Load messages for the restored active tab to exit loading state
      if (restoredTab?.conversationId && !restoredTab.messagesLoaded) {
        conversationApi.getMessages(restoredTab.conversationId).then((msgs) => {
          useAppStore.getState().setTabMessages(restoredTabId, msgs);
          // Restore usage from message metadata
          const usage = sumUsageFromMessages(msgs);
          if (usage.inputTokens > 0 || usage.outputTokens > 0) {
            useAppStore.getState().updateTabUsage(restoredTabId, usage.inputTokens, usage.outputTokens, usage.cacheReadTokens || undefined, usage.cacheWriteTokens || undefined);
          }
        }).catch(() => {
          // Mark as loaded even on error to exit the loading spinner
          useAppStore.getState().setTabMessages(restoredTabId, []);
        });
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLanguageToggle = useCallback(() => {
    const next = language === 'zh-TW' ? 'en' : 'zh-TW';
    i18n.changeLanguage(next);
    setLanguage(next);
  }, [language, i18n, setLanguage]);

  const lastSelectedModel = useAppStore((s) => s.lastSelectedModel);
  const setLastSelectedModel = useAppStore((s) => s.setLastSelectedModel);
  const defaultModel = lastSelectedModel || models[0]?.id || '';

  // Helper: get conversationId from active tab
  const getActiveConversationId = useCallback(() => {
    const tabId = useAppStore.getState().activeTabId;
    if (!tabId) return null;
    return useAppStore.getState().tabs[tabId]?.conversationId ?? null;
  }, []);

  // --- Tab management ---
  const handleNewTab = useCallback(() => {
    // Lazy: create a draft tab without calling the API
    openTab(null, t('tabBar.newTab', 'New Chat'));
    setActiveConversationId(null);
  }, [openTab, setActiveConversationId, t]);

  const handleSelectTab = useCallback(
    async (tabId: string) => {
      setActiveTab(tabId);
      const tab = useAppStore.getState().tabs[tabId];
      if (!tab) return;
      const conversationId = tab.conversationId;
      setActiveConversationId(conversationId);

      // Draft tab — no messages to load
      if (!conversationId) return;

      // Lazy-load messages if not yet loaded
      if (!tab.messagesLoaded) {
        try {
          const msgs = await conversationApi.getMessages(conversationId);
          useAppStore.getState().setTabMessages(tabId, msgs);
          // Restore usage from message metadata
          const usage = sumUsageFromMessages(msgs);
          if (usage.inputTokens > 0 || usage.outputTokens > 0) {
            useAppStore.getState().updateTabUsage(tabId, usage.inputTokens, usage.outputTokens, usage.cacheReadTokens || undefined, usage.cacheWriteTokens || undefined);
          }
        } catch {
          // ignore
        }
      }

      // Subscribe to active stream if exists
      const activeStreams = useAppStore.getState().activeStreams;
      if (activeStreams[conversationId]) {
        send({ type: 'copilot:subscribe', data: { conversationId } });
      }
    },
    [setActiveTab, setActiveConversationId, send],
  );

  const handleCloseTab = useCallback(
    (tabId: string) => {
      const tab = useAppStore.getState().tabs[tabId];
      if (tab && tab.conversationId) {
        cleanupDedup(tab.conversationId);
      }
      closeTab(tabId);
      // Update activeConversationId to match new activeTabId
      const newActiveTabId = useAppStore.getState().activeTabId;
      if (newActiveTabId) {
        const newTab = useAppStore.getState().tabs[newActiveTabId];
        setActiveConversationId(newTab?.conversationId ?? null);
      } else {
        setActiveConversationId(null);
      }
    },
    [closeTab, cleanupDedup, setActiveConversationId],
  );

  const handleDeleteConversation = useCallback(
    (conversationId: string) => {
      // Abort any active stream for this conversation
      abortMessage(conversationId);
      // Close any tab that has this conversation
      const tabId = useAppStore.getState().getTabIdByConversationId(conversationId);
      if (tabId) {
        cleanupDedup(conversationId);
        closeTab(tabId);
      }
      // Remove the conversation from the list and API
      removeConversation(conversationId);
      // Update activeConversationId
      const newActiveTabId = useAppStore.getState().activeTabId;
      if (newActiveTabId) {
        const newTab = useAppStore.getState().tabs[newActiveTabId];
        setActiveConversationId(newTab?.conversationId ?? null);
      } else {
        setActiveConversationId(null);
      }
    },
    [abortMessage, cleanupDedup, closeTab, removeConversation, setActiveConversationId],
  );

  // Switch conversation within an existing tab
  const handleSwitchConversation = useCallback(
    async (tabId: string, newConversationId: string) => {
      const tab = useAppStore.getState().tabs[tabId];
      if (!tab) return;

      // Check if this conversation is already open in another tab
      const existingTabId = useAppStore.getState().getTabIdByConversationId(newConversationId);
      if (existingTabId && existingTabId !== tabId) {
        // Jump to that tab instead
        setActiveTab(existingTabId);
        setActiveConversationId(newConversationId);
        return;
      }

      // Abort current stream if any
      if (tab.isStreaming && tab.conversationId) {
        abortMessage(tab.conversationId);
      }

      // Switch conversation in this tab
      const conv = conversations.find((c) => c.id === newConversationId);
      switchTabConversation(tabId, newConversationId, conv?.title || 'Chat');

      // Update global active
      if (useAppStore.getState().activeTabId === tabId) {
        setActiveConversationId(newConversationId);
      }

      // Lazy-load messages
      try {
        const msgs = await conversationApi.getMessages(newConversationId);
        useAppStore.getState().setTabMessages(tabId, msgs);
        // Restore usage from message metadata
        const usage = sumUsageFromMessages(msgs);
        if (usage.inputTokens > 0 || usage.outputTokens > 0) {
          useAppStore.getState().updateTabUsage(tabId, usage.inputTokens, usage.outputTokens, usage.cacheReadTokens || undefined, usage.cacheWriteTokens || undefined);
        }
      } catch {
        // ignore
      }

      // Subscribe to active stream if exists
      const activeStreams = useAppStore.getState().activeStreams;
      if (activeStreams[newConversationId]) {
        send({ type: 'copilot:subscribe', data: { conversationId: newConversationId } });
      }
    },
    [abortMessage, switchTabConversation, setActiveTab, setActiveConversationId, conversations, send],
  );

  const handleSend = useCallback(
    async (text: string, attachments?: AttachedFile[], contextFiles?: string[]) => {
      if (!activeTabId) return;

      // !command syntax: route to bash handler
      if (text.startsWith('!') && text.length > 1) {
        const command = text.slice(1).trim();
        if (command) {
          // Lazy creation: materialize draft tab before bash command
          let tab = useAppStore.getState().tabs[activeTabId];
          if (tab && tab.conversationId === null) {
            const model = lastSelectedModel || models[0]?.id || 'gpt-4o';
            const conv = await createConversation(model, cwd);
            useAppStore.getState().materializeTabConversation(activeTabId, conv.id);
            setActiveConversationId(conv.id);
            useAppStore.getState().addConversation(conv);
            tab = useAppStore.getState().tabs[activeTabId];
          }
          const conv = conversations.find(
            (c) => c.id === tab?.conversationId,
          );
          sendBashCommand(command, conv?.cwd || cwd, tab?.conversationId || undefined);
          return;
        }
      }

      const tab = useAppStore.getState().tabs[activeTabId];
      if (!tab) return;

      // Lazy creation: if this is a draft tab, create the conversation first
      if (tab.conversationId === null) {
        const model = lastSelectedModel || models[0]?.id || 'gpt-4o';
        const conv = await createConversation(model, cwd);
        useAppStore.getState().materializeTabConversation(activeTabId, conv.id);
        setActiveConversationId(conv.id);
        useAppStore.getState().addConversation(conv);
      }

      let fileRefs: Array<{ id: string; originalName: string; mimeType: string; size: number; path: string }> | undefined;
      if (attachments && attachments.length > 0) {
        try {
          fileRefs = await uploadFiles(attachments.map((a) => a.file));
        } catch {
          // Upload failed — send without files
        }
      }

      sendMessage(activeTabId, text, fileRefs, contextFiles);
    },
    [activeTabId, sendMessage, lastSelectedModel, models, createConversation, cwd, setActiveConversationId, sendBashCommand, conversations],
  );

  const handleBashSend = useCallback(
    async (command: string) => {
      if (!activeTabId) return;

      // Lazy creation: if this is a draft tab, create the conversation first
      let tab = useAppStore.getState().tabs[activeTabId];
      if (tab && tab.conversationId === null) {
        const model = lastSelectedModel || models[0]?.id || 'gpt-4o';
        const conv = await createConversation(model, cwd);
        useAppStore.getState().materializeTabConversation(activeTabId, conv.id);
        setActiveConversationId(conv.id);
        useAppStore.getState().addConversation(conv);
        tab = useAppStore.getState().tabs[activeTabId];
      }

      const conv = conversations.find(
        (c) => c.id === tab?.conversationId,
      );
      sendBashCommand(command, conv?.cwd || cwd, tab?.conversationId || undefined);
    },
    [activeTabId, sendBashCommand, conversations, cwd, lastSelectedModel, models, createConversation, setActiveConversationId],
  );

  const handleAbort = useCallback(() => {
    if (!activeTabId) return;
    const tab = useAppStore.getState().tabs[activeTabId];
    if (tab?.conversationId) {
      abortMessage(tab.conversationId);
    }
  }, [activeTabId, abortMessage]);

  const handleHomeClick = useCallback(() => {
    setActiveConversationId(null);
    useAppStore.setState({ activeTabId: null });
  }, [setActiveConversationId]);

  const handleModelChange = useCallback(
    (modelId: string) => {
      setLastSelectedModel(modelId);
      const convId = getActiveConversationId();
      if (convId) {
        updateConversation(convId, { model: modelId });
      }
    },
    [getActiveConversationId, updateConversation, setLastSelectedModel],
  );

  const handleExecutePlan = useCallback(
    (conversationId: string, planFilePath: string) => {
      if (!activeTabId) return;
      const state = useAppStore.getState();

      // Hide plan complete prompt and clear streaming state
      state.setTabShowPlanCompletePrompt(activeTabId, false);
      state.clearTabStreaming(activeTabId);
      state.setTabIsStreaming(activeTabId, true);
      state.setTabPlanMode(activeTabId, false);

      // Send execute_plan via WebSocket
      send({
        type: 'copilot:execute_plan',
        data: { conversationId, planFilePath },
      });
    },
    [activeTabId, send],
  );

  const handleCwdChange = useCallback(
    async (newCwd: string) => {
      setCwd(newCwd);
      const convId = getActiveConversationId();
      if (!convId) return;
      await updateConversation(convId, { cwd: newCwd, sdkSessionId: null });
    },
    [getActiveConversationId, updateConversation],
  );

  // --- Cron tab management ---
  const handleOpenCronTab = useCallback(() => {
    const state = useAppStore.getState();
    // Find existing cron tab
    const existingCronTabId = state.tabOrder.find(
      (tid) => state.tabs[tid]?.mode === 'cron',
    );
    if (existingCronTabId) {
      setActiveTab(existingCronTabId);
      setActiveConversationId(null);
    } else {
      openTab(null, 'Cron Jobs');
      const newTabId = useAppStore.getState().activeTabId;
      if (newTabId) {
        useAppStore.getState().setTabMode(newTabId, 'cron');
      }
      setActiveConversationId(null);
    }
  }, [openTab, setActiveTab, setActiveConversationId]);

  const handleOpenCronAsConversation = useCallback(
    (conversationId: string) => {
      openTab(conversationId, 'Cron Result');
      const newTabId = useAppStore.getState().activeTabId;
      if (newTabId) {
        setActiveConversationId(conversationId);
        handleSelectTab(newTabId);
      }
    },
    [openTab, setActiveConversationId, handleSelectTab],
  );

  // WebSocket reconnect: re-subscribe to all active streams
  useEffect(() => {
    if (status === 'connected') {
      // Query active streams on connect
      send({ type: 'copilot:status', data: {} });
    }
  }, [status, send]);

  // Get active tab state for rendering
  const activeTab = activeTabId ? tabs[activeTabId] : null;
  const activeConvId = activeTab?.conversationId;
  const activeConversation = conversations.find((c) => c.id === activeConvId);

  // Listen for SDK analyze changes event from settings panel
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string }>).detail;
      if (detail?.message) {
        handleSend(detail.message);
      }
    };
    document.addEventListener('settings:analyzeChanges', handler);
    return () => document.removeEventListener('settings:analyzeChanges', handler);
  }, [handleSend]);

  // Shortcuts panel state
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const setTabMode = useAppStore((s) => s.setTabMode);

  const handleClearConversation = useCallback(() => {
    if (activeTabId) {
      useAppStore.getState().clearTabStreaming(activeTabId);
      useAppStore.getState().setTabMessages(activeTabId, []);
    }
  }, [activeTabId]);

  // Global keyboard shortcuts
  useGlobalShortcuts({
    onNewTab: handleNewTab,
    onCloseTab: () => { if (activeTabId) handleCloseTab(activeTabId); },
    onSelectTabByIndex: (index: number) => {
      const tabOrder = useAppStore.getState().tabOrder;
      if (index < tabOrder.length) {
        handleSelectTab(tabOrder[index]);
      }
    },
    onNextTab: () => {
      const { tabOrder, activeTabId: currentTabId } = useAppStore.getState();
      if (tabOrder.length <= 1 || !currentTabId) return;
      const currentIndex = tabOrder.indexOf(currentTabId);
      const nextIndex = (currentIndex + 1) % tabOrder.length;
      handleSelectTab(tabOrder[nextIndex]);
    },
    onPrevTab: () => {
      const { tabOrder, activeTabId: currentTabId } = useAppStore.getState();
      if (tabOrder.length <= 1 || !currentTabId) return;
      const currentIndex = tabOrder.indexOf(currentTabId);
      const prevIndex = (currentIndex - 1 + tabOrder.length) % tabOrder.length;
      handleSelectTab(tabOrder[prevIndex]);
    },
    onToggleAiMode: () => { if (activeTabId) setTabMode(activeTabId, 'copilot'); },
    onToggleBashMode: () => { if (activeTabId) setTabMode(activeTabId, 'terminal'); },
    onOpenSettings: () => setSettingsOpen(true),
    onClearConversation: handleClearConversation,
    onToggleTheme: toggleTheme,
    onTriggerUpload: () => {
      // Trigger file input click via custom event
      document.dispatchEvent(new CustomEvent('shortcut:upload'));
    },
    onToggleModelSelector: () => {
      document.dispatchEvent(new CustomEvent('shortcut:modelSelector'));
    },
    onShowShortcuts: () => setShortcutsOpen((v) => !v),
  });

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      <TopBar
        title={activeConversation?.title || t('app.title')}
        status={status}
        theme={theme}
        onThemeToggle={toggleTheme}
        onHomeClick={handleHomeClick}
        onSettingsClick={() => setSettingsOpen(!settingsOpen)}
        onShortcutsClick={() => setShortcutsOpen(true)}
      />

      <SdkUpdateBanner />

      <TabBar
        onNewTab={handleNewTab}
        onSelectTab={handleSelectTab}
        onCloseTab={handleCloseTab}
        onSwitchConversation={handleSwitchConversation}
        onDeleteConversation={handleDeleteConversation}
        onOpenCronTab={handleOpenCronTab}
        onOpenConversation={(conversationId) => {
          const conv = conversations.find((c) => c.id === conversationId);
          openTab(conversationId, conv?.title || 'Chat');
          // openTab sets activeTabId; now trigger message loading via handleSelectTab
          const newActiveTabId = useAppStore.getState().activeTabId;
          if (newActiveTabId) {
            handleSelectTab(newActiveTabId);
          }
        }}
        conversations={conversations.map((c) => ({
          id: c.id,
          title: c.title,
          pinned: c.pinned,
          updatedAt: c.updatedAt,
        }))}
      />

      <div className="flex-1 overflow-hidden relative">
        {activeTab?.mode === 'cron' ? (
          <CronPage onOpenConversation={handleOpenCronAsConversation} />
        ) : (
          /* Main content area: flex row for ChatView + ArtifactsPanel */
          <div className="h-full flex flex-row">
            {/* Chat area — shrinks when artifacts panel is open on desktop */}
            <div className="flex-1 flex flex-col min-w-0 h-full">
              <ChatView
                tabId={activeTabId}
                onNewConversation={handleNewTab}
                onSend={handleSend}
                onAbort={handleAbort}
                onBashSend={handleBashSend}
                isStreaming={activeTab?.isStreaming ?? false}
                disabled={!activeTabId}
                currentModel={activeConversation?.model || defaultModel}
                onModelChange={handleModelChange}
                currentCwd={activeConversation?.cwd || cwd}
                onCwdChange={handleCwdChange}
                onClearConversation={handleClearConversation}
                onSettingsOpen={() => setSettingsOpen(true)}
                onUserInputResponse={(requestId, answer, wasFreeform) => {
                  const tab = activeTabId ? useAppStore.getState().tabs[activeTabId] : null;
                  if (tab?.conversationId) {
                    sendUserInputResponse(tab.conversationId, requestId, answer, wasFreeform);
                  }
                }}
                onOpenConversation={(conversationId) => {
                  const conv = conversations.find((c) => c.id === conversationId);
                  openTab(conversationId, conv?.title || 'Chat');
                  const newActiveTabId = useAppStore.getState().activeTabId;
                  if (newActiveTabId) {
                    handleSelectTab(newActiveTabId);
                  }
                }}
                onExecutePlan={handleExecutePlan}
              />
            </div>

            {/* Artifacts panel — full overlay on mobile, side panel on desktop */}
            {activeTab?.artifactsPanelOpen && activeTab.artifacts.length > 0 && (
              <ArtifactsPanel
                artifacts={activeTab.artifacts}
                activeArtifactId={activeTab.activeArtifactId}
                onSelectArtifact={(id) => {
                  if (activeTabId) {
                    useAppStore.getState().setTabActiveArtifact(activeTabId, id);
                  }
                }}
                onClose={() => {
                  if (activeTabId) {
                    useAppStore.getState().setTabArtifactsPanelOpen(activeTabId, false);
                  }
                }}
              />
            )}
          </div>
        )}
      </div>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLanguageToggle={handleLanguageToggle}
        language={language}
        onLogout={onLogout}
      />

      <ShortcutsPanel open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <ToastContainer />
    </div>
  );
}
