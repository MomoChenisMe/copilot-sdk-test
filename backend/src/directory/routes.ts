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

  // ── Fuzzy file search across entire project ──

  const IGNORE_DIRS = new Set([
    '.git', 'node_modules', 'dist', 'build', '.next', '__pycache__',
    '.cache', '.DS_Store', '.angular', '.vite', 'coverage', '.turbo',
  ]);

  const MAX_SEARCH_DEPTH = 8;
  const MAX_SEARCH_FILES = 10_000;

  interface SearchEntry {
    name: string;
    path: string;
    relativePath: string;
    isDirectory: boolean;
    score: number;
  }

  function walkAndScore(
    rootDir: string,
    query: string,
    limit: number,
  ): SearchEntry[] {
    const lowerQuery = query.toLowerCase();
    const results: SearchEntry[] = [];
    let scanned = 0;

    function walk(dir: string, depth: number) {
      if (depth > MAX_SEARCH_DEPTH || scanned >= MAX_SEARCH_FILES) return;

      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (scanned >= MAX_SEARCH_FILES) return;
        scanned++;

        if (IGNORE_DIRS.has(entry.name)) continue;
        if (entry.name.startsWith('.') && entry.isDirectory()) continue;

        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(rootDir, fullPath);
        const lowerName = entry.name.toLowerCase();
        const lowerRelative = relativePath.toLowerCase();

        const isDir = entry.isDirectory();

        // Skip binary files
        if (!isDir && BINARY_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
          continue;
        }

        // Score: exact filename match > filename contains > path contains
        let score = 0;
        if (lowerName === lowerQuery) {
          score = 100;
        } else if (lowerName.includes(lowerQuery)) {
          score = 80;
        } else if (lowerRelative.includes(lowerQuery)) {
          score = 60;
        }

        if (score > 0) {
          results.push({ name: entry.name, path: fullPath, relativePath, isDirectory: isDir, score });
        }

        if (isDir) {
          walk(fullPath, depth + 1);
        }
      }
    }

    walk(rootDir, 0);

    // Sort by score desc, then by name asc
    results.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

    return results.slice(0, limit);
  }

  router.get('/search', (req, res) => {
    const root = req.query.root as string | undefined;
    const query = req.query.q as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);

    if (!root) {
      res.status(400).json({ error: 'root parameter is required' });
      return;
    }

    const resolvedRoot = path.resolve(root);

    try {
      const stat = fs.statSync(resolvedRoot);
      if (!stat.isDirectory()) {
        res.status(400).json({ error: 'root is not a directory' });
        return;
      }
    } catch {
      res.status(400).json({ error: 'root does not exist' });
      return;
    }

    if (!query || query.trim() === '') {
      res.json({ results: [] });
      return;
    }

    const results = walkAndScore(resolvedRoot, query.trim(), limit);
    res.json({ results });
  });

  return router;
}
