/**
 * InmuebleSinMandatoCard.test.tsx — T-0038 WU-6 (C10, closed for the grid).
 *
 * The agency portfolio GRID used to filter every mandate-less row out
 * entirely. This is the card that replaces that filter: a `ROOM` property
 * type (no entry in `ConsignacionPropertyType`) and a SALE row with no
 * `salePrice` yet must render without crashing or fabricating a value.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { InmuebleSinConsignacion } from '@/lib/types/inmobiliaria';

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

import { InmuebleSinMandatoCard } from './InmuebleSinMandatoCard';

function makeInmueble(overrides: Partial<InmuebleSinConsignacion> = {}): InmuebleSinConsignacion {
  return {
    propertyId: 'prop-1',
    propertyTitle: 'Depto Chicó',
    propertyAddress: 'Cra 11 #94-45',
    propertyCity: 'Bogotá',
    propertyZone: 'Chicó',
    propertyType: 'apartment',
    propertyThumbnail: null,
    monthlyRent: 2_500_000,
    adminFee: 0,
    status: 'draft',
    createdAt: '2026-08-29T00:00:00.000Z',
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

function render(inmueble: InmuebleSinConsignacion, onCompletarMandato = vi.fn()) {
  act(() => {
    root.render(
      React.createElement(InmuebleSinMandatoCard, { inmueble, onCompletarMandato }),
    );
  });
  return { onCompletarMandato };
}

describe('<InmuebleSinMandatoCard> — the grid-view blind spot, closed', () => {
  it('renders a RENT row with its monthly price', () => {
    render(makeInmueble());
    expect(container.textContent).toContain('2.500.000');
    expect(container.textContent).toContain('inmobiliaria.consignaciones.table.missingMandate');
  });

  it('renders a SALE row with its sale price, never "$0"', () => {
    render(makeInmueble({ listingType: 'sale', salePrice: 400_000_000, monthlyRent: null }));
    expect(container.textContent).toContain('400.000.000');
    expect(container.textContent).not.toContain('$0');
    expect(container.textContent).not.toContain('$ 0');
  });

  it('a SALE row with no salePrice yet renders "—", never a fabricated price', () => {
    render(makeInmueble({ listingType: 'sale', salePrice: null, monthlyRent: null }));
    expect(container.textContent).not.toContain('$0');
    expect(container.textContent).not.toContain('$ 0');
    expect(container.textContent).toContain('—');
  });

  it('a ROOM property type does not crash the card (no entry in the guarded icon lookup)', () => {
    expect(() => render(makeInmueble({ propertyType: 'room' }))).not.toThrow();
  });

  it('clicking the missing-mandate CTA fires onCompletarMandato with the row', () => {
    const inmueble = makeInmueble();
    const { onCompletarMandato } = render(inmueble);
    const btn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('inmobiliaria.consignaciones.table.missingMandate'),
    );
    expect(btn).toBeTruthy();
    act(() => {
      btn!.click();
    });
    expect(onCompletarMandato).toHaveBeenCalledWith(inmueble);
  });

  it('renders "—" for the location when both zone and city are absent', () => {
    render(makeInmueble({ propertyZone: '', propertyCity: '' }));
    expect(container.textContent).toContain('—');
  });
});
