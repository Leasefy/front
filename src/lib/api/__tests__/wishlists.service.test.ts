/**
 * wishlists.service.test.ts — contract tests against the real backend routes
 *
 * Backend contract (back/src/wishlists/wishlists.controller.ts):
 *   (1) GET    /wishlists                     → BARE ARRAY of items, newest first
 *   (2) POST   /wishlists/items { propertyId } → idempotent add
 *   (3) DELETE /wishlists/items/:propertyId    → 204, idempotent remove
 *   (4) there is NO /wishlists/check/:id route — the service must not expose check()
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { wishlistsApi } from '../wishlists.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetchJson(body: unknown, status = 200) {
  // apiClient uses res.text() then JSON.parse — not res.json().
  return vi.fn().mockResolvedValueOnce({
    ok: true,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response);
}

function mockFetchNoContent() {
  return vi.fn().mockResolvedValueOnce({
    ok: true,
    status: 204,
    text: async () => '',
    json: async () => ({}),
  } as unknown as Response);
}

const BARE_ARRAY_RESPONSE = [
  {
    userId: 'user-1',
    propertyId: 'prop-newest',
    createdAt: '2026-07-15T12:00:00.000Z',
    property: { id: 'prop-newest', title: 'Apto Chapinero' },
  },
  {
    userId: 'user-1',
    propertyId: 'prop-oldest',
    createdAt: '2026-07-01T09:00:00.000Z',
    property: { id: 'prop-oldest', title: 'Casa Suba' },
  },
];

beforeEach(() => {
  process.env.NEXT_PUBLIC_BACKEND_URL = 'http://backend.test';
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── (1) getMine — GET /wishlists, bare array parsing ────────────────────────

describe('wishlistsApi.getMine', () => {
  it('calls GET /wishlists (not /wishlists/items)', async () => {
    const fetchMock = mockFetchJson(BARE_ARRAY_RESPONSE);
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    await wishlistsApi.getMine();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl: string = fetchMock.mock.calls[0][0] as string;
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(calledUrl.endsWith('/wishlists')).toBe(true);
    expect(init.method).toBe('GET');
  });

  it('parses the BARE ARRAY response into propertyIds preserving order', async () => {
    globalThis.fetch = mockFetchJson(BARE_ARRAY_RESPONSE) as typeof globalThis.fetch;

    const ids = await wishlistsApi.getMine();

    expect(ids).toEqual(['prop-newest', 'prop-oldest']);
  });

  it('returns an empty array when the wishlist is empty', async () => {
    globalThis.fetch = mockFetchJson([]) as typeof globalThis.fetch;

    const ids = await wishlistsApi.getMine();

    expect(ids).toEqual([]);
  });
});

// ── (2) add — POST /wishlists/items ─────────────────────────────────────────

describe('wishlistsApi.add', () => {
  it('POSTs to /wishlists/items with { propertyId } body', async () => {
    const fetchMock = mockFetchJson({ userId: 'user-1', propertyId: 'prop-1' }, 201);
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    await wishlistsApi.add('prop-1');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl: string = fetchMock.mock.calls[0][0] as string;
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(calledUrl.endsWith('/wishlists/items')).toBe(true);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ propertyId: 'prop-1' });
  });
});

// ── (3) remove — DELETE /wishlists/items/:propertyId ────────────────────────

describe('wishlistsApi.remove', () => {
  it('DELETEs /wishlists/items/:propertyId and resolves on 204', async () => {
    const fetchMock = mockFetchNoContent();
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    await expect(wishlistsApi.remove('prop-1')).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl: string = fetchMock.mock.calls[0][0] as string;
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(calledUrl.endsWith('/wishlists/items/prop-1')).toBe(true);
    expect(init.method).toBe('DELETE');
  });
});

// ── (4) check — phantom route must be gone ──────────────────────────────────

describe('wishlistsApi.check', () => {
  it('is not exposed (backend has no /wishlists/check/:id route)', () => {
    expect((wishlistsApi as Record<string, unknown>).check).toBeUndefined();
  });
});
