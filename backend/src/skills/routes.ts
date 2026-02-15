import { Router } from 'express';
import type { SkillFileStore } from './file-store.js';
import { sanitizeName } from '../prompts/file-store.js';

export function createSkillsRoutes(store: SkillFileStore): Router {
  const router = Router();

  // GET /api/skills — list all skills
  router.get('/', (_req, res) => {
    const skills = store.listSkills();
    res.json({ skills });
  });

  // GET /api/skills/:name — get single skill
  router.get('/:name', (req, res) => {
    const skill = store.readSkill(req.params.name);
    if (!skill) {
      res.status(404).json({ error: 'Skill not found' });
      return;
    }
    res.json(skill);
  });

  // PUT /api/skills/:name — create or update skill
  router.put('/:name', (req, res) => {
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

  // DELETE /api/skills/:name — delete skill
  router.delete('/:name', (req, res) => {
    store.deleteSkill(req.params.name);
    res.json({ ok: true });
  });

  return router;
}
