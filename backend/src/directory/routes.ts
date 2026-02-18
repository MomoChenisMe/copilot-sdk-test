import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export function createDirectoryRoutes(): Router {
  const router = Router();

  router.get('/', (req, res) => {
    const rawPath = (req.query.path as string | undefined) ?? os.homedir();
    const showHidden = req.query.showHidden !== 'false'; // Default: show hidden directories

    // Reject null bytes
    if (rawPath.includes('\0')) {
      res.status(400).json({ error: 'Invalid path: null bytes not allowed' });
      return;
    }

    const resolvedPath = path.resolve(rawPath);

    // Check exists and is directory
    let stat: fs.Stats;
    try {
      stat = fs.statSync(resolvedPath);
    } catch {
      res.status(400).json({ error: 'Path does not exist' });
      return;
    }

    if (!stat.isDirectory()) {
      res.status(400).json({ error: 'Path is not a directory' });
      return;
    }

    // Read directory entries
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(resolvedPath, { withFileTypes: true });
    } catch {
      res.status(400).json({ error: 'Cannot read directory' });
      return;
    }

    const directories = entries
      .filter((e) => e.isDirectory())
      .filter((e) => showHidden || !e.name.startsWith('.'))
      .map((e) => ({
        name: e.name,
        path: path.join(resolvedPath, e.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      currentPath: resolvedPath,
      parentPath: path.dirname(resolvedPath),
      directories,
    });
  });

  return router;
}
