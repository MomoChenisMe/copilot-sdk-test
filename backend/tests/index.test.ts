import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockHashSync, mockDb } = vi.hoisted(() => {
  const _mockHashSync = vi.fn(() => '$2b$10$hash');
  const _mockDb = {
    pragma: vi.fn(),
    exec: vi.fn(),
    prepare: vi.fn(() => ({
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(() => []),
    })),
    close: vi.fn(),
  };
  return { mockHashSync: _mockHashSync, mockDb: _mockDb };
});

vi.mock('../src/config.js', () => ({
  loadConfig: vi.fn(() => ({
    port: 3001,
    nodeEnv: 'test',
    webPassword: 'test-password',
    sessionSecret: 'test-secret',
    defaultCwd: '/tmp',
    dbPath: ':memory:',
    githubToken: undefined,
    githubClientId: undefined,
  })),
}));

vi.mock('../src/utils/logger.js', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

vi.mock('bcrypt', () => ({
  default: { hashSync: mockHashSync },
  hashSync: mockHashSync,
}));

vi.mock('../src/conversation/db.js', () => ({
  initDb: vi.fn(() => mockDb),
}));

vi.mock('../src/conversation/repository.js', () => ({
  ConversationRepository: vi.fn(),
}));

vi.mock('../src/auth/session.js', () => ({
  SessionStore: vi.fn(() => ({
    create: vi.fn(),
    validate: vi.fn(),
    invalidate: vi.fn(),
  })),
}));

vi.mock('../src/auth/routes.js', () => ({
  createAuthRoutes: vi.fn(() => vi.fn()),
}));

vi.mock('../src/auth/middleware.js', () => ({
  createAuthMiddleware: vi.fn(() => vi.fn((_req: unknown, _res: unknown, next: () => void) => next())),
}));

vi.mock('../src/conversation/routes.js', () => ({
  createConversationRoutes: vi.fn(() => vi.fn()),
}));

vi.mock('../src/copilot/client-manager.js', () => ({
  ClientManager: vi.fn(() => ({
    getClient: vi.fn(),
    stop: vi.fn(),
    listModels: vi.fn(),
    getAuthStatus: vi.fn(),
    setGithubToken: vi.fn(),
    getGithubClientId: vi.fn(),
  })),
}));

vi.mock('../src/copilot/session-manager.js', () => ({
  SessionManager: vi.fn(),
}));

vi.mock('../src/copilot/models-route.js', () => ({
  createModelsRoute: vi.fn(() => vi.fn()),
}));

vi.mock('../src/copilot/auth-routes.js', () => ({
  createCopilotAuthRoutes: vi.fn(() => vi.fn()),
}));

vi.mock('../src/ws/server.js', () => ({
  createWsServer: vi.fn(() => ({
    close: vi.fn(),
  })),
}));

vi.mock('../src/ws/router.js', () => ({
  registerHandler: vi.fn(),
}));

vi.mock('../src/ws/handlers/copilot.js', () => ({
  createCopilotHandler: vi.fn(() => vi.fn()),
}));

vi.mock('../src/ws/handlers/terminal.js', () => ({
  createTerminalHandler: vi.fn(() => vi.fn()),
}));

vi.mock('../src/ws/handlers/cwd.js', () => ({
  createCwdHandler: vi.fn(() => vi.fn()),
}));

vi.mock('../src/utils/graceful-shutdown.js', () => ({
  setupGracefulShutdown: vi.fn(),
}));

import { createApp } from '../src/index.js';

describe('index.ts - createApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates the app without throwing', () => {
    const { app, httpServer } = createApp();
    expect(app).toBeDefined();
    expect(httpServer).toBeDefined();
  });

  it('returns an Express app with routes configured', () => {
    const { app } = createApp();
    expect(typeof app).toBe('function');
  });

  it('returns config from loadConfig', () => {
    const { config } = createApp();
    expect(config.port).toBe(3001);
    expect(config.nodeEnv).toBe('test');
  });
});
