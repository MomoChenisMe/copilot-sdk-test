import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWebSearchTool } from '../../src/copilot/tools/web-search.js';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('createWebSearchTool', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should return null when no API key is provided', () => {
    expect(createWebSearchTool('')).toBeNull();
    expect(createWebSearchTool(undefined as any)).toBeNull();
  });

  it('should return a valid Tool when API key is provided', () => {
    const tool = createWebSearchTool('test-api-key');
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('web_search');
    expect(tool!.parameters.properties).toHaveProperty('query');
    expect(tool!.parameters.required).toContain('query');
  });

  it('should call Brave Search API with correct headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        web: {
          results: [
            {
              title: 'Example Result',
              url: 'https://example.com',
              description: 'An example search result',
            },
          ],
        },
      }),
    });

    const tool = createWebSearchTool('brave-key-123');
    await tool!.handler({ query: 'test query', count: 5 });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('https://api.search.brave.com/res/v1/web/search'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Subscription-Token': 'brave-key-123',
          Accept: 'application/json',
        }),
      }),
    );
  });

  it('should pass query and count as URL params', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ web: { results: [] } }),
    });

    const tool = createWebSearchTool('key');
    await tool!.handler({ query: 'hello world', count: 3 });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('q=hello+world');
    expect(calledUrl).toContain('count=3');
  });

  it('should return formatted results on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        web: {
          results: [
            { title: 'Result 1', url: 'https://a.com', description: 'Desc 1' },
            { title: 'Result 2', url: 'https://b.com', description: 'Desc 2' },
          ],
        },
      }),
    });

    const tool = createWebSearchTool('key');
    const result = await tool!.handler({ query: 'test' });

    expect(result.results).toHaveLength(2);
    expect(result.results[0]).toEqual({
      title: 'Result 1',
      url: 'https://a.com',
      description: 'Desc 1',
    });
  });

  it('should handle 401 Unauthorized error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    const tool = createWebSearchTool('invalid-key');
    const result = await tool!.handler({ query: 'test' });

    expect(result.error).toMatch(/401/);
  });

  it('should handle 429 Rate Limit error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });

    const tool = createWebSearchTool('key');
    const result = await tool!.handler({ query: 'test' });

    expect(result.error).toMatch(/429/);
  });

  it('should handle network errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    const tool = createWebSearchTool('key');
    const result = await tool!.handler({ query: 'test' });

    expect(result.error).toMatch(/Network failure/);
  });

  it('should default count to 5 when not provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ web: { results: [] } }),
    });

    const tool = createWebSearchTool('key');
    await tool!.handler({ query: 'test' });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('count=5');
  });
});
