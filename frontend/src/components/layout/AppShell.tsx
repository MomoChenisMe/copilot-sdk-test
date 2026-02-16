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
import { conversationApi, configApi } from '../../lib/api';
import { uploadFiles } from '../../lib/upload-api';
import type { AttachedFile } from '../shared/AttachmentPreview';
import { TopBar } from './TopBar';
import { TabBar } from './TabBar';
import { ChatView } from '../copilot/ChatView';
import { SettingsPanel } from '../settings/SettingsPanel';

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

  // Load models and skills from API
  useModels();
  useSkills();

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

  const { sendMessage, abortMessage, cleanupDedup } = useTabCopilot({ subscribe, send });

  const handleBashCwdChange = useCallback(
    async (newCwd: string) => {
      const tabId = useAppStore.getState().activeTabId;
      if (!tabId) return;
      const tab = useAppStore.getState().tabs[tabId];
      if (!tab) return;
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
  const activePresets = useAppStore((s) => s.activePresets);
  const togglePreset = useAppStore((s) => s.togglePreset);

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
    // Sync activeConversationId with restored activeTabId
    const restoredTabId = useAppStore.getState().activeTabId;
    if (restoredTabId) {
      const restoredTab = useAppStore.getState().tabs[restoredTabId];
      setActiveConversationId(restoredTab?.conversationId ?? null);
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
  const handleNewTab = useCallback(async () => {
    const model = lastSelectedModel || models[0]?.id || 'gpt-4o';
    const conv = await createConversation(model, cwd);
    openTab(conv.id, conv.title || t('tabBar.newTab', 'New Chat'));
    setActiveConversationId(conv.id);
  }, [createConversation, cwd, openTab, setActiveConversationId, models, lastSelectedModel, t]);

  const handleSelectTab = useCallback(
    async (tabId: string) => {
      setActiveTab(tabId);
      const tab = useAppStore.getState().tabs[tabId];
      if (!tab) return;
      const conversationId = tab.conversationId;
      setActiveConversationId(conversationId);

      // Lazy-load messages if not yet loaded
      if (!tab.messagesLoaded) {
        try {
          const msgs = await conversationApi.getMessages(conversationId);
          useAppStore.getState().setTabMessages(tabId, msgs);
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
      if (tab) {
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
      if (tab.isStreaming) {
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
    async (text: string, attachments?: AttachedFile[]) => {
      if (!activeTabId) return;

      let fileRefs: Array<{ id: string; originalName: string; mimeType: string; size: number; path: string }> | undefined;
      if (attachments && attachments.length > 0) {
        try {
          fileRefs = await uploadFiles(attachments.map((a) => a.file));
        } catch {
          // Upload failed — send without files
        }
      }

      sendMessage(activeTabId, text, fileRefs);
    },
    [activeTabId, sendMessage],
  );

  const handleBashSend = useCallback(
    (command: string) => {
      if (!activeTabId) return;
      const conv = conversations.find(
        (c) => c.id === useAppStore.getState().tabs[activeTabId]?.conversationId,
      );
      sendBashCommand(command, conv?.cwd || cwd);
    },
    [activeTabId, sendBashCommand, conversations, cwd],
  );

  const handleAbort = useCallback(() => {
    if (!activeTabId) return;
    const tab = useAppStore.getState().tabs[activeTabId];
    if (tab) {
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

  const handleCwdChange = useCallback(
    async (newCwd: string) => {
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

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      <TopBar
        title={activeConversation?.title || t('app.title')}
        status={status}
        theme={theme}
        onThemeToggle={toggleTheme}
        onHomeClick={handleHomeClick}
        onSettingsClick={() => setSettingsOpen(!settingsOpen)}
      />

      <TabBar
        onNewTab={handleNewTab}
        onSelectTab={handleSelectTab}
        onCloseTab={handleCloseTab}
        onSwitchConversation={handleSwitchConversation}
        conversations={conversations.map((c) => ({
          id: c.id,
          title: c.title,
          pinned: c.pinned,
          updatedAt: c.updatedAt,
        }))}
      />

      <div className="flex-1 overflow-hidden relative">
        {/* Main content area */}
        <div className="h-full flex flex-col">
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
            currentCwd={activeConversation?.cwd}
            onCwdChange={handleCwdChange}
            onClearConversation={() => {
              if (activeTabId) {
                useAppStore.getState().clearTabStreaming(activeTabId);
                useAppStore.getState().setTabMessages(activeTabId, []);
              }
            }}
            onSettingsOpen={() => setSettingsOpen(true)}
          />
        </div>
      </div>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        activePresets={activePresets}
        onTogglePreset={togglePreset}
        onLanguageToggle={handleLanguageToggle}
        language={language}
        onLogout={onLogout}
      />

    </div>
  );
}
