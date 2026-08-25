/**
 * visits.service.test.ts — audit fix: confirm() must hit the real back route.
 *
 * Endpoint (on NEXT_PUBLIC_BACKEND_URL):
 *   PATCH /visits/:id/accept  (back: @Patch(':id/accept'), visits.controller.ts:261)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { visitsApi } from '../visits.service';
import type { BackendVisit } from '../visits.types';

function mockFetchOnce(body: unknown, status = 200) {
  // apiClient reads res.text() then JSON.parse (never res.json()).
  return vi.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
    json: async () => body,
  } as unknown as Response);
}

// apiClient binds BACKEND_URL at import time; env has no override → built-in default.
const BASE = 'http://localhost:3000';

const backendVisit: BackendVisit = {
  id: 'visit-1',
  tenantId: 'tenant-1',
  propertyId: 'prop-1',
  status: 'ACCEPTED',
  visitDate: '2026-04-12T00:00:00.000Z',
  startTime: '10:00',
  tenantNotes: null,
  createdAt: '2026-04-01T00:00:00.000Z',
  tenant: { firstName: 'Juan', lastName: 'Pérez' },
  property: { title: 'Apto 101' },
} as unknown as BackendVisit;

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('visitsApi.confirm', () => {
  it('PATCHes /visits/:id/accept (not /confirm) with no body', async () => {
    const fetchMock = mockFetchOnce(backendVisit);
    globalThis.fetch = fetchMock as typeof globalThis.fetch;

    const result = await visitsApi.confirm('visit-1');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE}/visits/visit-1/accept`);
    expect(init.method).toBe('PATCH');
    expect(init.body).toBeUndefined();
    expect(result.status).toBe('confirmed');
  });
});
