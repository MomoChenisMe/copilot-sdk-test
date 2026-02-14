import { Router } from 'express';
import type { ConversationRepository } from './repository.js';

export function createConversationRoutes(repo: ConversationRepository): Router {
  const router = Router();

  // Search must be before :id routes to avoid matching "search" as an id
  router.get('/search', (req, res) => {
    const q = req.query.q as string | undefined;
    if (!q) {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }
    const results = repo.search(q);
    res.json(results);
  });

  router.post('/', (req, res) => {
    const { model, cwd } = req.body;
    if (!model || typeof model !== 'string') {
      res.status(400).json({ error: 'model is required' });
      return;
    }
    if (!cwd || typeof cwd !== 'string') {
      res.status(400).json({ error: 'cwd is required' });
      return;
    }
    const conversation = repo.create({ model, cwd });
    res.status(201).json(conversation);
  });

  router.get('/', (_req, res) => {
    const conversations = repo.list();
    res.json(conversations);
  });

  router.get('/:id', (req, res) => {
    const conversation = repo.getById(req.params.id);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json(conversation);
  });

  router.patch('/:id', (req, res) => {
    const { title, pinned, sdkSessionId, model } = req.body;
    const updated = repo.update(req.params.id, { title, pinned, sdkSessionId, model });
    if (!updated) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json(updated);
  });

  router.delete('/:id', (req, res) => {
    const deleted = repo.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json({ ok: true });
  });

  router.get('/:id/messages', (req, res) => {
    const conversation = repo.getById(req.params.id);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    const messages = repo.getMessages(req.params.id);
    res.json(messages);
  });

  return router;
}
