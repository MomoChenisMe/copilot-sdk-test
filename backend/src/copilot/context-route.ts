import { Router } from 'express';
import type { PromptFileStore } from '../prompts/file-store.js';
import type { SkillFileStore } from '../skills/file-store.js';
import type { BuiltinSkillStore } from '../skills/builtin-store.js';
import type { McpManager } from '../mcp/mcp-manager.js';
import { SdkUpdateChecker } from './sdk-update.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('copilot-context');

export interface ContextRouteDeps {
  promptStore: PromptFileStore;
  skillStore: SkillFileStore;
  builtinSkillStore: BuiltinSkillStore;
  mcpManager: McpManager;
  maxPromptLength?: number;
}

export interface ContextResponse {
  systemPrompt: {
    layers: Array<{ name: string; active: boolean; charCount: number }>;
    totalChars: number;
    maxChars: number;
  };
  skills: {
    builtin: Array<{ name: string; description: string; enabled: boolean }>;
    user: Array<{ name: string; description: string; enabled: boolean }>;
  };
  mcp: {
    servers: Array<{ name: string; transport: string; toolCount: number }>;
  };
  model: string | null;
  sdkVersion: string | null;
}

export function createContextRoute(deps: ContextRouteDeps): Router {
  const router = Router();
  const sdkChecker = new SdkUpdateChecker();
  const maxChars = deps.maxPromptLength ?? 50_000;

  router.get('/context', async (_req, res) => {
    try {
      // System prompt layers
      const layerFiles = [
        { name: 'SYSTEM_PROMPT', file: 'SYSTEM_PROMPT.md' },
        { name: 'PROFILE', file: 'PROFILE.md' },
        { name: 'AGENT', file: 'AGENT.md' },
      ];

      const layers = layerFiles.map((l) => {
        const content = deps.promptStore.readFile(l.file);
        return {
          name: l.name,
          active: content.trim().length > 0,
          charCount: content.length,
        };
      });

      // Add presets
      const presetNames = deps.promptStore.listFiles('presets');
      for (const name of presetNames) {
        const content = deps.promptStore.readFile(`presets/${name}.md`);
        layers.push({
          name: `preset:${name}`,
          active: content.trim().length > 0,
          charCount: content.length,
        });
      }

      // Add memory/preferences
      const prefContent = deps.promptStore.readFile('memory/preferences.md');
      layers.push({
        name: 'memory:preferences',
        active: prefContent.trim().length > 0,
        charCount: prefContent.length,
      });

      const totalChars = layers.reduce((sum, l) => sum + l.charCount, 0);

      // Skills
      const builtinSkills = deps.builtinSkillStore.listSkills().map((s) => ({
        name: s.name,
        description: s.description,
        enabled: true,
      }));
      const userSkills = deps.skillStore.listSkills().map((s) => ({
        name: s.name,
        description: s.description,
        enabled: true,
      }));

      // MCP servers
      const servers = deps.mcpManager.getServers();
      const mcpServers: Array<{ name: string; transport: string; toolCount: number }> = [];
      for (const [name, info] of servers) {
        let toolCount = 0;
        try {
          const tools = await deps.mcpManager.getAllTools();
          toolCount = tools.filter((t) => t.serverName === name).length;
        } catch {
          // Ignore tool listing errors
        }
        mcpServers.push({
          name,
          transport: info.config.transport,
          toolCount,
        });
      }

      // SDK version
      const sdkVersion = sdkChecker.getInstalledVersion();

      const response: ContextResponse = {
        systemPrompt: {
          layers,
          totalChars,
          maxChars,
        },
        skills: {
          builtin: builtinSkills,
          user: userSkills,
        },
        mcp: {
          servers: mcpServers,
        },
        model: null, // Model is client-side state; not available here
        sdkVersion,
      };

      res.json(response);
    } catch (err) {
      log.error({ err }, 'Failed to get context');
      res.status(500).json({ error: 'Failed to get context' });
    }
  });

  return router;
}
