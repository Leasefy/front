/**
 * legal.service.test.ts — TDD tests for getConsentText
 *
 * Coverage:
 *   (1) builds correct URL with default params (type=habeas-data-centrales, lang=es)
 *   (2) builds correct URL with explicit params
 *   (3) parses ConsentTextResponse and returns it
 *   (4) throws on 404 with a clear ConsentTextNotFoundError signal
 *   (5) throws on other API errors
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getConsentText, ConsentTextNotFoundError } from '../legal.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetchOk(body: unknown) {
  return vi.fn().mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => body,
  } as unknown as Response);
}

function mockFetchStatus(status: number, body: unknown = {}) {
  return vi.fn().mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => body,
  } as unknown as Response);
}

const SAMPLE_RESPONSE = {
  version: 'habeas-data-centrales-v1',
  type: 'habeas-data-centrales',
  lang: 'es',
  title: 'Autorización de tratamiento de datos',
  text: 'Autorizo de manera libre, previa, expresa e informada...',
  effective_from: '2026-06-08',
  supersedes: null,
};

beforeEach(() => {
  process.env.NEXT_PUBLIC_BACKEND_URL = 'http://backend.test';
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── (1) Default params ────────────────────────────────────────────────────

describe('getConsentText — default params', () => {
  it('calls /legal/consent-text with type=habeas-data-centrales and lang=es', async () => {
    const fetchMock = mockFetchOk(SAMPLE_RESPONSE);
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    await getConsentText();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl: string = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/legal/consent-text');
    expect(calledUrl).toContain('type=habeas-data-centrales');
    expect(calledUrl).toContain('lang=es');
  });
});

// ── (2) Explicit params ───────────────────────────────────────────────────

describe('getConsentText — explicit params', () => {
  it('passes custom type and lang in the query string', async () => {
    const fetchMock = mockFetchOk({ ...SAMPLE_RESPONSE, type: 'other-type', lang: 'en' });
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    await getConsentText({ type: 'other-type', lang: 'en' });

    const calledUrl: string = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('type=other-type');
    expect(calledUrl).toContain('lang=en');
  });
});

// ── (3) Happy path — parses response ─────────────────────────────────────

describe('getConsentText — happy path', () => {
  it('returns parsed ConsentTextResponse with all fields', async () => {
    globalThis.fetch = mockFetchOk(SAMPLE_RESPONSE) as typeof globalThis.fetch;

    const result = await getConsentText();

    expect(result.version).toBe('habeas-data-centrales-v1');
    expect(result.type).toBe('habeas-data-centrales');
    expect(result.lang).toBe('es');
    expect(result.title).toBe('Autorización de tratamiento de datos');
    expect(result.text).toContain('Autorizo');
    expect(result.effective_from).toBe('2026-06-08');
    expect(result.supersedes).toBeNull();
  });
});

// ── (4) 404 → ConsentTextNotFoundError ───────────────────────────────────

describe('getConsentText — 404', () => {
  it('throws ConsentTextNotFoundError when backend returns 404', async () => {
    globalThis.fetch = mockFetchStatus(404) as typeof globalThis.fetch;

    await expect(getConsentText()).rejects.toThrow(ConsentTextNotFoundError);
  });

  it('ConsentTextNotFoundError is instanceof Error', async () => {
    globalThis.fetch = mockFetchStatus(404) as typeof globalThis.fetch;

    try {
      await getConsentText();
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(ConsentTextNotFoundError);
    }
  });
});

// ── (5) Other errors ──────────────────────────────────────────────────────

describe('getConsentText — non-404 errors', () => {
  it('throws a generic error for 500', async () => {
    globalThis.fetch = mockFetchStatus(500, { message: 'Internal error' }) as typeof globalThis.fetch;

    await expect(getConsentText()).rejects.toThrow();
  });
});
