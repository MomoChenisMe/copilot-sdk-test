import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.ico',
  '.mp4', '.mp3', '.avi', '.mov', '.mkv', '.wav', '.flac', '.ogg',
  '.zip', '.tar', '.gz', '.bz2', '.xz', '.7z', '.rar',
  '.exe', '.bin', '.dll', '.so', '.dylib',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.o', '.a', '.lib', '.class', '.pyc', '.wasm',
]);

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

export function createDirectoryRoutes(): Router {
  const router = Router();

  router.get('/', (req, res) => {
    const rawPath = (req.query.path as string | undefined) ?? os.homedir();
    const showHidden = req.query.showHidden !== 'false'; // Default: show hidden directories
    const includeFiles = req.query.includeFiles === 'true';

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

    const result: Record<string, unknown> = {
      currentPath: resolvedPath,
      parentPath: path.dirname(resolvedPath),
      directories,
    };

    if (includeFiles) {
      const files = entries
        .filter((e) => e.isFile())
        .filter((e) => showHidden || !e.name.startsWith('.'))
        .filter((e) => !BINARY_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
        .filter((e) => {
          try {
            const s = fs.statSync(path.join(resolvedPath, e.name));
            return s.size <= MAX_FILE_SIZE;
          } catch {
            return false;
          }
        })
        .map((e) => {
          const filePath = path.join(resolvedPath, e.name);
          const s = fs.statSync(filePath);
          return { name: e.name, path: filePath, size: s.size };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      result.files = files;
    }

    res.json(result);
  });

  return router;
}
