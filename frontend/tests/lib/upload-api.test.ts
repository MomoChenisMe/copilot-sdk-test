import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadFiles } from '../../src/lib/upload-api';

describe('uploadFiles', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should upload files via POST /api/upload and return file references', async () => {
    const mockResponse = {
      files: [
        { id: 'abc', originalName: 'test.txt', mimeType: 'text/plain', size: 10, path: '/tmp/abc.txt' },
      ],
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
    const result = await uploadFiles([file]);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/upload',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result).toEqual(mockResponse.files);
  });

  it('should send files as FormData with field name "files"', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ files: [] }),
    } as Response);

    const file = new File(['data'], 'data.csv', { type: 'text/csv' });
    await uploadFiles([file]);

    const call = (globalThis.fetch as any).mock.calls[0];
    const body = call[1].body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.getAll('files')).toHaveLength(1);
  });

  it('should throw error when response is not ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }),
    } as Response);

    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    await expect(uploadFiles([file])).rejects.toThrow();
  });

  it('should handle multiple files', async () => {
    const mockResponse = {
      files: [
        { id: '1', originalName: 'a.txt', mimeType: 'text/plain', size: 1, path: '/tmp/1.txt' },
        { id: '2', originalName: 'b.txt', mimeType: 'text/plain', size: 2, path: '/tmp/2.txt' },
      ],
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const files = [
      new File(['a'], 'a.txt', { type: 'text/plain' }),
      new File(['bb'], 'b.txt', { type: 'text/plain' }),
    ];
    const result = await uploadFiles(files);
    expect(result).toHaveLength(2);
  });
});
