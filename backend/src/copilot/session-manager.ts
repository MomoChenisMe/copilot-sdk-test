import type { CopilotSession } from '@github/copilot-sdk';
import type { ClientManager } from './client-manager.js';
import { autoApprovePermission } from './permission.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('copilot-session');

export interface CreateSessionOptions {
  model: string;
  workingDirectory: string;
}

export interface GetOrCreateSessionOptions {
  sdkSessionId: string | null;
  model: string;
  workingDirectory: string;
}

export class SessionManager {
  constructor(private clientManager: ClientManager) {}

  async createSession(options: CreateSessionOptions): Promise<CopilotSession> {
    const client = await this.clientManager.getClient();

    log.info({ model: options.model, cwd: options.workingDirectory }, 'Creating SDK session');

    const session = await client.createSession({
      model: options.model,
      workingDirectory: options.workingDirectory,
      infiniteSessions: { enabled: true },
      onPermissionRequest: autoApprovePermission,
    });

    log.info({ sessionId: session.sessionId }, 'SDK session created');
    return session;
  }

  async resumeSession(sdkSessionId: string): Promise<CopilotSession> {
    const client = await this.clientManager.getClient();

    log.info({ sessionId: sdkSessionId }, 'Resuming SDK session');

    const session = await client.resumeSession(sdkSessionId, {
      onPermissionRequest: autoApprovePermission,
    });

    return session;
  }

  async getOrCreateSession(options: GetOrCreateSessionOptions): Promise<CopilotSession> {
    if (options.sdkSessionId) {
      return this.resumeSession(options.sdkSessionId);
    }
    return this.createSession({
      model: options.model,
      workingDirectory: options.workingDirectory,
    });
  }

  async sendMessage(session: CopilotSession, prompt: string): Promise<string> {
    log.info({ sessionId: session.sessionId, promptLength: prompt.length }, 'Sending message');
    return session.send({ prompt });
  }

  async abortMessage(session: CopilotSession): Promise<void> {
    log.info({ sessionId: session.sessionId }, 'Aborting message');
    await session.abort();
  }
}
