import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useConversations } from '../../hooks/useConversations';
import { useCopilot } from '../../hooks/useCopilot';
import { useTerminal } from '../../hooks/useTerminal';
import { useModels } from '../../hooks/useModels';
import { conversationApi } from '../../lib/api';
import { TopBar } from './TopBar';
import { BottomBar } from './BottomBar';
import { Sidebar } from './Sidebar';
import { ChatView } from '../copilot/ChatView';
import { TerminalView } from '../terminal/TerminalView';

type ActiveTab = 'copilot' | 'terminal';

export function AppShell({ onLogout }: { onLogout: () => void }) {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('copilot');
  const [cwd, setCwd] = useState('/home');

  const { status, send, subscribe } = useWebSocket(onLogout);
  const {
    conversations,
    create: createConversation,
    update: updateConversation,
    remove: removeConversation,
    search: searchConversations,
  } = useConversations();

  // Load models from API
  useModels();

  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const setActiveConversationId = useAppStore((s) => s.setActiveConversationId);
  const isStreaming = useAppStore((s) => s.isStreaming);
  const setMessages = useAppStore((s) => s.setMessages);
  const models = useAppStore((s) => s.models);

  const { sendMessage, abortMessage } = useCopilot({ subscribe, send });

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

  // Initialize language from i18n on mount
  const { i18n } = useTranslation();
  useEffect(() => {
    const currentLng = i18n.language || 'en';
    const normalized = currentLng.startsWith('zh') ? 'zh-TW' : 'en';
    if (normalized !== language) {
      setLanguage(normalized);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLanguageToggle = useCallback(() => {
    const next = language === 'zh-TW' ? 'en' : 'zh-TW';
    i18n.changeLanguage(next);
    setLanguage(next);
  }, [language, i18n, setLanguage]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const defaultModel = models[0]?.id || '';

  const handleNewConversation = useCallback(async () => {
    const model = models[0]?.id || 'gpt-4o';
    const conv = await createConversation(model, cwd);
    setActiveConversationId(conv.id);
    setSidebarOpen(false);
  }, [createConversation, cwd, setActiveConversationId, models]);

  const handleSelectConversation = useCallback(
    async (id: string) => {
      setActiveConversationId(id);
      setSidebarOpen(false);
      // Load messages for this conversation
      try {
        const msgs = await conversationApi.getMessages(id);
        setMessages(msgs);
      } catch {
        // ignore
      }
    },
    [setActiveConversationId, setMessages],
  );

  const handleSend = useCallback(
    (text: string) => {
      if (!activeConversationId) return;
      sendMessage(activeConversationId, text);
    },
    [activeConversationId, sendMessage],
  );

  const handleCwdChange = useCallback(
    (newCwd: string) => {
      setCwd(newCwd);
      send({ type: 'cwd:change', data: { cwd: newCwd } });
    },
    [send],
  );

  const handleModelChange = useCallback(
    (modelId: string) => {
      if (activeConversationId) {
        updateConversation(activeConversationId, { title: activeConversation?.title });
        // Model changes will be applied on next session creation
      }
    },
    [activeConversationId, updateConversation, activeConversation],
  );

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      <TopBar
        title={activeConversation?.title || t('app.title')}
        modelName={activeConversation?.model || defaultModel}
        status={status}
        theme={theme}
        language={language}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        onThemeToggle={toggleTheme}
        onLanguageToggle={handleLanguageToggle}
      />

      <div className="flex-1 overflow-hidden relative">
        {/* Main content area */}
        <div className={`h-full ${activeTab === 'copilot' ? 'block' : 'hidden'}`}>
          <ChatView onNewConversation={handleNewConversation} />
        </div>
        <div className={`h-full ${activeTab === 'terminal' ? 'block' : 'hidden'}`}>
          <TerminalView
            onData={handleData}
            onResize={handleResize}
            onReady={handleReady}
            writeRef={writeRef}
          />
        </div>
      </div>

      <BottomBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSend={handleSend}
        onAbort={abortMessage}
        isStreaming={isStreaming}
        disabled={!activeConversationId}
        currentModel={activeConversation?.model || defaultModel}
        onModelChange={handleModelChange}
      />

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelect={handleSelectConversation}
        onCreate={handleNewConversation}
        onDelete={async (id) => {
          await removeConversation(id);
          if (activeConversationId === id) setActiveConversationId(null);
        }}
        onPin={async (id, pinned) => {
          await updateConversation(id, { pinned });
        }}
        onRename={async (id, title) => {
          await updateConversation(id, { title });
        }}
        onSearch={searchConversations}
      />
    </div>
  );
}
