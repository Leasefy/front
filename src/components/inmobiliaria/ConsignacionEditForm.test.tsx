/**
 * ConsignacionEditForm.test.tsx — T-0038 WU-6, contract-addendum-2.md §A.10.
 *
 * Pins the exact bug the addendum names by file:line:
 *   - `:158` `!formData.monthlyRent` — `!null` is `true` in JS, so a sale
 *     mandate (monthlyRent: null) could never pass validation and the form
 *     was a permanent dead end for editing one.
 *   - `:186` `Number(formData.monthlyRent)` — `Number(null) === 0`, which
 *     would have sent a C6-violating `monthlyRent: 0` (and an R2 400) the
 *     moment the `!formData.monthlyRent` gate above was naively removed.
 *
 * Both must be fixed together by branching on `listingType`, not on the
 * value's truthiness.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Consignacion } from '@/lib/types/inmobiliaria';

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
    formatCurrency: (n: number) => `$${n}`,
    locale: 'es',
  }),
}));

vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useAgentes: () => ({ agentes: [] }),
}));

import { ConsignacionEditForm } from './ConsignacionEditForm';

function makeConsignacion(overrides: Partial<Consignacion> = {}): Consignacion {
  return {
    id: 'cons-1',
    propertyId: 'prop-1',
    propietarioId: 'owner-1',
    // Un solo dueño al 100 % — la forma que dejó el backfill de la migración.
    copropietarios: [{ propietarioId: 'owner-1', participacionBps: 10000 }],
    agenteId: 'agent-1',
    propertyTitle: 'Depto Chicó',
    propertyAddress: 'Cra 11 #94-45',
    propertyCity: 'Bogotá',
    propertyZone: 'Chicó',
    propertyType: 'apartment',
    monthlyRent: 2_500_000,
    adminFee: 0,
    listingType: 'rent',
    saleCommissionPercent: null,
    propertyCode: 12,
    commissionPercent: 10,
    contractDate: '2026-01-01T00:00:00.000Z',
    status: 'active',
    availability: 'available',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

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

function render(consignacion: Consignacion, onSubmit = vi.fn().mockResolvedValue(undefined)) {
  act(() => {
    root.render(
      <ConsignacionEditForm consignacion={consignacion} onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
  });
  return { onSubmit };
}

function submitForm() {
  const form = container.querySelector('form')!;
  act(() => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
}

describe('<ConsignacionEditForm> — a sale mandate is editable, not a dead end', () => {
  it('renders a sale-commission field instead of monthly rent for a sale mandate', () => {
    render(makeConsignacion({ listingType: 'sale', monthlyRent: null, commissionPercent: 0, saleCommissionPercent: 3 }));
    expect(container.querySelector('input[name="saleCommissionPercent"]')).toBeTruthy();
    expect(container.querySelector('input[name="monthlyRent"]')).toBeNull();
  });

  it('renders the monthly-rent field for a rent mandate, no sale-commission field', () => {
    render(makeConsignacion());
    expect(container.querySelector('input[name="monthlyRent"]')).toBeTruthy();
    expect(container.querySelector('input[name="saleCommissionPercent"]')).toBeNull();
  });

  it('submits a sale mandate successfully — the OLD `!formData.monthlyRent` gate would have blocked this forever', async () => {
    const { onSubmit } = render(
      makeConsignacion({ listingType: 'sale', monthlyRent: null, commissionPercent: 0, saleCommissionPercent: 3 }),
    );

    submitForm();
    await act(async () => {
      await Promise.resolve();
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('never sends monthlyRent: 0 on a sale mandate — the OLD `Number(null) === 0` bug', async () => {
    const { onSubmit } = render(
      makeConsignacion({ listingType: 'sale', monthlyRent: null, commissionPercent: 0, saleCommissionPercent: 3 }),
    );

    submitForm();
    await act(async () => {
      await Promise.resolve();
    });

    const payload = onSubmit.mock.calls[0][0];
    expect(payload.monthlyRent).toBeUndefined();
    expect('monthlyRent' in payload).toBe(false);
    expect(payload.saleCommissionPercent).toBe(3);
    expect(payload.commissionPercent).toBe(0);
  });

  it('a rent mandate submission is unaffected — still sends monthlyRent and commissionPercent, no saleCommissionPercent', async () => {
    const { onSubmit } = render(makeConsignacion());

    submitForm();
    await act(async () => {
      await Promise.resolve();
    });

    const payload = onSubmit.mock.calls[0][0];
    expect(payload.monthlyRent).toBe(2_500_000);
    expect(payload.commissionPercent).toBe(10);
    expect(payload.saleCommissionPercent).toBeUndefined();
  });

  it('blocks submission when saleCommissionPercent is 0 on a sale mandate (R3 mirrored client-side)', async () => {
    const { onSubmit } = render(
      makeConsignacion({ listingType: 'sale', monthlyRent: null, commissionPercent: 0, saleCommissionPercent: 0 }),
    );

    submitForm();
    await act(async () => {
      await Promise.resolve();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
