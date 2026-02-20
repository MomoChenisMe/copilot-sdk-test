/**
 * Static mapping of model IDs/names to premium request multipliers.
 * Based on GitHub Copilot pricing as of 2026-02.
 * Update this mapping when new models are added.
 */
export const MODEL_MULTIPLIERS: Record<string, number> = {
  // Free tier (0x)
  'gpt-4.1': 0,
  'gpt-4o': 0,
  'gpt-5-mini': 0,

  // Discount tier (0.33x)
  'claude-haiku-4.5': 0.33,
  'gemini-3-flash': 0.33,
  'gpt-5.1-codex-mini': 0.33,
  'raptor-mini': 0.33,
  'grok-code-fast-1': 0,

  // Standard tier (1x)
  'claude-sonnet-4': 1,
  'claude-sonnet-4.5': 1,
  'claude-sonnet-4.6': 1,
  'gemini-2.5-pro': 1,
  'gemini-3-pro': 1,
  'gemini-3-pro-preview': 1,
  'gpt-5': 1,
  'gpt-5-codex': 1,
  'gpt-5.1': 1,
  'gpt-5.1-codex': 1,
  'gpt-5.1-codex-max': 1,
  'gpt-5.2': 1,
  'gpt-5.2-codex': 1,
  'gpt-5.3-codex': 1,

  // Premium tier (3x)
  'claude-opus-4.5': 3,
  'claude-opus-4.6': 3,

  // Ultra tier (9x)
  'claude-opus-4.6-fast': 9,
};

/**
 * Get the premium request multiplier for a model.
 * First tries exact match, then tries normalized matching
 * (strips -preview suffix, etc.).
 * Returns the multiplier if found in the mapping, null otherwise.
 */
export function getModelMultiplier(modelIdOrName: string): number | null {
  if (modelIdOrName in MODEL_MULTIPLIERS) {
    return MODEL_MULTIPLIERS[modelIdOrName];
  }

  // Normalize: lowercase, strip common suffixes like -preview
  const normalized = modelIdOrName.toLowerCase().replace(/-preview$/, '');
  if (normalized in MODEL_MULTIPLIERS) {
    return MODEL_MULTIPLIERS[normalized];
  }

  return null;
}
