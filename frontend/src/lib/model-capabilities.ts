interface ModelCapabilities {
  supportsAttachments: boolean;
}

// Models that do NOT support file attachments (vision/multimodal)
const NO_ATTACHMENT_PREFIXES = [
  'o1-mini',
  'o1-preview',
  'o3-mini',
];

// Models known to support attachments
const ATTACHMENT_PREFIXES = [
  'gpt-4o',
  'gpt-4-turbo',
  'gpt-4-vision',
  'claude-3',
  'claude-3.5',
  'gemini',
];

const DEFAULT_CAPABILITIES: ModelCapabilities = {
  supportsAttachments: true,
};

export function getModelCapabilities(modelId: string | undefined): ModelCapabilities {
  if (!modelId) return DEFAULT_CAPABILITIES;
  // Check no-attachment models first (more restrictive)
  for (const prefix of NO_ATTACHMENT_PREFIXES) {
    if (modelId === prefix || modelId.startsWith(`${prefix}-`)) {
      return { supportsAttachments: false };
    }
  }

  // Check known attachment-supporting models
  for (const prefix of ATTACHMENT_PREFIXES) {
    if (modelId === prefix || modelId.startsWith(`${prefix}-`) || modelId.startsWith(prefix)) {
      return { supportsAttachments: true };
    }
  }

  // Default: assume supports attachments
  return DEFAULT_CAPABILITIES;
}

export function modelSupportsAttachments(modelId: string | undefined): boolean {
  return getModelCapabilities(modelId).supportsAttachments;
}
