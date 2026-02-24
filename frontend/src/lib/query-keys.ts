export const queryKeys = {
  models: {
    all: ['models'] as const,
  },
  conversations: {
    all: ['conversations'] as const,
    detail: (id: string) => ['conversations', id] as const,
    messages: (id: string) => ['conversations', id, 'messages'] as const,
    search: (q: string) => ['conversations', 'search', q] as const,
  },
  skills: {
    all: ['skills'] as const,
  },
  sdkCommands: {
    all: ['sdkCommands'] as const,
  },
  settings: {
    all: ['settings'] as const,
  },
  quota: {
    all: ['quota'] as const,
  },
  config: {
    all: ['config'] as const,
    braveApiKey: ['config', 'braveApiKey'] as const,
  },
} as const;
