/**
 * properties.service.test.ts — update/delete/create-status contract.
 *
 * Coverage:
 *   (1) propertiesApi.update → PATCH /properties/:id, mapping front type → backend enum
 *   (2) propertiesApi.delete → DELETE /properties/:id
 *   (3) propertiesApi.create forwards an explicit `status` (publish-on-create,
 *       same contract the marketplace /publicar flow uses: status AVAILABLE)
 *   (4) createPublishedWithDraftFallback: publishes normally; on the backend
 *       plan-limit 403 retries ONCE without status (DRAFT) and flags it;
 *       any other error rethrows without a retry
 *   (5) propertiesApi.getImages returns image rows WITH ids (ordered)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { propertiesApi, createPublishedWithDraftFallback } from '../properties.service';
import { setAccessToken } from '../client';

const BACKEND_PROPERTY = {
  id: 'prop-1',
  title: 'Apto',
  description: 'Desc',
  type: 'APARTMENT',
  status: 'AVAILABLE',
  city: 'Bogotá',
  neighborhood: 'Chapinero',
  address: 'Calle 53 #13-45',
  latitude: 4.65,
  longitude: -74.06,
  monthlyRent: 3200000,
  adminFee: 0,
  deposit: 0,
  bedrooms: 2,
  bathrooms: 1,
  area: 60,
  amenities: [],
  images: [],
  landlordId: 'user-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

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

describe('propertiesApi.update', () => {
  it('PATCHes /properties/:id with the given fields', async () => {
    const fetchMock = mockFetchOnce(BACKEND_PROPERTY);

    await propertiesApi.update('prop-1', { title: 'Nuevo', monthlyRent: 3500000 });

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/properties/prop-1')).toBe(true);
    expect(opts.method).toBe('PATCH');
    expect(JSON.parse(opts.body as string)).toEqual({ title: 'Nuevo', monthlyRent: 3500000 });
  });

  it('maps front lowercase type to the backend enum', async () => {
    const fetchMock = mockFetchOnce(BACKEND_PROPERTY);

    await propertiesApi.update('prop-1', { type: 'apartment' });

    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(opts.body as string).type).toBe('APARTMENT');
  });

  it('returns the mapped frontend property', async () => {
    mockFetchOnce({ ...BACKEND_PROPERTY, status: 'DRAFT' });

    const result = await propertiesApi.update('prop-1', { title: 'X' });

    expect(result.id).toBe('prop-1');
    expect(result.type).toBe('apartment');
    expect(result.status).toBe('pending'); // DRAFT maps to front 'pending'
  });
});

describe('propertiesApi.delete', () => {
  it('DELETEs /properties/:id', async () => {
    const fetchMock = mockFetchOnce({});

    await propertiesApi.delete('prop-1');

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/properties/prop-1')).toBe(true);
    expect(opts.method).toBe('DELETE');
  });
});

describe('propertiesApi.create', () => {
  it('forwards an explicit status so panel creations publish like the marketplace flow', async () => {
    const fetchMock = mockFetchOnce(BACKEND_PROPERTY);

    await propertiesApi.create({
      title: 'Apto',
      description: 'Desc',
      type: 'apartment',
      city: 'Bogotá',
      neighborhood: 'Chapinero',
      address: 'Calle 53 #13-45',
      monthlyRent: 3200000,
      bedrooms: 2,
      bathrooms: 1,
      area: 60,
      status: 'AVAILABLE',
    });

    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith('/properties')).toBe(true);
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body as string);
    expect(body.status).toBe('AVAILABLE');
    expect(body.type).toBe('APARTMENT');
  });
});

// ── (4) plan-limit fallback ──────────────────────────────────────────────────

const CREATE_INPUT = {
  title: 'Apto',
  description: 'Desc',
  type: 'apartment',
  city: 'Bogotá',
  neighborhood: 'Chapinero',
  address: 'Calle 53 #13-45',
  monthlyRent: 3200000,
  bedrooms: 2,
  bathrooms: 1,
  area: 60,
};

const PLAN_LIMIT_MESSAGE =
  'Has alcanzado el limite de 1 propiedad(es) publicadas en tu plan actual. ' +
  'Tienes 1 publicadas. Actualiza tu plan para publicar mas propiedades.';

function mockFetchSequence(
  responses: { body: unknown; ok?: boolean; status?: number }[],
) {
  const fn = vi.fn();
  for (const { body, ok = true, status = 200 } of responses) {
    fn.mockResolvedValueOnce({
      ok,
      status,
      text: async () => JSON.stringify(body),
      json: async () => body,
    } as unknown as Response);
  }
  globalThis.fetch = fn as typeof globalThis.fetch;
  return fn;
}

describe('createPublishedWithDraftFallback', () => {
  it('publishes with status AVAILABLE when the plan allows it', async () => {
    const fetchMock = mockFetchSequence([{ body: BACKEND_PROPERTY }]);

    const result = await createPublishedWithDraftFallback(CREATE_INPUT);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(opts.body as string).status).toBe('AVAILABLE');
    expect(result.publishBlocked).toBe(false);
    expect(result.property.id).toBe('prop-1');
  });

  it('retries once WITHOUT status on the plan-limit 403 and flags publishBlocked', async () => {
    const fetchMock = mockFetchSequence([
      { body: { message: PLAN_LIMIT_MESSAGE }, ok: false, status: 403 },
      { body: { ...BACKEND_PROPERTY, status: 'DRAFT' } },
    ]);

    const result = await createPublishedWithDraftFallback(CREATE_INPUT);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, retryOpts] = fetchMock.mock.calls[1] as [string, RequestInit];
    const retryBody = JSON.parse(retryOpts.body as string);
    expect(retryBody.status).toBeUndefined();
    expect(retryBody.title).toBe('Apto');
    expect(result.publishBlocked).toBe(true);
    expect(result.property.status).toBe('pending'); // DRAFT → front 'pending'
  });

  it('rethrows a non-plan-limit 403 without retrying', async () => {
    const fetchMock = mockFetchSequence([
      { body: { message: 'No tienes acceso a esta propiedad' }, ok: false, status: 403 },
    ]);

    await expect(createPublishedWithDraftFallback(CREATE_INPUT)).rejects.toMatchObject({
      status: 403,
      message: 'No tienes acceso a esta propiedad',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rethrows non-403 errors without retrying', async () => {
    const fetchMock = mockFetchSequence([
      { body: { message: 'Internal server error' }, ok: false, status: 500 },
    ]);

    await expect(createPublishedWithDraftFallback(CREATE_INPUT)).rejects.toMatchObject({
      status: 500,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// ── (5) getImages ────────────────────────────────────────────────────────────

describe('propertiesApi.getImages', () => {
  it('GETs /properties/:id and returns image rows with ids sorted by order', async () => {
    const fetchMock = mockFetchSequence([
      {
        body: {
          ...BACKEND_PROPERTY,
          images: [
            { id: 'img-2', propertyId: 'prop-1', url: 'https://cdn.test/2.jpg', order: 1, createdAt: 'x' },
            { id: 'img-1', propertyId: 'prop-1', url: 'https://cdn.test/1.jpg', order: 0, createdAt: 'x' },
          ],
        },
      },
    ]);

    const images = await propertiesApi.getImages('prop-1');

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url.endsWith('/properties/prop-1')).toBe(true);
    expect(images.map((i) => i.id)).toEqual(['img-1', 'img-2']);
    expect(images[0].url).toBe('https://cdn.test/1.jpg');
  });
});
