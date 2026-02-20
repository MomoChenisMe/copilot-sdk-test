import { createServer } from 'node:http';
import fs from 'node:fs';
import { homedir } from 'node:os';
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
import { createContextRoute } from './copilot/context-route.js';
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
import { createGithubRoutes } from './github/routes.js';
import { createWebSearchTool } from './copilot/tools/web-search.js';
import { MemoryStore } from './memory/memory-store.js';
import { MemoryIndex } from './memory/memory-index.js';
import { createMemoryTools } from './memory/memory-tools.js';
import { createAutoMemoryRoutes } from './memory/memory-routes.js';
import { MemoryExtractor } from './memory/memory-extractor.js';
import { CompactionMonitor } from './memory/compaction-monitor.js';
import { readMemoryConfig } from './memory/memory-config.js';
import { MemoryLlmCaller } from './memory/llm-caller.js';
import { MemoryQualityGate } from './memory/memory-gating.js';
import { LlmMemoryExtractor } from './memory/llm-extractor.js';
import { MemoryCompactor } from './memory/memory-compaction.js';
import { CronStore } from './cron/cron-store.js';
import { CronScheduler } from './cron/cron-scheduler.js';
import { createCronRoutes } from './cron/cron-routes.js';
import { createAiTaskExecutor, createShellTaskExecutor } from './cron/cron-executors.js';
import { BackgroundSessionRunner } from './cron/background-session-runner.js';
import { createCronHandler } from './ws/handlers/cron.js';

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

  // LLM components for memory intelligence
  let memoryQualityGate: MemoryQualityGate | undefined;
  let llmMemoryExtractor: LlmMemoryExtractor | undefined;
  let memoryCompactor: MemoryCompactor | undefined;

  const anyLlmEnabled = memoryConfig.llmGatingEnabled || memoryConfig.llmExtractionEnabled || memoryConfig.llmCompactionEnabled;
  if (anyLlmEnabled) {
    if (memoryConfig.llmGatingEnabled) {
      const gatingCaller = new MemoryLlmCaller({ clientManager, model: memoryConfig.llmGatingModel });
      memoryQualityGate = new MemoryQualityGate(gatingCaller);
      log.info('Memory LLM quality gate enabled');
    }
    if (memoryConfig.llmExtractionEnabled) {
      const extractionCaller = new MemoryLlmCaller({ clientManager, model: memoryConfig.llmExtractionModel });
      llmMemoryExtractor = new LlmMemoryExtractor(extractionCaller, memoryConfig.llmExtractionMaxMessages);
      log.info('Memory LLM extraction enabled');
    }
    if (memoryConfig.llmCompactionEnabled) {
      const compactionCaller = new MemoryLlmCaller({ clientManager, model: memoryConfig.llmCompactionModel });
      memoryCompactor = new MemoryCompactor(compactionCaller, memoryStore, memoryIndex, {
        factCountThreshold: memoryConfig.llmCompactionFactThreshold,
      });
      log.info('Memory LLM compaction enabled');
    }
  }

  const memoryExtractor = new MemoryExtractor(memoryStore, memoryIndex, {
    extractIntervalSeconds: memoryConfig.extractIntervalSeconds,
    minNewMessages: memoryConfig.minNewMessages,
  }, memoryQualityGate, llmMemoryExtractor);
  const compactionMonitor = new CompactionMonitor({
    flushThreshold: memoryConfig.flushThreshold,
    onFlush: (conversationId) => {
      log.info({ conversationId }, 'Compaction flush triggered — extracting memory');
    },
  });

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
  app.use('/api/copilot', authMiddleware, createContextRoute({
    promptStore,
    skillStore,
    builtinSkillStore,
    mcpManager,
    maxPromptLength: config.maxPromptLength,
  }));
  app.use('/api/copilot/auth', authMiddleware, createCopilotAuthRoutes(clientManager));
  app.use('/api/prompts', authMiddleware, createPromptsRoutes(promptStore));
  app.use('/api/memory', authMiddleware, createMemoryRoutes(promptStore));
  app.use('/api/skills', authMiddleware, createSkillsRoutes(skillStore, builtinSkillStore));
  app.use('/api/upload', authMiddleware, createUploadRoutes(path.resolve(config.dbPath, '../uploads')));
  app.use('/api/auto-memory', authMiddleware, createAutoMemoryRoutes(memoryStore, memoryIndex, memoryBasePath, memoryCompactor));
  app.use('/api/directories', authMiddleware, createDirectoryRoutes());
  app.use('/api/github', authMiddleware, createGithubRoutes());

  // Config routes (Brave API key etc.) — mounted after streamManager below

  // Config endpoint (returns non-sensitive config values)
  app.get('/api/config', authMiddleware, (_req, res) => {
    // Validate defaultCwd exists; fall back to os.homedir() if not
    let cwd = config.defaultCwd;
    try {
      if (!fs.statSync(cwd).isDirectory()) cwd = homedir();
    } catch {
      cwd = homedir();
    }
    res.json({ defaultCwd: cwd });
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

  // Quota endpoint — returns premium quota data (cache first, then live SDK query)
  app.get('/api/copilot/quota', authMiddleware, async (_req, res) => {
    // Try cached value first
    let quota = streamManager.getQuota();
    if (!quota) {
      // No cache — proactively query SDK
      const live = await clientManager.getQuota();
      if (live) {
        streamManager.updateQuotaCache(live);
        quota = streamManager.getQuota();
      }
    }
    res.json({ quota });
  });

  // Cron scheduler with BackgroundSessionRunner (independent of StreamManager)
  const cronStore = new CronStore(db);
  const backgroundRunner = new BackgroundSessionRunner(sessionManager);
  const cronHandler = createCronHandler();
  const cronToolDeps = {
    selfControlTools: [...selfControlTools],
    getMcpTools: () => adaptMcpTools(mcpManager),
    memoryTools: memoryConfig.enabled ? createMemoryTools(memoryStore, memoryIndex) : [],
    webSearchTool,
    taskTools,
    skillStore: mergedSkillStore,
  };
  const cronScheduler = new CronScheduler(cronStore, {
    executeAiTask: createAiTaskExecutor(backgroundRunner, cronToolDeps),
    executeShellTask: createShellTaskExecutor(),
  }, cronHandler.broadcast.bind(cronHandler));
  cronScheduler.loadAll();
  app.use('/api/cron', authMiddleware, createCronRoutes(cronStore, cronScheduler, repo));

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
  registerHandler('cron', cronHandler);
  registerHandler('terminal', createTerminalHandler(config.defaultCwd));
  registerHandler('cwd', createCwdHandler((newCwd) => {
    log.info({ cwd: newCwd }, 'Working directory changed');
  }));
  registerHandler('bash', createBashExecHandler(config.defaultCwd, (command, output, exitCode, cwd, meta) => {
    const convId = meta.conversationId || copilotHandler.lastConversationId;
    if (convId) {
      const truncated = output.length > 10000 ? output.slice(0, 10000) + '\n...[truncated]' : output;
      // Save user message (command only, no $ prefix)
      repo.addMessage(convId, { role: 'user', content: command, metadata: { bash: true } });
      // Save assistant message (output with full metadata)
      repo.addMessage(convId, { role: 'assistant', content: truncated, metadata: { bash: true, exitCode, cwd, ...meta } });
      // Keep context for copilot (unchanged format)
      const ctx = `$ ${command}\n${truncated}\n[exit code: ${exitCode}]`;
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
        const candidates = await memoryExtractor.extractCandidatesSmartly(mapped);
        if (candidates.length > 0) {
          const actions = memoryExtractor.reconcile(candidates);
          await memoryExtractor.applyWithGating(actions);
          log.info({ conversationId, candidates: candidates.length, actions: actions.length }, 'Memory extraction completed');
        }
        memoryExtractor.markExtracted(conversationId);

        // Trigger compaction if needed (non-blocking)
        if (memoryCompactor?.shouldCompact()) {
          memoryCompactor.compact().then((result) => {
            if (result) {
              log.info({ before: result.beforeCount, after: result.afterCount }, 'Memory compaction completed');
            }
          }).catch((err) => {
            log.error({ err }, 'Memory compaction failed');
          });
        }
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
    log.info({ port: config.port, env: config.nodeEnv }, 'CodeForge server started');
  });
}
