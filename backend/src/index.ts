import { createServer } from 'node:http';
import path from 'node:path';
import express from 'express';
import bcrypt from 'bcrypt';
import { loadConfig } from './config.js';
import { createLogger } from './utils/logger.js';
import { initDb } from './conversation/db.js';
import { ConversationRepository } from './conversation/repository.js';
import { SessionStore } from './auth/session.js';
import { createAuthRoutes } from './auth/routes.js';
import { createAuthMiddleware } from './auth/middleware.js';
import { createConversationRoutes } from './conversation/routes.js';
import { ClientManager } from './copilot/client-manager.js';
import { SessionManager } from './copilot/session-manager.js';
import { createModelsRoute } from './copilot/models-route.js';
import { createSdkUpdateRoute } from './copilot/sdk-update-route.js';
import { McpManager } from './mcp/mcp-manager.js';
import { adaptMcpTools } from './mcp/mcp-tool-adapter.js';
import { createMcpRoutes } from './mcp/routes.js';
import { createCommandsRoute } from './copilot/commands-route.js';
import { createCopilotAuthRoutes } from './copilot/auth-routes.js';
import { createWsServer } from './ws/server.js';
import { registerHandler } from './ws/router.js';
import { createCopilotHandler } from './ws/handlers/copilot.js';
import { createTerminalHandler } from './ws/handlers/terminal.js';
import { createCwdHandler } from './ws/handlers/cwd.js';
import { createBashExecHandler } from './ws/handlers/bash-exec.js';
import { StreamManager } from './copilot/stream-manager.js';
import { setupGracefulShutdown } from './utils/graceful-shutdown.js';
import { PromptFileStore } from './prompts/file-store.js';
import { PromptComposer } from './prompts/composer.js';
import { createPromptsRoutes } from './prompts/routes.js';
import { createMemoryRoutes } from './prompts/memory-routes.js';
import { SkillFileStore } from './skills/file-store.js';
import { BuiltinSkillStore } from './skills/builtin-store.js';
import { createSkillsRoutes } from './skills/routes.js';
import { createUploadRoutes } from './upload/routes.js';
import { createSelfControlTools } from './copilot/self-control-tools.js';
import { TaskRepository } from './task/repository.js';
import { createTaskTools } from './copilot/tools/task-tools.js';
import { createConfigRoutes, readBraveApiKey } from './config-routes.js';
import { createDirectoryRoutes } from './directory/routes.js';
import { createWebSearchTool } from './copilot/tools/web-search.js';
import { MemoryStore } from './memory/memory-store.js';
import { MemoryIndex } from './memory/memory-index.js';
import { createMemoryTools } from './memory/memory-tools.js';
import { createAutoMemoryRoutes } from './memory/memory-routes.js';
import { MemoryExtractor } from './memory/memory-extractor.js';
import { CompactionMonitor } from './memory/compaction-monitor.js';
import { readMemoryConfig } from './memory/memory-config.js';
import { CronStore } from './cron/cron-store.js';
import { CronScheduler } from './cron/cron-scheduler.js';
import { createCronRoutes } from './cron/cron-routes.js';
import { createAiTaskExecutor, createShellTaskExecutor } from './cron/cron-executors.js';

const log = createLogger('main');

export function createApp() {
  const config = loadConfig();

  // Database
  const db = initDb(config.dbPath);
  const repo = new ConversationRepository(db);

  // Auth
  const sessionStore = new SessionStore();
  const passwordHash = bcrypt.hashSync(config.webPassword, 10);
  const authMiddleware = createAuthMiddleware(sessionStore);

  // Prompts file store
  const promptStore = new PromptFileStore(config.promptsPath);
  promptStore.ensureDirectories();

  // Auto Memory system
  const memoryBasePath = path.resolve(config.promptsPath, 'auto-memory');
  const memoryStore = new MemoryStore(memoryBasePath);
  memoryStore.ensureDirectories();
  const memoryDb = initDb(path.resolve(memoryBasePath, 'memory-index.db'));
  const memoryIndex = new MemoryIndex(memoryDb);
  memoryIndex.reindexFromFiles(memoryStore);
  const memoryConfig = readMemoryConfig(memoryBasePath);
  const memoryExtractor = new MemoryExtractor(memoryStore, memoryIndex, {
    extractIntervalSeconds: memoryConfig.extractIntervalSeconds,
    minNewMessages: memoryConfig.minNewMessages,
  });
  const compactionMonitor = new CompactionMonitor({
    flushThreshold: memoryConfig.flushThreshold,
    onFlush: (conversationId) => {
      log.info({ conversationId }, 'Compaction flush triggered — extracting memory');
    },
  });

  // Skills file stores
  const skillStore = new SkillFileStore(config.skillsPath);
  skillStore.ensureDirectory();
  const builtinSkillStore = new BuiltinSkillStore(
    path.resolve(import.meta.dirname, 'skills/builtin'),
  );

  // Copilot SDK
  const clientManager = new ClientManager({
    githubToken: config.githubToken,
    githubClientId: config.githubClientId,
  });
  const sessionManager = new SessionManager(clientManager);

  // MCP Manager
  const mcpManager = new McpManager();
  const mcpConfigPath = path.resolve(process.cwd(), '.mcp.json');
  mcpManager.loadFromConfig(mcpConfigPath).catch((err) => {
    log.warn('Failed to load MCP config:', err);
  });

  // Express app
  const app = express();
  app.use(express.json());

  // Auth routes (no auth required)
  app.use('/api/auth', createAuthRoutes(sessionStore, passwordHash));

  // Protected routes
  app.use('/api/conversations', authMiddleware, createConversationRoutes(repo));
  app.use('/api/copilot', authMiddleware, createModelsRoute(clientManager));
  app.use('/api/copilot', authMiddleware, createSdkUpdateRoute());
  app.use('/api/mcp', authMiddleware, createMcpRoutes(mcpManager));
  app.use('/api/copilot', authMiddleware, createCommandsRoute());
  app.use('/api/copilot/auth', authMiddleware, createCopilotAuthRoutes(clientManager));
  app.use('/api/prompts', authMiddleware, createPromptsRoutes(promptStore));
  app.use('/api/memory', authMiddleware, createMemoryRoutes(promptStore));
  app.use('/api/skills', authMiddleware, createSkillsRoutes(skillStore, builtinSkillStore));
  app.use('/api/upload', authMiddleware, createUploadRoutes(path.resolve(config.dbPath, '../uploads')));
  app.use('/api/auto-memory', authMiddleware, createAutoMemoryRoutes(memoryStore, memoryIndex, memoryBasePath));
  app.use('/api/directories', authMiddleware, createDirectoryRoutes());

  // Config routes (Brave API key etc.) — mounted after streamManager below

  // Config endpoint (returns non-sensitive config values)
  app.get('/api/config', authMiddleware, (_req, res) => {
    res.json({ defaultCwd: config.defaultCwd });
  });

  // Serve static files in production
  if (config.nodeEnv === 'production') {
    const staticDir = path.resolve(import.meta.dirname, '../../frontend/dist');
    app.use(express.static(staticDir));
    // SPA fallback
    app.get('*', (_req, res) => {
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  // HTTP + WebSocket server
  const httpServer = createServer(app);
  const wss = createWsServer(httpServer, sessionStore);

  // StreamManager for background streaming
  const promptComposer = new PromptComposer(promptStore, config.maxPromptLength, memoryStore);
  const mergedSkillStore = {
    getSkillDirectories: () => [
      ...builtinSkillStore.getSkillDirectories(),
      ...skillStore.getSkillDirectories(),
    ],
  };
  const selfControlTools = createSelfControlTools({
    promptStore,
    skillStore,
    builtinSkillStore,
  });

  // Add task tools
  const taskRepo = new TaskRepository(db);
  const taskTools = createTaskTools(taskRepo, StreamManager.sessionConversationMap);
  selfControlTools.push(...taskTools);

  // Add memory tools
  if (memoryConfig.enabled) {
    const memoryTools = createMemoryTools(memoryStore, memoryIndex);
    selfControlTools.push(...memoryTools);
    log.info('Memory tools enabled (4 tools: read_memory, append_memory, search_memory, append_daily_log)');
  }

  // Conditionally add web search tool if Brave API key is configured
  const braveApiKey = readBraveApiKey(promptStore);
  const webSearchTool = createWebSearchTool(braveApiKey);
  if (webSearchTool) {
    selfControlTools.push(webSearchTool);
    log.info('Web search tool enabled (Brave API key configured)');
  }
  const streamManager = StreamManager.getInstance({
    sessionManager,
    repo,
    maxConcurrency: config.maxConcurrency,
    promptComposer,
    skillStore: mergedSkillStore,
    selfControlTools,
    getMcpTools: () => adaptMcpTools(mcpManager),
  });

  // Cron scheduler
  const cronStore = new CronStore(db);
  const cronScheduler = new CronScheduler(cronStore, {
    executeAiTask: createAiTaskExecutor(repo, streamManager),
    executeShellTask: createShellTaskExecutor(),
  });
  cronScheduler.loadAll();
  app.use('/api/cron', authMiddleware, createCronRoutes(cronStore, cronScheduler));

  // Config routes (Brave API key etc.) — mounted after streamManager so callback can update tools
  app.use('/api/config', authMiddleware, createConfigRoutes(promptStore, {
    onBraveApiKeyChange: (newKey: string) => {
      // Remove existing web_search tool and rebuild selfControlTools
      const filtered = selfControlTools.filter((t: any) => t.name !== 'web_search');
      selfControlTools.length = 0;
      selfControlTools.push(...filtered);
      const newTool = createWebSearchTool(newKey);
      if (newTool) {
        selfControlTools.push(newTool);
        log.info('Web search tool updated with new Brave API key');
      } else {
        log.info('Web search tool removed (empty Brave API key)');
      }
      streamManager.updateSelfControlTools([...selfControlTools]);
    },
  }));

  // Register WS handlers
  const copilotHandler = createCopilotHandler(streamManager, repo);
  registerHandler('copilot', copilotHandler);
  registerHandler('terminal', createTerminalHandler(config.defaultCwd));
  registerHandler('cwd', createCwdHandler((newCwd) => {
    log.info({ cwd: newCwd }, 'Working directory changed');
  }));
  registerHandler('bash', createBashExecHandler(config.defaultCwd, (command, output, exitCode, cwd) => {
    const convId = copilotHandler.lastConversationId;
    if (convId) {
      const truncated = output.length > 10000 ? output.slice(0, 10000) + '\n...[truncated]' : output;
      const ctx = `$ ${command}\n${truncated}\n[exit code: ${exitCode}]`;
      repo.addMessage(convId, { role: 'user', content: ctx, metadata: { bash: true, exitCode, cwd } });
      copilotHandler.addBashContext(convId, ctx);
    }
  }));

  // Memory extraction on stream:idle
  if (memoryConfig.enabled && memoryConfig.autoExtract) {
    streamManager.on('stream:idle', async (conversationId: string) => {
      try {
        const messages = repo.getMessages(conversationId);
        if (!memoryExtractor.shouldExtract(conversationId, messages.length)) return;
        const mapped = messages
          .filter((m: any) => m.role === 'user' || m.role === 'assistant')
          .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
        const candidates = memoryExtractor.extractCandidates(mapped);
        if (candidates.length > 0) {
          const actions = memoryExtractor.reconcile(candidates);
          memoryExtractor.apply(actions);
          log.info({ conversationId, candidates: candidates.length, actions: actions.length }, 'Memory extraction completed');
        }
        memoryExtractor.markExtracted(conversationId);
      } catch (err) {
        log.error({ err, conversationId }, 'Memory extraction failed');
      }
    });
  }

  // Graceful shutdown
  setupGracefulShutdown([
    async () => {
      await cronScheduler.shutdown();
    },
    async () => {
      await streamManager.shutdownAll();
    },
    async () => {
      await clientManager.stop();
    },
    async () => {
      db.close();
      memoryDb.close();
    },
    async () => {
      wss.close();
      httpServer.close();
    },
  ]);

  return { app, httpServer, config };
}

// Only start listening when run directly (not imported by tests)
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const { httpServer, config } = createApp();
  httpServer.listen(config.port, () => {
    log.info({ port: config.port, env: config.nodeEnv }, 'AI Terminal server started');
  });
}
