/**
 * submitMandatosLote.test.ts — T-0030 WU-3, Slice A (R1), extended by WU-4
 * for auto-publish (contract.md §3.4, amendment A-1.1).
 *
 * The batch mandate-completion path applies ONE set of terms (propietario,
 * commission, contract date, agent) to every property the import just
 * created. Rules from contract.md T-0030 §3.3/§3.4 carry over unchanged
 * from the single-row flow (`CompletarMandatoDialog` /
 * `completeMandatoAndPublish`), which this file delegates to:
 *   - a 409 (duplicate mandate) is success-equivalent, never a red failure —
 *     and still publishes.
 *   - a genuine mandate failure must NOT be reported as "imported and
 *     mandated" — the property must remain visibly un-mandated (brief §4
 *     Slice A, point 5) — and MUST NOT be published.
 *   - completing the mandate publishes the property
 *     (`PATCH /properties/:id { status: 'AVAILABLE' }`), mandate first,
 *     publish second, and only if the mandate succeeded.
 *   - a failed publish does not invalidate a good mandate — reported
 *     honestly via `published: false`, nothing rolled back.
 *   - calls run sequentially, in the given order (mirrors the deliberately
 *     sequential geocode loop in StepConfirmImport.tsx — no reason to hammer
 *     the backend with N parallel POSTs for a batch mandate assignment).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '@/lib/api/client';
import type { InmuebleSinConsignacion } from '@/lib/types/inmobiliaria';

const createMock = vi.fn();
const updatePropertyMock = vi.fn();

vi.mock('@/lib/api/inmobiliaria.service', () => ({
  consignacionesApi: {
    create: (...args: unknown[]) => createMock(...args),
  },
}));

vi.mock('@/lib/api/properties.service', () => ({
  propertiesApi: {
    update: (...args: unknown[]) => updatePropertyMock(...args),
  },
}));

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}));

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import { submitMandatosLote, submitMandatosPorInmueble } from './submitMandatosLote';

function makeInmueble(overrides: Partial<InmuebleSinConsignacion> = {}): InmuebleSinConsignacion {
  return {
    propertyId: 'prop-1',
    propertyTitle: 'Depto 1',
    propertyAddress: 'Calle 1',
    propertyCity: 'Bogotá',
    propertyZone: '',
    propertyType: 'apartment',
    propertyThumbnail: null,
    monthlyRent: 1_000_000,
    adminFee: 0,
    status: 'draft',
    createdAt: '2026-08-26T00:00:00.000Z',
    ...overrides,
  };
}

const VALUES = {
  propietarioId: 'propietario-1',
  commissionPercent: 10,
  contractDate: '2026-08-26',
};

beforeEach(() => {
  createMock.mockReset();
  updatePropertyMock.mockReset();
  updatePropertyMock.mockResolvedValue({});
});

describe('submitMandatosLote', () => {
  it('creates a mandate for every property and reports all as created', async () => {
    createMock.mockResolvedValue({});

    const result = await submitMandatosLote(
      [makeInmueble({ propertyId: 'a' }), makeInmueble({ propertyId: 'b' })],
      VALUES,
    );

    expect(createMock).toHaveBeenCalledTimes(2);
    expect(result.succeededCount).toBe(2);
    expect(result.failedCount).toBe(0);
    expect(result.outcomes.map((o) => o.status)).toEqual(['created', 'created']);
  });

  it('calls consignacionesApi.create sequentially, in the given order', async () => {
    const order: string[] = [];
    createMock.mockImplementation(async (payload: { propertyId: string }) => {
      order.push(payload.propertyId);
      return {};
    });

    await submitMandatosLote(
      [makeInmueble({ propertyId: 'a' }), makeInmueble({ propertyId: 'b' }), makeInmueble({ propertyId: 'c' })],
      VALUES,
    );

    expect(order).toEqual(['a', 'b', 'c']);
  });

  it('treats a 409 as success-equivalent (contract §3.3 — the mandate already exists)', async () => {
    createMock.mockRejectedValueOnce(new ApiError(409, 'A mandate already exists for property a'));

    const result = await submitMandatosLote([makeInmueble({ propertyId: 'a' })], VALUES);

    expect(result.outcomes[0].status).toBe('alreadyExists');
    expect(result.succeededCount).toBe(1);
    expect(result.failedCount).toBe(0);
  });

  it('does NOT report a genuinely failed property as mandated (brief §4 Slice A, point 5)', async () => {
    createMock
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new ApiError(402, 'Alcanzaste el límite de propiedades de tu plan.'));

    const result = await submitMandatosLote(
      [makeInmueble({ propertyId: 'a' }), makeInmueble({ propertyId: 'b' })],
      VALUES,
    );

    expect(result.outcomes).toEqual([
      { propertyId: 'a', propertyTitle: 'Depto 1', status: 'created', published: true },
      {
        propertyId: 'b',
        propertyTitle: 'Depto 1',
        status: 'failed',
        published: false,
        mandateErrorMessage: 'Alcanzaste el límite de propiedades de tu plan.',
      },
    ]);
    expect(result.succeededCount).toBe(1);
    expect(result.failedCount).toBe(1);
  });

  it('one property failing does not stop the rest of the batch from being attempted', async () => {
    createMock
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({});

    const result = await submitMandatosLote(
      [makeInmueble({ propertyId: 'a' }), makeInmueble({ propertyId: 'b' })],
      VALUES,
    );

    expect(createMock).toHaveBeenCalledTimes(2);
    expect(result.outcomes[0].status).toBe('failed');
    expect(result.outcomes[1].status).toBe('created');
  });

  it('applies the ROOM omission rule from buildMandatoPayload to every row (contract §3.2)', async () => {
    createMock.mockResolvedValue({});

    await submitMandatosLote([makeInmueble({ propertyId: 'a', propertyType: 'room' })], VALUES);

    expect(createMock).toHaveBeenCalledWith(
      expect.not.objectContaining({ propertyType: expect.anything() }),
    );
  });

  // --- WU-4: auto-publish (contract.md §3.4, amendment A-1.1) ---------

  it('publishes every property whose mandate was created (rule 1: mandate first, publish second)', async () => {
    createMock.mockResolvedValue({});

    const result = await submitMandatosLote(
      [makeInmueble({ propertyId: 'a' }), makeInmueble({ propertyId: 'b' })],
      VALUES,
    );

    expect(updatePropertyMock).toHaveBeenCalledTimes(2);
    expect(updatePropertyMock).toHaveBeenCalledWith('a', { status: 'AVAILABLE' });
    expect(updatePropertyMock).toHaveBeenCalledWith('b', { status: 'AVAILABLE' });
    expect(result.outcomes.every((o) => o.published)).toBe(true);
    expect(result.publishedCount).toBe(2);
    expect(result.publishFailedCount).toBe(0);
  });

  it('publishes even when the mandate call returned 409 (rule 2: 409 counts as success)', async () => {
    createMock.mockRejectedValueOnce(new ApiError(409, 'A mandate already exists for property a'));

    const result = await submitMandatosLote([makeInmueble({ propertyId: 'a' })], VALUES);

    expect(updatePropertyMock).toHaveBeenCalledWith('a', { status: 'AVAILABLE' });
    expect(result.outcomes[0].status).toBe('alreadyExists');
    expect(result.outcomes[0].published).toBe(true);
  });

  it('never publishes a property whose mandate call failed (rule 3)', async () => {
    createMock.mockRejectedValueOnce(new ApiError(402, 'Alcanzaste el límite de propiedades de tu plan.'));

    const result = await submitMandatosLote([makeInmueble({ propertyId: 'a' })], VALUES);

    expect(updatePropertyMock).not.toHaveBeenCalled();
    expect(result.outcomes[0]).toEqual({
      propertyId: 'a',
      propertyTitle: 'Depto 1',
      status: 'failed',
      published: false,
      mandateErrorMessage: 'Alcanzaste el límite de propiedades de tu plan.',
    });
  });

  it('keeps the mandate when the publish PATCH fails, and reports the partial state honestly (rule 4)', async () => {
    createMock.mockResolvedValue({});
    updatePropertyMock.mockRejectedValueOnce(new ApiError(402, 'Plan cap reached'));

    const result = await submitMandatosLote([makeInmueble({ propertyId: 'a' })], VALUES);

    // The mandate is NOT rolled back and is NOT reported as failed.
    expect(result.outcomes[0]).toEqual({
      propertyId: 'a',
      propertyTitle: 'Depto 1',
      status: 'created',
      published: false,
      publishErrorMessage: 'Plan cap reached',
    });
    expect(result.succeededCount).toBe(1);
    expect(result.failedCount).toBe(0);
    expect(result.publishedCount).toBe(0);
    expect(result.publishFailedCount).toBe(1);
  });
});

// --- «Uno por uno» (2026-09-02): each property carries its own terms ------

describe('submitMandatosPorInmueble', () => {
  it('sends each property with ITS OWN propietario and commission, in order, and reports the same shape', async () => {
    const payloads: { propertyId: string; propietarioId: string; commissionPercent: number }[] = [];
    createMock.mockImplementation(async (payload: typeof payloads[number]) => {
      payloads.push(payload);
      return {};
    });

    const result = await submitMandatosPorInmueble([
      {
        inmueble: makeInmueble({ propertyId: 'a' }),
        values: { propietarioId: 'owner-1', commissionPercent: 10, contractDate: '2026-09-02' },
      },
      {
        inmueble: makeInmueble({ propertyId: 'b' }),
        values: { propietarioId: 'owner-2', commissionPercent: 7.5, contractDate: '2026-09-02' },
      },
    ]);

    expect(payloads).toEqual([
      expect.objectContaining({ propertyId: 'a', propietarioId: 'owner-1', commissionPercent: 10 }),
      expect.objectContaining({ propertyId: 'b', propietarioId: 'owner-2', commissionPercent: 7.5 }),
    ]);
    expect(updatePropertyMock).toHaveBeenCalledWith('a', { status: 'AVAILABLE' });
    expect(updatePropertyMock).toHaveBeenCalledWith('b', { status: 'AVAILABLE' });
    expect(result).toEqual({
      outcomes: [
        { propertyId: 'a', propertyTitle: 'Depto 1', status: 'created', published: true },
        { propertyId: 'b', propertyTitle: 'Depto 1', status: 'created', published: true },
      ],
      succeededCount: 2,
      failedCount: 0,
      publishedCount: 2,
      publishFailedCount: 0,
    });
  });

  it('keeps the per-property rules of the shared path: 409 is success, a failed mandate is never published', async () => {
    createMock
      .mockRejectedValueOnce(new ApiError(409, 'A mandate already exists for property a'))
      .mockRejectedValueOnce(new ApiError(402, 'Plan cap reached'));

    const result = await submitMandatosPorInmueble([
      { inmueble: makeInmueble({ propertyId: 'a' }), values: { ...VALUES, propietarioId: 'owner-1' } },
      { inmueble: makeInmueble({ propertyId: 'b' }), values: { ...VALUES, propietarioId: 'owner-2' } },
    ]);

    expect(result.outcomes.map((o) => o.status)).toEqual(['alreadyExists', 'failed']);
    expect(updatePropertyMock).toHaveBeenCalledTimes(1);
    expect(updatePropertyMock).toHaveBeenCalledWith('a', { status: 'AVAILABLE' });
    expect(result.succeededCount).toBe(1);
    expect(result.failedCount).toBe(1);
  });

  it('an empty list is a no-op with zeroed counts', async () => {
    const result = await submitMandatosPorInmueble([]);
    expect(createMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      outcomes: [],
      succeededCount: 0,
      failedCount: 0,
      publishedCount: 0,
      publishFailedCount: 0,
    });
  });

  it('submitMandatosLote is the shared-terms case of the same loop', async () => {
    createMock.mockResolvedValue({});
    const result = await submitMandatosLote(
      [makeInmueble({ propertyId: 'a' }), makeInmueble({ propertyId: 'b' })],
      VALUES,
    );
    expect(createMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ propertyId: 'a', propietarioId: 'propietario-1' }));
    expect(createMock).toHaveBeenNthCalledWith(2, expect.objectContaining({ propertyId: 'b', propietarioId: 'propietario-1' }));
    expect(result.succeededCount).toBe(2);
  });
});
