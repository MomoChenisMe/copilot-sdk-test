import { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, X, Clock as ClockIcon, Trash2 } from 'lucide-react';
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
import { SettingsPanel } from '../settings/SettingsPanel';
import { ShortcutsPanel } from '../shared/ShortcutsPanel';
import { SdkUpdateBanner } from '../copilot/SdkUpdateBanner';
import { MobileDrawer } from './MobileDrawer';
import { ToastContainer } from '../shared/ToastContainer';

export function AppShell({ onLogout }: { onLogout: () => void }) {
  const { t } = useTranslation();
  const [cwd, setCwd] = useState('~');

  const { status, send, subscribe } = useWebSocket(onLogout);
  const {
    conversations,
    refresh: refreshConversations,
    create: createConversation,
    update: updateConversation,
    remove: removeConversation,
    search: searchConversations,
  } = useConversations();

  // Load models, skills, and quota from API
  useModels();
  useSkills();
  useQuota();

  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const setActiveConversationId = useAppStore((s) => s.setActiveConversationId);
  const models = useAppStore((s) => s.models);

  // Tab state
  const activeTabId = useAppStore((s) => s.activeTabId);
  const tabs = useAppStore((s) => s.tabs);
  const tabOrder = useAppStore((s) => s.tabOrder);
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

  // Detect Brave API key availability on mount
  useEffect(() => {
    configApi.getBraveApiKey().then((res) => {
      useAppStore.getState().setWebSearchAvailable(res.hasKey);
    }).catch(() => {
      // No Brave API key available
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

  // Listen for SW notification-click messages to navigate
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type !== 'notification-click') return;
      const data = event.data.data;
      if (!data) return;
      // For cron type: open settings or navigate to cron tab (handled by existing tab system)
      // For stream type: switch to the conversation
      if (data.type === 'stream' && data.conversationId) {
        const tabs = useAppStore.getState().tabs;
        const existing = Object.entries(tabs).find(([, t]) => t.conversationId === data.conversationId);
        if (existing) {
          useAppStore.getState().setActiveTab(existing[0]);
        }
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

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

  // Mobile drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerConfirmDeleteId, setDrawerConfirmDeleteId] = useState<string | null>(null);

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
        onMenuClick={() => setDrawerOpen(true)}
      />

      <SdkUpdateBanner />

      <div className="hidden md:block">
      <TabBar
        onNewTab={handleNewTab}
        onSelectTab={handleSelectTab}
        onCloseTab={handleCloseTab}
        onSwitchConversation={handleSwitchConversation}
        onDeleteConversation={handleDeleteConversation}
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
          cronEnabled: (c as any).cronEnabled,
        }))}
      />
      </div>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="flex flex-col h-full">
          {/* Header: New Tab + actions */}
          <div className="p-3 border-b border-border flex items-center gap-2">
            <button
              onClick={() => { handleNewTab(); setDrawerOpen(false); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
            >
              <Plus size={14} />
              {t('tabBar.newTab', 'New Tab')}
            </button>
          </div>

          {/* Open tabs */}
          <div className="px-3 pt-3 pb-1">
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
              {t('tabBar.copilot', 'Tabs')} ({tabOrder.length})
            </span>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {tabOrder.map((tid) => {
              const tab = tabs[tid];
              if (!tab) return null;
              const isActive = tid === activeTabId;
              return (
                <div
                  key={tid}
                  className={`flex items-center gap-2 px-3 py-2.5 border-b border-border-subtle transition-colors ${
                    isActive ? 'bg-accent/8 border-l-2 border-l-accent' : 'hover:bg-bg-tertiary'
                  }`}
                >
                  <button
                    onClick={() => { handleSelectTab(tid); setDrawerOpen(false); }}
                    className={`flex-1 text-left text-sm truncate flex items-center gap-1.5 ${
                      isActive ? 'text-text-primary font-medium' : 'text-text-secondary'
                    }`}
                  >
                    {tab.conversationId && conversations.find((c) => c.id === tab.conversationId)?.cronEnabled && (
                      <ClockIcon size={10} className="shrink-0 text-accent" />
                    )}
                    <span className="truncate">{tab.title || t('tabBar.newTab', 'New Tab')}</span>
                  </button>
                  {tabOrder.length > 1 && (
                    <button
                      onClick={() => handleCloseTab(tid)}
                      className="shrink-0 p-1 rounded text-text-muted hover:text-error hover:bg-error/10 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* History section */}
          <div className="border-t border-border">
            <div className="px-3 pt-3 pb-1">
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
                {t('chat.recentConversations', 'Recent Conversations')}
              </span>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {conversations.slice(0, 15).map((conv) => {
                if (drawerConfirmDeleteId === conv.id) {
                  return (
                    <div
                      key={conv.id}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm bg-error/10"
                    >
                      <span className="flex-1 truncate text-text-secondary">{t('sidebar.deleteConfirm', 'Delete?')}</span>
                      <button
                        onClick={() => {
                          handleDeleteConversation(conv.id);
                          setDrawerConfirmDeleteId(null);
                        }}
                        className="px-2 py-0.5 text-xs rounded bg-error text-white hover:bg-error/80 transition-colors"
                      >
                        {t('common.delete', 'Delete')}
                      </button>
                      <button
                        onClick={() => setDrawerConfirmDeleteId(null)}
                        className="px-2 py-0.5 text-xs rounded bg-bg-tertiary text-text-secondary hover:bg-bg-secondary transition-colors"
                      >
                        {t('common.cancel', 'Cancel')}
                      </button>
                    </div>
                  );
                }
                return (
                  <div
                    key={conv.id}
                    className="group flex items-center w-full text-left px-4 py-2.5 text-sm text-text-secondary hover:bg-bg-tertiary transition-colors"
                  >
                    <button
                      className="flex-1 text-left truncate"
                      onClick={() => {
                        if (activeTabId) {
                          handleSwitchConversation(activeTabId, conv.id);
                        } else {
                          const c = conversations.find((cc) => cc.id === conv.id);
                          openTab(conv.id, c?.title || 'Chat');
                          const newTabId = useAppStore.getState().activeTabId;
                          if (newTabId) handleSelectTab(newTabId);
                        }
                        setDrawerOpen(false);
                      }}
                    >
                      {conv.cronEnabled && <ClockIcon size={10} className="inline mr-1.5 text-accent" />}
                      {conv.title}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDrawerConfirmDeleteId(conv.id);
                      }}
                      className="shrink-0 p-1 rounded text-text-muted hover:text-error hover:bg-error/10 transition-colors"
                      aria-label={t('sidebar.deleteConversation', 'Delete conversation')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
              {conversations.length === 0 && (
                <p className="px-4 py-3 text-xs text-text-muted">{t('sidebar.noConversations', 'No conversations yet')}</p>
              )}
            </div>
          </div>
        </div>
      </MobileDrawer>

      <div className="flex-1 overflow-hidden relative">
        {/* Main content area: flex row for ChatView + ArtifactsPanel */}
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
              onCronSaved={refreshConversations}
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
