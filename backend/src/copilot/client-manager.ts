import { CopilotClient } from '@github/copilot-sdk';
import { createLogger } from '../utils/logger.js';

const log = createLogger('copilot-client');

export class ClientManager {
  private client: CopilotClient | null = null;

  async getClient(): Promise<CopilotClient> {
    if (!this.client) {
      log.info('Creating CopilotClient');
      this.client = new CopilotClient();
      await this.client.start();
      log.info('CopilotClient started');
    }
    return this.client;
  }

  async stop(): Promise<void> {
    if (this.client) {
      log.info('Stopping CopilotClient');
      await this.client.stop();
      this.client = null;
    }
  }

  async listModels() {
    const client = await this.getClient();
    return client.listModels();
  }
}
