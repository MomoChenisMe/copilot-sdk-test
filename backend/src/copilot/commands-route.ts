import { Router } from 'express';

// Static fallback list of known Copilot CLI slash commands
const SDK_COMMANDS = [
  { name: 'explain', description: 'Explain how the selected code works' },
  { name: 'fix', description: 'Propose a fix for problems in the selected code' },
  { name: 'test', description: 'Generate unit tests for the selected code' },
  { name: 'doc', description: 'Add documentation comments to the selected code' },
  { name: 'optimize', description: 'Optimize the selected code for performance' },
  { name: 'simplify', description: 'Simplify the selected code' },
];

export function createCommandsRoute(): Router {
  const router = Router();

  router.get('/commands', (_req, res) => {
    res.json(SDK_COMMANDS);
  });

  return router;
}
