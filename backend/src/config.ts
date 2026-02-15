import { z } from 'zod';
import { homedir } from 'node:os';

const configSchema = z.object({
  port: z.coerce.number().int().positive().default(3001),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  webPassword: z.string().min(1, 'WEB_PASSWORD is required'),
  sessionSecret: z.string().min(1, 'SESSION_SECRET is required'),
  defaultCwd: z.string().default(homedir()),
  dbPath: z.string().default('./data/conversations.db'),
  githubToken: z.string().optional(),
  githubClientId: z.string().optional(),
  maxConcurrency: z.coerce.number().int().positive().default(3),
  promptsPath: z.string().default('./data/prompts'),
  skillsPath: z.string().default('./data/skills'),
  maxPromptLength: z.coerce.number().int().positive().default(50_000),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  return configSchema.parse({
    port: process.env.PORT,
    nodeEnv: process.env.NODE_ENV,
    webPassword: process.env.WEB_PASSWORD,
    sessionSecret: process.env.SESSION_SECRET,
    defaultCwd: process.env.DEFAULT_CWD,
    dbPath: process.env.DB_PATH,
    githubToken: process.env.GITHUB_TOKEN,
    githubClientId: process.env.GITHUB_CLIENT_ID,
    maxConcurrency: process.env.MAX_CONCURRENCY,
    promptsPath: process.env.PROMPTS_PATH,
    skillsPath: process.env.SKILLS_PATH,
    maxPromptLength: process.env.MAX_PROMPT_LENGTH,
  });
}
