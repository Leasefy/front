/**
 * Dispersiones — «Recaudado» sobre un canon que nadie pagó.
 *
 * 🔴 La tabla de dispersiones, el desglose por inmueble y la tarjeta decían
 * «Recaudado» / «Total recaudado» sobre `totalCollected` y `rentCollected`, y
 * la dispersión gira por defecto con base CAUSADO: el canon de la cuota del
 * mes, haya pagado el inquilino o no (Nico confirmó que se puede girar más de
 * lo recaudado). El rótulo sigue a `baseDelCanon`; ningún número cambia.
 *
 * Con el diccionario REAL (es.json), para leer lo que ve la persona.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { Dispersion, DispersionItem } from '@/lib/types/inmobiliaria';

void React; // jsx-preserve

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_target, tag: string) =>
        ({
          children,
          whileHover,
          whileTap,
          initial,
          animate,
          exit,
          transition,
          ...rest
        }: Record<string, unknown> & { children?: React.ReactNode }) => {
          void whileHover; void whileTap; void initial; void animate; void exit; void transition;
          return React.createElement(tag, rest, children);
        },
    },
  ),
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
}));

import { DispersionTable } from './DispersionTable';
import { ComisionDesglose } from './ComisionDesglose';
import { DispersionCard } from './DispersionCard';

function linea(overrides: Partial<DispersionItem> = {}): DispersionItem {
  return {
    cobroId: null,
    cuotaId: 'cuota-1',
    propertyTitle: 'Apto 302 · Laureles',
    rentCollected: 2_000_000,
    commissionPercent: 10,
    commissionAmount: 200_000,
    netAmount: 1_800_000,
    conceptosAFavor: 0,
    conceptosACargo: 0,
    deTerceros: 0,
    ...overrides,
  };
}

function dispersion(overrides: Partial<Dispersion> = {}): Dispersion {
  return {
    id: 'd-1',
    propietarioId: 'p-1',
    propietarioName: 'Jorge Restrepo',
    propietarioBankAccount: null,
    month: '2026-09',
    items: [linea()],
    baseDelCanon: 'CAUSADO',
    totalCollected: 2_000_000,
    totalCommission: 200_000,
    totalConceptosAFavor: 0,
    totalConceptosACargo: 0,
    totalDeTerceros: 0,
    netToPropietario: 1_800_000,
    status: 'pending',
    createdAt: '2026-09-16',
    updatedAt: '2026-09-16',
    ...overrides,
  };
}

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

function pintar(elemento: React.ReactElement) {
  act(() => {
    root.render(elemento);
  });
}

const q = (testid: string) => host.querySelector(`[data-testid="${testid}"]`);
const encabezados = () => Array.from(host.querySelectorAll('th')).map((th) => th.textContent?.trim());

describe('DispersionTable — la columna del canon', () => {
  it('🔴 con base CAUSADO dice «Canon causado», y la tabla no dice «recaudado» ni «recibido»', () => {
    pintar(<DispersionTable dispersiones={[dispersion()]} showSummary />);

    expect(encabezados()).toContain('Canon causado');
    expect(host.textContent).not.toMatch(/recaud|recibid/i);
    // El número es el mismo de siempre.
    expect(host.textContent).toContain('2000000');
  });

  it('con base RECAUDADO dice «Canon recaudado»', () => {
    pintar(<DispersionTable dispersiones={[dispersion({ baseDelCanon: 'RECAUDADO' })]} />);

    expect(encabezados()).toContain('Canon recaudado');
    expect(q('dispersion-base-de-la-fila')).toBeNull();
  });

  it('con las dos bases, la columna dice «Canon» y cada fila la suya', () => {
    pintar(
      <DispersionTable
        dispersiones={[dispersion(), dispersion({ id: 'd-2', month: '2026-08', baseDelCanon: 'RECAUDADO' })]}
      />,
    );

    expect(encabezados()).toContain('Canon');
    const porFila = Array.from(host.querySelectorAll('[data-testid="dispersion-base-de-la-fila"]')).map(
      (el) => el.textContent,
    );
    expect(porFila.sort()).toEqual(['causado', 'recaudado']);
  });
});

describe('ComisionDesglose — la columna del canon', () => {
  it('🔴 con base CAUSADO dice «Canon causado», y el desglose no dice «recaudado»', () => {
    pintar(<ComisionDesglose items={[linea()]} baseDelCanon="CAUSADO" />);

    expect(q('desglose-columna-canon')?.textContent?.trim()).toBe('Canon causado');
    expect(host.textContent).not.toMatch(/recaud|recibid/i);
  });

  it('con base RECAUDADO dice «Canon recaudado»', () => {
    pintar(<ComisionDesglose items={[linea()]} baseDelCanon="RECAUDADO" />);

    expect(q('desglose-columna-canon')?.textContent?.trim()).toBe('Canon recaudado');
  });

  it('sin base: líneas de cuotas son CAUSADO; las viejas por cobro, RECAUDADO', () => {
    pintar(<ComisionDesglose items={[linea()]} />);
    expect(q('desglose-columna-canon')?.textContent?.trim()).toBe('Canon causado');

    pintar(<ComisionDesglose items={[linea({ cuotaId: null, cobroId: 'cobro-1' })]} />);
    expect(q('desglose-columna-canon')?.textContent?.trim()).toBe('Canon recaudado');
  });
});

describe('DispersionCard — el rótulo del canon', () => {
  it('🔴 con base CAUSADO dice «Canon causado», y la tarjeta no dice «recaudado» ni «recibido»', () => {
    pintar(<DispersionCard dispersion={dispersion()} />);

    expect(q('tarjeta-rotulo-canon')?.textContent).toBe('Canon causado');
    expect(host.textContent).not.toMatch(/recaud|recibid/i);
  });

  it('con base RECAUDADO dice «Canon recaudado»', () => {
    pintar(<DispersionCard dispersion={dispersion({ baseDelCanon: 'RECAUDADO' })} />);

    expect(q('tarjeta-rotulo-canon')?.textContent).toBe('Canon recaudado');
  });
});
