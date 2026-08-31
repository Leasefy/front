/**
 * ConsignacionCard.test.tsx — T-0038 WU-6.
 *
 * `PROPERTY_TYPE_ICONS`/`AVAILABILITY_COLORS`/`STATUS_COLORS` were raw,
 * unguarded map lookups — "confirmed crash-on-missing-key" per the brief,
 * same trap `ConsignacionTable.tsx` already hit and fixed with
 * `getPropertyIcon`. Both enums are closed for `Consignacion` today, so
 * these tests exercise the guard defensively (an unexpected value cast in,
 * the shape a looser backend enum or a future type widening would produce)
 * rather than a currently-reachable production input.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Consignacion } from '@/lib/types/inmobiliaria';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_t, tag: string) => (props: Record<string, unknown> & { children?: React.ReactNode }) => {
    const { children, whileHover, whileTap, initial, animate, exit, transition, ...rest } = props;
    void whileHover; void whileTap; void initial; void animate; void exit; void transition;
    return React.createElement(tag, rest, children);
  } }),
}));

vi.mock('@leasefy/cadence', () => ({
  IconButton: (props: Record<string, unknown>) => React.createElement('button', { 'aria-label': props['aria-label'] }),
}));

import { ConsignacionCard } from './ConsignacionCard';

function makeConsignacion(overrides: Partial<Consignacion> = {}): Consignacion {
  return {
    id: 'cons-1',
    propertyId: 'prop-1',
    propietarioId: 'owner-1',
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
    propertyCode: null,
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

function render(consignacion: Consignacion) {
  act(() => {
    root.render(React.createElement(ConsignacionCard, { consignacion }));
  });
}

describe('<ConsignacionCard> — guarded map lookups (confirmed crash-on-missing-key)', () => {
  it('renders normally for a valid propertyType/availability/status', () => {
    expect(() => render(makeConsignacion())).not.toThrow();
  });

  it('does not crash on an unrecognised propertyType (defensive — the enum is closed today)', () => {
    const consignacion = makeConsignacion({
      propertyType: 'unexpected_type' as unknown as Consignacion['propertyType'],
    });
    expect(() => render(consignacion)).not.toThrow();
  });

  it('does not crash on an unrecognised availability', () => {
    const consignacion = makeConsignacion({
      availability: 'unexpected_availability' as unknown as Consignacion['availability'],
    });
    expect(() => render(consignacion)).not.toThrow();
  });

  it('does not crash on an unrecognised status', () => {
    const consignacion = makeConsignacion({
      status: 'unexpected_status' as unknown as Consignacion['status'],
    });
    expect(() => render(consignacion)).not.toThrow();
  });

  it('a SALE listing renders its commission pill with saleCommissionPercent, not commissionPercent (§A.3)', () => {
    render(makeConsignacion({ listingType: 'sale', saleCommissionPercent: 3, commissionPercent: 0 }));
    expect(container.textContent).toContain('3%');
  });
});
