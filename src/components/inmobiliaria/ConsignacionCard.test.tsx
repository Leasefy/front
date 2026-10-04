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
  // La tarjeta sube al pasar el puntero con `Pressable`: acá, la etiqueta tal cual.
  Pressable: (props: Record<string, unknown> & { children?: React.ReactNode }) => {
    const { as = 'div', hover, press, children, ...rest } = props;
    void hover; void press;
    return React.createElement(as as string, rest, children);
  },
  motionSpring: { bouncy: {}, snappy: {}, soft: {} },
}));

import { ConsignacionCard } from './ConsignacionCard';

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
    expect(container.textContent).toContain('3 %');
  });

  /* IN-03 (QA 04-10): la pastilla decía «% 10%» (ícono + «%»). */
  it('la comisión se lee «10 %» una sola vez, sin el ícono de porcentaje al lado', () => {
    render(makeConsignacion({ commissionPercent: 10 }));
    expect(container.textContent).toContain('10 %');
    expect(container.textContent).not.toContain('10%');
    expect((container.textContent ?? '').match(/%/g)?.length).toBe(1);
  });

  /* QA con avatares (04-10): «Dejar en borrador» y la tarjeta decía «Disponible». */
  it('🔴 un inmueble en borrador dice «Borrador», no «Disponible»', () => {
    render(makeConsignacion({ availability: 'available', arrendado: false, propertyStatus: 'DRAFT' }));
    expect(container.textContent).toContain('inmobiliaria.portafolio.card.availability.draft');
    expect(container.textContent).not.toContain('inmobiliaria.portafolio.card.availability.available');
  });

  /* COMERCIAL (QA 04-10, 390 px): con administración en $ 0 la tarjeta pintaba un «0» suelto al lado de «/mes». */
  it('sin administración no queda un «0» suelto junto al canon', () => {
    render(makeConsignacion({ adminFee: 0 }));
    const canon = container.querySelector('.text-xl')?.parentElement?.textContent ?? '';
    expect(canon).not.toMatch(/0$/);
  });

  /* COMERCIAL (Nico, 04-10): «Vacante hace 42 días» y el mandato que se vence, en la tarjeta. */
  it('muestra los días de vacancia y el mandato que se vence', () => {
    act(() => {
      root.render(
        <ConsignacionCard
          consignacion={makeConsignacion()}
          comercial={{
            consignacionId: 'x',
            agenteUserId: null,
            vacancia: { vacante: true, desde: '2026-08-23', dias: 42, fuente: 'FIN_DEL_CONTRATO' },
            mandato: { estado: 'POR_VENCER', vence: '2026-10-25', dias: 21 },
          }}
        />,
      );
    });
    expect(container.querySelector('[data-testid="dias-vacante"]')?.textContent).toBe('Vacante hace 42 días');
    expect(container.querySelector('[data-testid="mandato-se-vence"]')?.textContent).toBe('Mandato vence en 21 días');
  });
});
