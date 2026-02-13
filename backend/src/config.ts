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
  });
}
