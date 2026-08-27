/**
 * CompletarMandatoDialog.test.tsx — T-0030 WU-2, R4 completion path,
 * extended by WU-4 for auto-publish (contract.md §3.4, amendment A-1.1).
 *
 * `buildMandatoPayload` is the "no second round-trip" promise of contract.md
 * T-0030 §3.2/§3.4: every field but the ones the user enters comes straight
 * off the `InmuebleSinConsignacion` row already in hand. These tests pin the
 * three omission rules that are explicit MUSTs in the frozen contract:
 *   - ROOM → omit `propertyType` (no entry in ConsignacionPropertyType,
 *     sending "ROOM" 400s @IsEnum).
 *   - empty `propertyZone` → omit, never send `''`.
 *   - `propertyThumbnail: null` / `adminFee: 0` → omit, never send the falsy
 *     value verbatim (mirrors the same "0 renders no line" rule the table
 *     already applies on read).
 *   - `propertyId` is always sent — omitting it orphans the mandate.
 *
 * `completeMandatoAndPublish` is the shared "mandate, then publish" outcome
 * used by BOTH completion paths (this dialog and the batch modal,
 * `submitMandatosLote.ts`) — contract.md §3.4's four binding rules:
 *   1. mandate succeeds → publish is issued
 *   2. mandate returns 409 → publish is still issued (409 is success-equivalent)
 *   3. mandate fails → publish is never issued
 *   4. mandate succeeds but publish fails → the mandate is kept, reported
 *      as mandated-but-not-published, nothing rolled back
 *
 * A smoke-render test also guards that opening the dialog on a ROOM /
 * empty-zone row (the same crash-prone shape as ConsignacionTable's traps)
 * does not throw.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ApiError } from '@/lib/api/client';
import type { InmuebleSinConsignacion } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, params?: Record<string, unknown>) => {
      if (params) {
        return Object.entries(params).reduce(
          (acc: string, [key, val]) => acc.replace(`{{${key}}}`, String(val)),
          k,
        );
      }
      return k;
    },
    locale: 'es',
  }),
}));

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'agente@test.com' } }),
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const createMock = vi.fn();
const updatePropertyMock = vi.fn();

vi.mock('@/lib/api/inmobiliaria.service', () => ({
  consignacionesApi: {
    create: (...args: unknown[]) => createMock(...args),
  },
  propietariosApi: {
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/api/properties.service', () => ({
  propertiesApi: {
    update: (...args: unknown[]) => updatePropertyMock(...args),
  },
}));

import { CompletarMandatoDialog, buildMandatoPayload, completeMandatoAndPublish } from './CompletarMandatoDialog';

function makeInmueble(overrides: Partial<InmuebleSinConsignacion> = {}): InmuebleSinConsignacion {
  return {
    propertyId: 'prop-1',
    propertyTitle: 'Depto Chicó',
    propertyAddress: 'Cra 11 #94-45',
    propertyCity: 'Bogotá',
    propertyZone: 'Chicó',
    propertyType: 'apartment',
    propertyThumbnail: 'https://cdn.test/photo.jpg',
    monthlyRent: 2_500_000,
    adminFee: 150_000,
    status: 'draft',
    createdAt: '2026-08-20T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildMandatoPayload — the no-second-round-trip mapping (contract §3.2/§3.4)', () => {
  const values = { propietarioId: 'owner-1', commissionPercent: 12, contractDate: '2026-08-26' };

  it('always sends propertyId — omitting it orphans the mandate', () => {
    const payload = buildMandatoPayload(makeInmueble(), values);
    expect(payload.propertyId).toBe('prop-1');
  });

  it('carries the property fields straight through with no extra fetch', () => {
    const payload = buildMandatoPayload(makeInmueble(), values);
    expect(payload.propertyTitle).toBe('Depto Chicó');
    expect(payload.propertyAddress).toBe('Cra 11 #94-45');
    expect(payload.propertyCity).toBe('Bogotá');
    expect(payload.monthlyRent).toBe(2_500_000);
    expect(payload.propertyZone).toBe('Chicó');
    expect(payload.propertyType).toBe('apartment');
    expect(payload.propertyThumbnail).toBe('https://cdn.test/photo.jpg');
    expect(payload.adminFee).toBe(150_000);
  });

  it('the user-entered terms land on the payload verbatim', () => {
    const payload = buildMandatoPayload(makeInmueble(), values);
    expect(payload.propietarioId).toBe('owner-1');
    expect(payload.commissionPercent).toBe(12);
    expect(payload.contractDate).toBe('2026-08-26');
  });

  it('ROOM trap — omits propertyType entirely, never sends "ROOM"', () => {
    const payload = buildMandatoPayload(makeInmueble({ propertyType: 'room' }), values);
    expect(payload.propertyType).toBeUndefined();
    expect('propertyType' in payload).toBe(false);
  });

  it('empty zone — omits propertyZone, never sends ""', () => {
    const payload = buildMandatoPayload(makeInmueble({ propertyZone: '' }), values);
    expect(payload.propertyZone).toBeUndefined();
    expect('propertyZone' in payload).toBe(false);
  });

  it('null thumbnail — omits propertyThumbnail, never sends null', () => {
    const payload = buildMandatoPayload(makeInmueble({ propertyThumbnail: null }), values);
    expect(payload.propertyThumbnail).toBeUndefined();
    expect('propertyThumbnail' in payload).toBe(false);
  });

  it('adminFee 0 — omits adminFee (mirrors the "0 renders no line" read-side rule)', () => {
    const payload = buildMandatoPayload(makeInmueble({ adminFee: 0 }), values);
    expect(payload.adminFee).toBeUndefined();
    expect('adminFee' in payload).toBe(false);
  });

  it('agenteUserId — only present when the caller supplies one', () => {
    const withAgent = buildMandatoPayload(makeInmueble(), { ...values, agenteUserId: 'agent-user-1' });
    expect(withAgent.agenteUserId).toBe('agent-user-1');

    const withoutAgent = buildMandatoPayload(makeInmueble(), values);
    expect(withoutAgent.agenteUserId).toBeUndefined();
  });
});

const VALUES = { propietarioId: 'owner-1', commissionPercent: 12, contractDate: '2026-08-26' };

describe('completeMandatoAndPublish — mandate first, publish second (contract §3.4, A-1.1)', () => {
  beforeEach(() => {
    createMock.mockReset();
    updatePropertyMock.mockReset();
    updatePropertyMock.mockResolvedValue({});
  });

  it('rule 1 — mandate succeeds → PATCH { status: AVAILABLE } is issued for that property', async () => {
    createMock.mockResolvedValue({});

    const outcome = await completeMandatoAndPublish(makeInmueble({ propertyId: 'prop-1' }), VALUES);

    expect(updatePropertyMock).toHaveBeenCalledWith('prop-1', { status: 'AVAILABLE' });
    expect(outcome.status).toBe('created');
    expect(outcome.published).toBe(true);
  });

  it('rule 2 — mandate returns 409 → publish is still issued', async () => {
    createMock.mockRejectedValueOnce(new ApiError(409, 'A mandate already exists'));

    const outcome = await completeMandatoAndPublish(makeInmueble({ propertyId: 'prop-1' }), VALUES);

    expect(updatePropertyMock).toHaveBeenCalledWith('prop-1', { status: 'AVAILABLE' });
    expect(outcome.status).toBe('alreadyExists');
    expect(outcome.published).toBe(true);
  });

  it('rule 3 — mandate fails → publish is never issued', async () => {
    createMock.mockRejectedValueOnce(new ApiError(400, 'Propietario not found'));

    const outcome = await completeMandatoAndPublish(makeInmueble({ propertyId: 'prop-1' }), VALUES);

    expect(updatePropertyMock).not.toHaveBeenCalled();
    expect(outcome.status).toBe('failed');
    expect(outcome.published).toBe(false);
    expect(outcome.mandateErrorMessage).toBe('Propietario not found');
  });

  it('rule 4 — mandate succeeds but PATCH fails → mandate is kept, reported honestly, nothing rolled back', async () => {
    createMock.mockResolvedValue({});
    updatePropertyMock.mockRejectedValueOnce(new ApiError(402, 'Plan cap reached'));

    const outcome = await completeMandatoAndPublish(makeInmueble({ propertyId: 'prop-1' }), VALUES);

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(outcome.status).toBe('created');
    expect(outcome.published).toBe(false);
    expect(outcome.publishErrorMessage).toBe('Plan cap reached');
    // Nothing here tries to undo the mandate — no delete/rollback call exists.
  });
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.restoreAllMocks();
});

describe('<CompletarMandatoDialog> — smoke render', () => {
  it('renders without crashing for a ROOM / empty-zone row (same shape as the table traps)', () => {
    expect(() => {
      act(() => {
        root.render(
          <CompletarMandatoDialog
            inmueble={makeInmueble({ propertyType: 'room', propertyZone: '', propertyThumbnail: null })}
            onClose={vi.fn()}
            propietarios={[]}
            agentes={[]}
            onCompleted={vi.fn()}
          />,
        );
      });
    }).not.toThrow();
    // Dialog portals its content to `document.body`, not `container`.
    expect(document.body.textContent).toContain('Depto Chicó');
  });

  it('renders nothing when `inmueble` is null (closed state)', () => {
    act(() => {
      root.render(
        <CompletarMandatoDialog
          inmueble={null}
          onClose={vi.fn()}
          propietarios={[]}
          agentes={[]}
          onCompleted={vi.fn()}
        />,
      );
    });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('Cancelar calls onClose without submitting', () => {
    const onClose = vi.fn();
    act(() => {
      root.render(
        <CompletarMandatoDialog
          inmueble={makeInmueble()}
          onClose={onClose}
          propietarios={[]}
          agentes={[]}
          onCompleted={vi.fn()}
        />,
      );
    });

    const cancelBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('inmobiliaria.consignaciones.mandateDialog.cancel'),
    );
    expect(cancelBtn).toBeTruthy();
    act(() => {
      (cancelBtn as HTMLElement).click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
