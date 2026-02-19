import { CopilotClient } from '@github/copilot-sdk';
import { createLogger } from '../utils/logger.js';

const log = createLogger('copilot-client');

export interface ClientManagerConfig {
  githubToken?: string;
  githubClientId?: string;
}

const MODEL_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class ClientManager {
  private client: CopilotClient | null = null;
  private githubToken: string | undefined;
  private githubClientId: string | undefined;
  private modelCache: { models: any[]; timestamp: number } | null = null;

  constructor(config: ClientManagerConfig = {}) {
    this.githubToken = config.githubToken;
    this.githubClientId = config.githubClientId;
  }

  async getClient(): Promise<CopilotClient> {
    if (!this.client) {
      if (this.githubToken) {
        log.info('Creating CopilotClient with GitHub token');
        this.client = new CopilotClient({ githubToken: this.githubToken });
      } else {
        log.info('Creating CopilotClient with default auth (gh CLI)');
        this.client = new CopilotClient();
      }
      await this.client.start();
      log.info('CopilotClient started');
    }
    return this.client;
  }

  isClientStarted(): boolean {
    return this.client !== null;
  }

  async getAuthStatus() {
    if (this.client) {
      return this.client.getAuthStatus();
    }
    // Infer from config without starting the client
    if (this.githubToken) {
      return { isAuthenticated: true, authType: 'env' as const };
    }
    return { isAuthenticated: false, authType: 'none' as const };
  }

  async setGithubToken(token: string): Promise<void> {
    log.info('Setting new GitHub token');
    await this.stop();
    this.githubToken = token;
  }

  async stop(): Promise<void> {
    if (this.client) {
      log.info('Stopping CopilotClient');
      await this.client.stop();
      this.client = null;
    }
  }

  async listModels() {
    // Return cached models if within TTL
    if (this.modelCache && Date.now() - this.modelCache.timestamp < MODEL_CACHE_TTL_MS) {
      return this.modelCache.models;
    }

    const client = await this.getClient();
    try {
      const models = await client.listModels();
      this.modelCache = { models, timestamp: Date.now() };
      return models;
    } catch (err) {
      // On failure, return stale cache if available
      if (this.modelCache) {
        log.warn('Failed to refresh model list, returning stale cache');
        return this.modelCache.models;
      }
      throw err;
    }
  }

  getGithubClientId(): string | undefined {
    return this.githubClientId;
  }
}
