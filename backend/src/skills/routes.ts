import { Router } from 'express';
import type { SkillFileStore } from './file-store.js';
import type { BuiltinSkillStore } from './builtin-store.js';
import { sanitizeName } from '../prompts/file-store.js';

export function createSkillsRoutes(store: SkillFileStore, builtinStore?: BuiltinSkillStore): Router {
  const router = Router();

  // GET /api/skills — list all skills (builtin first, then user)
  router.get('/', (_req, res) => {
    const builtinSkills = builtinStore
      ? builtinStore.listSkills()
      : [];
    const userSkills = store.listSkills().map((s) => ({ ...s, builtin: false as const }));
    res.json({ skills: [...builtinSkills, ...userSkills] });
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

  return router;
}
