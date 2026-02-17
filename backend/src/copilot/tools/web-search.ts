import type { Tool } from '@github/copilot-sdk';

const BRAVE_SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search';

interface BraveResult {
  title: string;
  url: string;
  description: string;
}

export function createWebSearchTool(apiKey: string | undefined): Tool | null {
  if (!apiKey) return null;

  return {
    name: 'web_search',
    description:
      'Search the web for current information. Use this when the user asks about recent events, needs up-to-date data, or wants to look something up online.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query' },
        count: {
          type: 'number',
          description: 'Number of results to return (1-10, default 5)',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
    handler: async (args: { query: string; count?: number }) => {
      const count = args.count ?? 5;
      const params = new URLSearchParams({
        q: args.query,
        count: String(count),
      });

      try {
        const response = await fetch(`${BRAVE_SEARCH_URL}?${params}`, {
          headers: {
            'X-Subscription-Token': apiKey,
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          return {
            error: `Brave Search API error: ${response.status} ${response.statusText}`,
          };
        }

        const data = await response.json();
        const results: BraveResult[] = (data.web?.results ?? []).map(
          (r: any) => ({
            title: r.title,
            url: r.url,
            description: r.description,
          }),
        );

        return { results };
      } catch (err: any) {
        return { error: `Web search failed: ${err.message}` };
      }
    },
  } as Tool;
}
