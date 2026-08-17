/**
 * documents.service.test.ts — audit fix: upload() must hit the real back route.
 *
 * Endpoint (raw fetch, on NEXT_PUBLIC_BACKEND_URL):
 *   POST /documents/upload  (back: @Controller('documents') @Post('upload'), documents-upload.controller.ts:42-48)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { documentsApi } from '../documents.service';
import { ApiError, setAccessToken } from '../client';
import type { BackendDocumentFull } from '../documents.types';

function mockFetchOnce(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const { ok = true, status = 200 } = init;
  const fn = vi.fn().mockResolvedValueOnce({
    ok,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response);
  globalThis.fetch = fn as typeof globalThis.fetch;
  return fn;
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_BACKEND_URL = 'http://backend.test';
  setAccessToken('test-token');
});

afterEach(() => {
  setAccessToken(null);
  vi.restoreAllMocks();
});

describe('documentsApi.upload', () => {
  it('POSTs multipart FormData to /documents/upload (not /documents)', async () => {
    const backendDoc: BackendDocumentFull = {
      id: 'doc-1',
      type: 'cedula',
      fileName: 'cedula.pdf',
      url: 'https://cdn.test/cedula.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      verified: false,
      createdAt: '2026-08-01T00:00:00.000Z',
    };
    const fetchMock = mockFetchOnce(backendDoc);
    const file = new File(['fake-bytes'], 'cedula.pdf', { type: 'application/pdf' });

    const result = await documentsApi.upload({ file, type: 'cedula' });

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/documents/upload')).toBe(true);
    expect(opts.method).toBe('POST');
    expect(opts.body).toBeInstanceOf(FormData);
    expect((opts.body as FormData).get('file')).toBe(file);
    expect((opts.body as FormData).get('type')).toBe('cedula');
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer test-token');
    expect(result.id).toBe('doc-1');
  });

  it('throws ApiError with the backend message on non-2xx', async () => {
    mockFetchOnce({ message: 'Tipo de documento inválido' }, { ok: false, status: 400 });
    const file = new File(['x'], 'cedula.pdf', { type: 'application/pdf' });

    await expect(documentsApi.upload({ file, type: 'cedula' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Tipo de documento inválido',
    });
  });
});
