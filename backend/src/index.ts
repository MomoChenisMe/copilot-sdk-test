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

  // Express app
  const app = express();
  app.use(express.json());

  // Auth routes (no auth required)
  app.use('/api/auth', createAuthRoutes(sessionStore, passwordHash));

  // Protected routes
  app.use('/api/conversations', authMiddleware, createConversationRoutes(repo));
  app.use('/api/copilot', authMiddleware, createModelsRoute(clientManager));
  app.use('/api/copilot', authMiddleware, createCommandsRoute());
  app.use('/api/copilot/auth', authMiddleware, createCopilotAuthRoutes(clientManager));
  app.use('/api/prompts', authMiddleware, createPromptsRoutes(promptStore));
  app.use('/api/memory', authMiddleware, createMemoryRoutes(promptStore));
  app.use('/api/skills', authMiddleware, createSkillsRoutes(skillStore, builtinSkillStore));
  app.use('/api/upload', authMiddleware, createUploadRoutes(path.resolve(config.dbPath, '../uploads')));

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
  const promptComposer = new PromptComposer(promptStore, config.maxPromptLength);
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
  const streamManager = StreamManager.getInstance({
    sessionManager,
    repo,
    maxConcurrency: config.maxConcurrency,
    promptComposer,
    skillStore: mergedSkillStore,
    selfControlTools,
  });

  // Register WS handlers
  registerHandler('copilot', createCopilotHandler(streamManager, repo));
  registerHandler('terminal', createTerminalHandler(config.defaultCwd));
  registerHandler('cwd', createCwdHandler((newCwd) => {
    log.info({ cwd: newCwd }, 'Working directory changed');
  }));
  registerHandler('bash', createBashExecHandler(config.defaultCwd));

  // Graceful shutdown
  setupGracefulShutdown([
    async () => {
      await streamManager.shutdownAll();
    },
    async () => {
      await clientManager.stop();
    },
    async () => {
      db.close();
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
