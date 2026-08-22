/**
 * route.test.ts — security-critical branches of the LocationIQ reverse-geocode
 * proxy, mirroring src/app/api/geocode/autocomplete/route.test.ts:
 *   1. missing/invalid lat/lon -> 400, no upstream call at all
 *   2. missing LOCATIONIQ_API_KEY -> fail-closed 503, key never touched
 *   3. upstream failure -> 502, key never leaked in the response
 *   4. LocationIQ 404 (no address for these coords, e.g. open water) -> { result: null }
 *   5. success -> delegates to normalizeReverseResult
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

const ORIGINAL_ENV = process.env.LOCATIONIQ_API_KEY;

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  process.env.LOCATIONIQ_API_KEY = ORIGINAL_ENV;
});

function requestFor(params: string) {
  return new NextRequest(`http://localhost:3001/api/geocode/reverse?${params}`);
}

describe('GET /api/geocode/reverse', () => {
  it('returns 400 without calling fetch when lat/lon are missing', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const res = await GET(requestFor(''));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 400 without calling fetch when lat/lon are not finite numbers', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const res = await GET(requestFor('lat=not-a-number&lon=-74.0'));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails closed with 503 when LOCATIONIQ_API_KEY is not configured', async () => {
    delete process.env.LOCATIONIQ_API_KEY;
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const res = await GET(requestFor('lat=4.6&lon=-74.0'));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body).toEqual({ error: 'geocoding_not_configured' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never includes the API key anywhere in the response body', async () => {
    process.env.LOCATIONIQ_API_KEY = 'super-secret-key';
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as unknown as Response) as unknown as typeof globalThis.fetch;

    const res = await GET(requestFor('lat=4.6&lon=-74.0'));
    const rawText = JSON.stringify(await res.json());

    expect(rawText).not.toContain('super-secret-key');
  });

  it('returns 502 when the LocationIQ request throws (network failure)', async () => {
    process.env.LOCATIONIQ_API_KEY = 'a-key';
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error('network down')) as unknown as typeof globalThis.fetch;

    const res = await GET(requestFor('lat=4.6&lon=-74.0'));
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body).toEqual({ error: 'geocoding_unavailable' });
  });

  it('returns 502 when LocationIQ responds with a non-ok, non-404 status', async () => {
    process.env.LOCATIONIQ_API_KEY = 'a-key';
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as unknown as Response) as unknown as typeof globalThis.fetch;

    const res = await GET(requestFor('lat=4.6&lon=-74.0'));
    expect(res.status).toBe(502);
  });

  it('treats a 404 from LocationIQ (no address for these coords) as result: null, not an error', async () => {
    process.env.LOCATIONIQ_API_KEY = 'a-key';
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Unable to geocode' }),
    } as unknown as Response) as unknown as typeof globalThis.fetch;

    const res = await GET(requestFor('lat=4.6&lon=-74.0'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ result: null });
  });

  it('normalizes a successful LocationIQ response via normalizeReverseResult', async () => {
    process.env.LOCATIONIQ_API_KEY = 'a-key';
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        place_id: '1',
        lat: '4.6',
        lon: '-74.0',
        display_name: 'Calle 123, Bogotá',
        address: { road: 'Calle 123', city: 'Bogotá' },
      }),
    } as unknown as Response) as unknown as typeof globalThis.fetch;

    const res = await GET(requestFor('lat=4.6&lon=-74.0'));
    const body = await res.json();

    expect(body.result).toEqual({
      label: 'Calle 123, Bogotá',
      lat: 4.6,
      lon: -74.0,
      placeId: '1',
      city: 'Bogotá',
      road: 'Calle 123',
    });
  });

  it('forwards lat/lon to the LocationIQ upstream URL', async () => {
    process.env.LOCATIONIQ_API_KEY = 'a-key';
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as unknown as Response);
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    await GET(requestFor('lat=4.6768&lon=-74.0482'));

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain('lat=4.6768');
    expect(url).toContain('lon=-74.0482');
    expect(url).toContain('locationiq.com');
  });
});
