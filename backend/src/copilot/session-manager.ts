import type { CopilotSession } from '@github/copilot-sdk';
import type { ClientManager } from './client-manager.js';
import { autoApprovePermission } from './permission.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('copilot-session');

export interface SystemMessage {
  mode: 'append' | 'replace';
  content: string;
}

export interface CreateSessionOptions {
  model: string;
  workingDirectory: string;
  systemMessage?: SystemMessage;
  skillDirectories?: string[];
  disabledSkills?: string[];
  tools?: any[];
  onPermissionRequest?: (...args: any[]) => any;
  onUserInputRequest?: (...args: any[]) => any;
}

export interface ResumeSessionOptions {
  systemMessage?: SystemMessage;
  tools?: any[];
  onPermissionRequest?: (...args: any[]) => any;
  onUserInputRequest?: (...args: any[]) => any;
}

export interface GetOrCreateSessionOptions {
  sdkSessionId: string | null;
  model: string;
  workingDirectory: string;
  systemMessage?: SystemMessage;
  skillDirectories?: string[];
  disabledSkills?: string[];
  tools?: any[];
  onPermissionRequest?: (...args: any[]) => any;
  onUserInputRequest?: (...args: any[]) => any;
}

export class SessionManager {
  constructor(private clientManager: ClientManager) {}

  async createSession(options: CreateSessionOptions): Promise<CopilotSession> {
    const client = await this.clientManager.getClient();

    log.info({ model: options.model, cwd: options.workingDirectory }, 'Creating SDK session');

    const sessionConfig: Record<string, unknown> = {
      model: options.model,
      workingDirectory: options.workingDirectory,
      infiniteSessions: { enabled: true },
      onPermissionRequest: options.onPermissionRequest ?? autoApprovePermission,
      ...(options.onUserInputRequest && { onUserInputRequest: options.onUserInputRequest }),
    };

    if (options.systemMessage) {
      sessionConfig.systemMessage = options.systemMessage;
    }

    if (options.skillDirectories) {
      sessionConfig.skillDirectories = options.skillDirectories;
    }

    if (options.disabledSkills) {
      sessionConfig.disabledSkills = options.disabledSkills;
    }

    if (options.tools) {
      sessionConfig.tools = options.tools;
    }

    const session = await client.createSession(sessionConfig as any);

    log.info({ sessionId: session.sessionId }, 'SDK session created');
    return session;
  }

  async resumeSession(sdkSessionId: string, options?: ResumeSessionOptions): Promise<CopilotSession> {
    const client = await this.clientManager.getClient();

    log.info({ sessionId: sdkSessionId }, 'Resuming SDK session');

    const resumeConfig: Record<string, unknown> = {
      onPermissionRequest: options?.onPermissionRequest ?? autoApprovePermission,
      ...(options?.onUserInputRequest && { onUserInputRequest: options.onUserInputRequest }),
    };

    if (options?.systemMessage) {
      resumeConfig.systemMessage = options.systemMessage;
    }

    if (options?.tools) {
      resumeConfig.tools = options.tools;
    }

    const session = await client.resumeSession(sdkSessionId, resumeConfig as any);

    return session;
  }

  async getOrCreateSession(options: GetOrCreateSessionOptions): Promise<CopilotSession> {
    if (options.sdkSessionId) {
      return this.resumeSession(options.sdkSessionId, {
        systemMessage: options.systemMessage,
        tools: options.tools,
        onPermissionRequest: options.onPermissionRequest,
        onUserInputRequest: options.onUserInputRequest,
      });
    }
    return this.createSession({
      model: options.model,
      workingDirectory: options.workingDirectory,
      systemMessage: options.systemMessage,
      skillDirectories: options.skillDirectories,
      disabledSkills: options.disabledSkills,
      tools: options.tools,
      onPermissionRequest: options.onPermissionRequest,
      onUserInputRequest: options.onUserInputRequest,
    });
  }

  async sendMessage(session: CopilotSession, prompt: string, files?: Array<{ id: string; originalName: string; mimeType: string; size: number; path: string }>): Promise<string> {
    log.info({ sessionId: session.sessionId, promptLength: prompt.length, filesCount: files?.length ?? 0 }, 'Sending message');
    const sendOptions: Record<string, unknown> = { prompt };
    if (files && files.length > 0) {
      sendOptions.attachments = files.map((f) => ({ type: 'file', path: f.path, displayName: f.originalName }));
    }
    return session.send(sendOptions as any);
  }

  async abortMessage(session: CopilotSession): Promise<void> {
    log.info({ sessionId: session.sessionId }, 'Aborting message');
    await session.abort();
  }
}
