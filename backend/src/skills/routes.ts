import { Router } from 'express';
import multer from 'multer';
import type { SkillFileStore } from './file-store.js';
import type { BuiltinSkillStore } from './builtin-store.js';
import { sanitizeName } from '../prompts/file-store.js';
import { extractAndInstallSkill, installSkillFromContent, convertGitHubUrl } from './skill-installer.js';

const MAX_ZIP_SIZE = 10 * 1024 * 1024; // 10MB

export function createSkillsRoutes(store: SkillFileStore, builtinStore?: BuiltinSkillStore): Router {
  const router = Router();

  // Multer for ZIP upload — store in memory
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_ZIP_SIZE, files: 1 },
  });

  // GET /api/skills — list all skills (builtin first, then user)
  router.get('/', (_req, res) => {
    const builtinSkills = builtinStore
      ? builtinStore.listSkills()
      : [];
    const userSkills = store.listSkills().map((s) => ({ ...s, builtin: false as const }));
    res.json({ skills: [...builtinSkills, ...userSkills] });
  });

  // POST /api/skills/upload — upload ZIP skill package
  router.post('/upload', upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }
      const skillsDir = (store as any).basePath;
      const result = await extractAndInstallSkill(file.buffer, skillsDir);
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Installation failed' });
    }
  });

  // POST /api/skills/install-url — install skill from URL
  router.post('/install-url', async (req, res) => {
    try {
      const { url } = req.body ?? {};
      if (!url || typeof url !== 'string') {
        res.status(400).json({ error: 'URL is required' });
        return;
      }

      // Convert GitHub URLs to raw content URLs
      const rawUrl = convertGitHubUrl(url);

      // Download the content
      const response = await fetch(rawUrl);
      if (!response.ok) {
        res.status(400).json({ error: `Failed to download: ${response.status} ${response.statusText}` });
        return;
      }

      const contentType = response.headers.get('content-type') ?? '';
      const skillsDir = (store as any).basePath;

      if (contentType.includes('application/zip') || contentType.includes('application/octet-stream') || rawUrl.endsWith('.zip')) {
        // Handle ZIP content
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const result = await extractAndInstallSkill(buffer, skillsDir);
        res.json({ ok: true, ...result });
      } else {
        // Handle text content (SKILL.md)
        const text = await response.text();
        const result = await installSkillFromContent(text, skillsDir);
        res.json({ ok: true, ...result });
      }
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Installation failed' });
    }
  });

  // GET /api/skills/:name — get single skill (builtin priority)
  router.get('/:name', (req, res) => {
    if (builtinStore) {
      const builtin = builtinStore.readSkill(req.params.name);
      if (builtin) {
        res.json(builtin);
        return;
      }
    }
    const skill = store.readSkill(req.params.name);
    if (!skill) {
      res.status(404).json({ error: 'Skill not found' });
      return;
    }
    res.json({ ...skill, builtin: false });
  });

  // PUT /api/skills/:name — create or update skill (reject builtin)
  router.put('/:name', (req, res) => {
    if (builtinStore?.hasSkill(req.params.name)) {
      res.status(403).json({ error: 'Cannot modify built-in skills' });
      return;
    }
    try {
      const name = sanitizeName(req.params.name);
      const description = req.body?.description ?? '';
      const content = req.body?.content ?? '';
      store.writeSkill(name, description, content);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid name' });
    }
  });

  // DELETE /api/skills/:name — delete skill (reject builtin)
  router.delete('/:name', (req, res) => {
    if (builtinStore?.hasSkill(req.params.name)) {
      res.status(403).json({ error: 'Cannot delete built-in skills' });
      return;
    }
    store.deleteSkill(req.params.name);
    res.json({ ok: true });
  });

  // Multer error handling
  router.use((err: any, _req: any, res: any, next: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ error: 'ZIP file exceeds 10MB size limit' });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  });

  return router;
}
