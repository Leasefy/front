/**
 * contratos-source.test.ts — the command palette's contract source (T-0040).
 *
 * ## Why this file exists
 *
 * T-0040's VERIFY reverted the whole visible half of the feature in one batch —
 * the `code` clause in `matchesQuery`, the `Contrato #{code}` title fallback,
 * the new list column and the detail header — and `front` stayed at 400/400
 * files, 3610/3610 tests, `tsc` exit 0. Nothing caught it. `contratos-source.ts`
 * had ZERO test references repo-wide.
 *
 * That is the file that matters most, because it is the one that BYPASSES
 * `mapBackendContract`: `run()` casts the `GET /contracts` body straight to
 * `BackendContract[]` and reads `item.code` off it. The only guard T-0040 added
 * on this side was on the mapper — the path that was already safe. This covers
 * the path the freeze was written about.
 *
 * `matchesQuery` and the title expression are module-private, so they are
 * exercised through `contratosSource.run()` with `globalThis.fetch` stubbed,
 * which is also the seam engineering/TESTING.md §4 mandates native `fetch` for.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { BackendContract } from '@/lib/api/contracts.types';
import type { SearchSourceContext } from '@/lib/hooks/useFederatedSearch';

/**
 * `contratos-source` binds `NEXT_PUBLIC_BACKEND_URL` at MODULE LOAD and returns
 * `[]` when it is empty, so the env has to be set BEFORE the import below.
 * `vi.hoisted` runs ahead of every import — a dynamic `import()` in `beforeAll`
 * would also work, but it puts the module graph (Phosphor included) inside a
 * 10 s hook timeout and this suite is load-sensitive.
 */
const BACKEND = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_BACKEND_URL = 'http://localhost:3000';
  return 'http://localhost:3000';
});

vi.mock('@/lib/api/client', () => ({
  getAccessToken: () => 'jwt-for-tests',
}));

import { contratosSource } from '../contratos-source';

const CTX: SearchSourceContext = { agencyId: 'agency-1' };

/** The minimum a `GET /contracts` element carries for this source. */
function contract(overrides: Partial<BackendContract>): BackendContract {
  return {
    id: '7f3c1d2e-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
    propertyId: 'prop-1',
    tenantId: 'tenant-1',
    landlordId: 'landlord-1',
    status: 'ACTIVE',
    landlordName: 'Luis Pérez',
    landlordEmail: 'luis@example.com',
    landlordDocument: null,
    tenantName: 'Ana Díaz',
    tenantEmail: 'ana@example.com',
    tenantPhone: null,
    tenantDocument: '1010101010',
    propertyAddress: 'Cra 76 # 32-11',
    propertyCity: 'Medellín',
    propertyAdminFee: null,
    monthlyRent: 2_000_000,
    startDate: '2026-03-01',
    endDate: '2027-02-28',
    paymentDay: 5,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    ...overrides,
  } as BackendContract;
}

function respondWith(all: BackendContract[]) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => all,
  } as unknown as Response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const run = (query: string) =>
  contratosSource.run(query, CTX, new AbortController().signal);

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('contratosSource — searching by the consecutive number', () => {
  /*
   * The point of giving a contract a number: typing «14» finds contract #14.
   * Client-side filtering over the response `GET /contracts` already returns —
   * no new query parameter, no cost on the back.
   *
   * Proven red by deleting the `code` clause from `matchesQuery`.
   */
  it('matches a contract by its number and nothing else', async () => {
    respondWith([
      contract({ id: 'c-1', code: 14, tenantName: 'Ana Díaz' }),
      contract({
        id: 'c-2',
        code: 3,
        tenantName: 'Bruno Ramos',
        tenantDocument: '9090909090',
        tenantEmail: 'bruno@example.com',
        propertyAddress: 'Calle 30 # 5-20',
      }),
    ]);

    const results = await run('14');

    expect(results.map((r) => r.id)).toEqual(['contratos:c-1']);
  });

  it('reaches the palette through the raw response, not through mapBackendContract', async () => {
    // `run()` casts the body to BackendContract[] and never calls the mapper.
    // If `listForUser` ever stops emitting `code`, this is the surface that
    // goes dark first — and the mapper's own test would still be green.
    const fetchMock = respondWith([contract({ id: 'c-9', code: 21 })]);

    const results = await run('21');

    expect(fetchMock).toHaveBeenCalledWith(
      `${BACKEND}/contracts`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer jwt-for-tests' }),
      }),
    );
    expect(results).toHaveLength(1);
  });

  it('does not match a number that belongs to another contract', async () => {
    respondWith([contract({ id: 'c-1', code: 14 })]);

    expect(await run('15')).toHaveLength(0);
  });

  it('still matches by tenant name, address, document and email', async () => {
    respondWith([contract({ id: 'c-1', code: 14 })]);

    expect(await run('ana')).toHaveLength(1);
    expect(await run('Medellin')).toHaveLength(0); // city is not searched
    expect(await run('cra 76')).toHaveLength(1);
    expect(await run('1010101010')).toHaveLength(1);
    expect(await run('ana@example.com')).toHaveLength(1);
  });
});

describe('contratosSource — the result title', () => {
  /*
   * The number is the SECOND rung, ahead of the UUID. This fallback exists for
   * exactly the contracts with no other label — which is what a MIGRATED row
   * is. Proven red by removing the `Contrato #{code}` branch: the title falls
   * back to the truncated UUID.
   */
  it('titles a contract with no tenant name as `Contrato #N`', async () => {
    respondWith([
      contract({
        id: '7f3c1d2e-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
        code: 7,
        tenantName: null,
      }),
    ]);

    // Queried by address on purpose: this asserts the TITLE, not the search.
    const [result] = await run('cra 76');

    expect(result.title).toBe('Contrato #7');
    expect(result.title).not.toContain('7f3c1d2e');
  });

  it('keeps the tenant name as the first rung when there is one', async () => {
    respondWith([contract({ id: 'c-1', code: 7, tenantName: 'Ana Díaz' })]);

    expect((await run('cra 76'))[0].title).toBe('Ana Díaz');
  });

  it('falls back to the truncated UUID only when there is no code at all', async () => {
    // The single cause of an absent `code` is a `front` deployed ahead of a
    // pre-T-0040 `back`. The frozen degradation for that case is the old
    // behaviour, not `#0` and not `#undefined`.
    respondWith([
      contract({
        id: '7f3c1d2e-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
        code: undefined,
        tenantName: null,
      }),
    ]);

    const [result] = await run('cra 76');

    expect(result.title).toBe('Contrato 7f3c1d2e');
  });
});
