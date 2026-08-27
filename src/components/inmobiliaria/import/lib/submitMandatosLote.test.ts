/**
 * submitMandatosLote.test.ts — T-0030 WU-3, Slice A (R1).
 *
 * The batch mandate-completion path applies ONE set of terms (propietario,
 * commission, contract date, agent) to every property the import just
 * created. Three rules from contract.md T-0030 §3.3 carry over unchanged
 * from the single-row flow (`CompletarMandatoDialog`):
 *   - a 409 (duplicate mandate) is success-equivalent, never a red failure.
 *   - a genuine failure must NOT be reported as "imported and mandated" —
 *     the property must remain visibly un-mandated (brief §4 Slice A, point 5).
 *   - calls run sequentially, in the given order (mirrors the deliberately
 *     sequential geocode loop in StepConfirmImport.tsx — no reason to hammer
 *     the backend with N parallel POSTs for a batch mandate assignment).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '@/lib/api/client';
import type { InmuebleSinConsignacion } from '@/lib/types/inmobiliaria';

const createMock = vi.fn();

vi.mock('@/lib/api/inmobiliaria.service', () => ({
  consignacionesApi: {
    create: (...args: unknown[]) => createMock(...args),
  },
}));

import { submitMandatosLote } from './submitMandatosLote';

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
      { propertyId: 'a', propertyTitle: 'Depto 1', status: 'created' },
      {
        propertyId: 'b',
        propertyTitle: 'Depto 1',
        status: 'failed',
        errorMessage: 'Alcanzaste el límite de propiedades de tu plan.',
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
});
