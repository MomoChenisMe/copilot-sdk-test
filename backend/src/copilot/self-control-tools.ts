import type { Tool, ToolInvocation } from '@github/copilot-sdk';
import type { PromptFileStore } from '../prompts/file-store.js';
import type { SkillFileStore } from '../skills/file-store.js';
import type { BuiltinSkillStore } from '../skills/builtin-store.js';

const MAX_PROMPT_SIZE = 50 * 1024; // 50KB for profile/agent/preferences
const MAX_SKILL_SIZE = 100 * 1024; // 100KB for skills

export interface SelfControlToolsDeps {
  promptStore: PromptFileStore;
  skillStore: SkillFileStore;
  builtinSkillStore: BuiltinSkillStore;
}

export function createSelfControlTools(deps: SelfControlToolsDeps): Tool[] {
  const { promptStore, skillStore, builtinSkillStore } = deps;

  const readProfile: Tool = {
    name: 'read_profile',
    description: 'Read the user profile (PROFILE.md). Returns the current profile content.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    handler: async () => {
      return { content: promptStore.readFile('PROFILE.md') };
    },
  };

  const updateProfile: Tool = {
    name: 'update_profile',
    description: 'Update the user profile (PROFILE.md). Overwrites the entire file content.',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The new profile content (markdown)' },
      },
      required: ['content'],
      additionalProperties: false,
    },
    handler: async (args: any) => {
      if (Buffer.byteLength(args.content, 'utf-8') > MAX_PROMPT_SIZE) {
        return { ok: false, error: 'Content exceeds maximum size of 50KB' };
      }
      promptStore.writeFile('PROFILE.md', args.content);
      return { ok: true };
    },
  };

  const readAgentRules: Tool = {
    name: 'read_agent_rules',
    description: 'Read the agent rules (AGENT.md). Returns the current agent rules content.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    handler: async () => {
      return { content: promptStore.readFile('AGENT.md') };
    },
  };

  const updateAgentRules: Tool = {
    name: 'update_agent_rules',
    description: 'Update the agent rules (AGENT.md). Overwrites the entire file content.',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The new agent rules content (markdown)' },
      },
      required: ['content'],
      additionalProperties: false,
    },
    handler: async (args: any) => {
      if (Buffer.byteLength(args.content, 'utf-8') > MAX_PROMPT_SIZE) {
        return { ok: false, error: 'Content exceeds maximum size of 50KB' };
      }
      promptStore.writeFile('AGENT.md', args.content);
      return { ok: true };
    },
  };

  const readPreferences: Tool = {
    name: 'read_preferences',
    description: 'Read the user preferences (memory/preferences.md). Returns the current preferences content.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    handler: async () => {
      return { content: promptStore.readFile('memory/preferences.md') };
    },
  };

  const updatePreferences: Tool = {
    name: 'update_preferences',
    description: 'Update the user preferences (memory/preferences.md). Overwrites the entire file content.',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The new preferences content (markdown)' },
      },
      required: ['content'],
      additionalProperties: false,
    },
    handler: async (args: any) => {
      if (Buffer.byteLength(args.content, 'utf-8') > MAX_PROMPT_SIZE) {
        return { ok: false, error: 'Content exceeds maximum size of 50KB' };
      }
      promptStore.writeFile('memory/preferences.md', args.content);
      return { ok: true };
    },
  };

  const listSkills: Tool = {
    name: 'list_skills',
    description: 'List all available skills (both built-in and user-created).',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    handler: async () => {
      const builtinSkills = builtinSkillStore.listSkills().map((s) => ({
        name: s.name,
        description: s.description,
        builtin: true,
      }));
      const userSkills = skillStore.listSkills().map((s) => ({
        name: s.name,
        description: s.description,
        builtin: false,
      }));
      return { skills: [...builtinSkills, ...userSkills] };
    },
  };

  const readSkill: Tool = {
    name: 'read_skill',
    description: 'Read a skill by name. Returns the skill content, description, and whether it is built-in.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'The skill name' },
      },
      required: ['name'],
      additionalProperties: false,
    },
    handler: async (args: any) => {
      // Check builtin first
      const builtin = builtinSkillStore.readSkill(args.name);
      if (builtin) {
        return { name: builtin.name, description: builtin.description, content: builtin.content, builtin: true };
      }
      // Then user skills
      const skill = skillStore.readSkill(args.name);
      if (skill) {
        return { name: skill.name, description: skill.description, content: skill.content, builtin: false };
      }
      return { ok: false, error: `Skill "${args.name}" not found` };
    },
  };

  const createSkill: Tool = {
    name: 'create_skill',
    description: 'Create a new user skill. Cannot create a skill with a built-in skill name.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'The skill name (alphanumeric, hyphens, underscores)' },
        description: { type: 'string', description: 'A short description of the skill' },
        content: { type: 'string', description: 'The skill content (markdown)' },
      },
      required: ['name', 'description', 'content'],
      additionalProperties: false,
    },
    handler: async (args: any) => {
      if (builtinSkillStore.hasSkill(args.name)) {
        return { ok: false, error: `Cannot create skill "${args.name}": it is a built-in skill` };
      }
      if (Buffer.byteLength(args.content, 'utf-8') > MAX_SKILL_SIZE) {
        return { ok: false, error: 'Skill content exceeds maximum size of 100KB' };
      }
      skillStore.writeSkill(args.name, args.description, args.content);
      return { ok: true };
    },
  };

  const updateSkill: Tool = {
    name: 'update_skill',
    description: 'Update an existing user skill. Cannot modify built-in skills.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'The skill name to update' },
        description: { type: 'string', description: 'Updated description' },
        content: { type: 'string', description: 'Updated skill content (markdown)' },
      },
      required: ['name', 'description', 'content'],
      additionalProperties: false,
    },
    handler: async (args: any) => {
      if (builtinSkillStore.hasSkill(args.name)) {
        return { ok: false, error: `Cannot modify skill "${args.name}": it is a built-in skill` };
      }
      if (Buffer.byteLength(args.content, 'utf-8') > MAX_SKILL_SIZE) {
        return { ok: false, error: 'Skill content exceeds maximum size of 100KB' };
      }
      skillStore.writeSkill(args.name, args.description, args.content);
      return { ok: true };
    },
  };

  const deleteSkill: Tool = {
    name: 'delete_skill',
    description: 'Delete a user skill. Cannot delete built-in skills.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'The skill name to delete' },
      },
      required: ['name'],
      additionalProperties: false,
    },
    handler: async (args: any) => {
      if (builtinSkillStore.hasSkill(args.name)) {
        return { ok: false, error: `Cannot delete skill "${args.name}": it is a built-in skill` };
      }
      skillStore.deleteSkill(args.name);
      return { ok: true };
    },
  };

  return [
    readProfile,
    updateProfile,
    readAgentRules,
    updateAgentRules,
    readPreferences,
    updatePreferences,
    listSkills,
    readSkill,
    createSkill,
    updateSkill,
    deleteSkill,
  ];
}
