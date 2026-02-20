import { Router } from 'express';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { createLogger } from '../utils/logger.js';

const log = createLogger('github-routes');
const execFileAsync = promisify(execFile);

const NAME_WITH_OWNER_RE = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;
const CLONE_TIMEOUT_MS = 60_000;

export function createGithubRoutes(): Router {
  const router = Router();

  // Check if gh CLI is available and authenticated
  router.get('/status', async (_req, res) => {
    try {
      await execFileAsync('gh', ['auth', 'status'], { timeout: 10_000 });
      res.json({ available: true });
    } catch {
      res.json({ available: false });
    }
  });

  // List user's repos
  router.get('/repos', async (_req, res) => {
    try {
      const { stdout } = await execFileAsync('gh', [
        'repo', 'list',
        '--json', 'name,nameWithOwner,description,isPrivate,url',
        '--limit', '50',
      ], { timeout: 30_000 });
      const repos = JSON.parse(stdout);
      res.json({ repos });
    } catch (err) {
      log.error({ err }, 'Failed to list repos');
      res.status(500).json({ error: 'Failed to list repositories' });
    }
  });

  // Clone a repo
  router.post('/clone', async (req, res) => {
    const { nameWithOwner, targetPath: customPath } = req.body;

    if (!nameWithOwner || typeof nameWithOwner !== 'string') {
      res.status(400).json({ error: 'nameWithOwner is required' });
      return;
    }

    if (!NAME_WITH_OWNER_RE.test(nameWithOwner)) {
      res.status(400).json({ error: 'Invalid nameWithOwner format' });
      return;
    }

    // Use custom path if provided, otherwise default to ~/Projects/owner/repo
    const [owner, repo] = nameWithOwner.split('/');
    const targetPath = customPath && typeof customPath === 'string'
      ? resolve(customPath)
      : resolve(homedir(), 'Projects', owner, repo);

    if (existsSync(targetPath)) {
      res.json({ path: targetPath, alreadyExists: true });
      return;
    }

    try {
      await execFileAsync('gh', ['repo', 'clone', nameWithOwner, targetPath, '--', '--depth', '1'], {
        timeout: CLONE_TIMEOUT_MS,
      });
      res.json({ path: targetPath, alreadyExists: false });
    } catch (err) {
      log.error({ err, nameWithOwner }, 'Failed to clone repo');
      res.status(500).json({ error: 'Failed to clone repository' });
    }
  });

  return router;
}
