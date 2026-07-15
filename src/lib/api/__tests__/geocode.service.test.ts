/**
 * geocode.service.test.ts — client wrapper around the server-side proxy
 * `/api/geocode/autocomplete`. Never calls LocationIQ directly.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { geocodeApi, GeocodeApiError } from '../geocode.service';

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetchOk(body: unknown) {
  return vi.fn().mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => body,
  } as unknown as Response);
}

function mockFetchError(status: number, body: unknown) {
  return vi.fn().mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => body,
  } as unknown as Response);
}

describe('geocodeApi.autocomplete', () => {
  it('calls the internal proxy route, not LocationIQ directly', async () => {
    const fetchMock = mockFetchOk({ results: [] });
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    await geocodeApi.autocomplete('Calle 123');

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain('/api/geocode/autocomplete');
    expect(url).not.toContain('locationiq.com');
    expect(url).toContain(encodeURIComponent('Calle 123'));
  });

  it('returns the normalized results array from the proxy response', async () => {
    const results = [
      { label: 'Calle 123', lat: 4.1, lon: -74.1, placeId: '1' },
    ];
    globalThis.fetch = mockFetchOk({ results }) as unknown as typeof globalThis.fetch;

    const result = await geocodeApi.autocomplete('Calle 123');
    expect(result).toEqual(results);
  });

  it('returns an empty array when the proxy responds without a results key', async () => {
    globalThis.fetch = mockFetchOk({}) as unknown as typeof globalThis.fetch;
    const result = await geocodeApi.autocomplete('Calle 123');
    expect(result).toEqual([]);
  });

  it('throws GeocodeApiError with the proxy error message on non-ok responses', async () => {
    globalThis.fetch = mockFetchError(503, { error: 'geocoding_not_configured' }) as unknown as typeof globalThis.fetch;

    await expect(geocodeApi.autocomplete('Calle 123')).rejects.toMatchObject({
      status: 503,
      message: 'geocoding_not_configured',
    });
  });

  it('throws GeocodeApiError even when the error body cannot be parsed as JSON', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error('invalid json');
      },
    } as unknown as Response) as unknown as typeof globalThis.fetch;

    await expect(geocodeApi.autocomplete('Calle 123')).rejects.toBeInstanceOf(GeocodeApiError);
  });

  it('propagates AbortError as-is so callers can distinguish cancellation from real failures', async () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError');
    globalThis.fetch = vi.fn().mockRejectedValueOnce(abortError) as unknown as typeof globalThis.fetch;

    await expect(geocodeApi.autocomplete('Calle 123')).rejects.toBe(abortError);
  });

  it('forwards the AbortSignal to fetch', async () => {
    const fetchMock = mockFetchOk({ results: [] });
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
    const controller = new AbortController();

    await geocodeApi.autocomplete('Calle 123', controller.signal);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBe(controller.signal);
  });
});
