/**
 * @vitest-environment happy-dom
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, ...props }: { children?: React.ReactNode; asChild?: boolean }) =>
    asChild ? React.createElement('span', props, children) : React.createElement('button', props, children),
}));

import { ApiError } from '@/lib/api/client';
import type { Cobro, CobroSummary } from '@/lib/types/inmobiliaria';
import {
  conteosDePestanas,
  contarPorEstado,
  FranjaDelResumen,
  hayFiltrosDeCobros,
  puedeAvanzarAlMesSiguiente,
} from './estado-de-cobros';

const cobro = (status: Cobro['status']) => ({ status }) as Cobro;
const RESUMEN: CobroSummary = {
  month: '2026-09',
  totalExpected: 9_000_000,
  totalCollected: 4_000_000,
  totalPending: 5_000_000,
  totalLate: 2_000_000,
  collectionRate: 44,
  cobrosPaid: 5,
  cobrosPending: 4,
  cobrosLate: 2,
  tasaDeRecaudo: null,
};

describe('conteosDePestanas (C3)', () => {
  const todos = [cobro('pending'), cobro('pending'), cobro('paid'), cobro('late'), cobro('late'), cobro('partial')];

  it('sin filtro de estado cuenta el listado', () => {
    expect(
      conteosDePestanas({ estado: 'all', cobros: todos, recordados: null, resumen: RESUMEN, filtradoPorPropietario: false }),
    ).toEqual({ all: 6, pending: 2, paid: 1, partial: 1, late: 2, defaulted: 0 });
  });

  it('🔴 con «En mora» puesto las demás pestañas NO caen a 0', () => {
    const conteos = conteosDePestanas({
      estado: 'late',
      cobros: [cobro('late'), cobro('late')],
      recordados: contarPorEstado(todos),
      resumen: RESUMEN,
      filtradoPorPropietario: false,
    });
    expect(conteos.pending).toBe(2);
    expect(conteos.paid).toBe(1);
    expect(conteos.all).toBe(6);
    expect(conteos.late).toBe(2);
  });

  it('la pestaña activa se toma del listado fresco, no del recuerdo', () => {
    const conteos = conteosDePestanas({
      estado: 'late',
      cobros: [cobro('late'), cobro('late'), cobro('late')],
      recordados: contarPorEstado(todos),
      resumen: null,
      filtradoPorPropietario: false,
    });
    expect(conteos.late).toBe(3);
  });

  it('entrando directo con un filtro, usa el resumen del mes', () => {
    const conteos = conteosDePestanas({
      estado: 'late',
      cobros: [cobro('late'), cobro('late')],
      recordados: null,
      resumen: RESUMEN,
      filtradoPorPropietario: false,
    });
    expect(conteos).toMatchObject({ all: 11, paid: 5, pending: 4, late: 2 });
  });

  it('con un propietario elegido no usa el resumen, que es de toda la inmobiliaria', () => {
    const conteos = conteosDePestanas({
      estado: 'late',
      cobros: [cobro('late')],
      recordados: null,
      resumen: RESUMEN,
      filtradoPorPropietario: true,
    });
    expect(conteos).toEqual({ all: 0, pending: 0, paid: 0, partial: 0, late: 1, defaulted: 0 });
  });

  it('mientras el listado carga conserva los números que ya tenía', () => {
    const recordados = contarPorEstado(todos);
    expect(
      conteosDePestanas({ estado: 'paid', cobros: null, recordados, resumen: null, filtradoPorPropietario: false }),
    ).toEqual(recordados);
  });
});

describe('<FranjaDelResumen> (C2)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const pintarResumen = (r: CobroSummary) => <p data-testid="resumen">${r.totalCollected} recaudado</p>;

  it('🔴 con el servidor caído no dice «$0 recaudado»: dice que falló y ofrece reintentar', () => {
    const onReintentar = vi.fn();
    act(() =>
      root.render(
        <FranjaDelResumen resumen={null} cargando={false} error={new ApiError(500, 'Internal')} onReintentar={onReintentar}>
          {pintarResumen}
        </FranjaDelResumen>,
      ),
    );
    expect(container.textContent).not.toContain('$0');
    expect(container.querySelector('[data-testid="resumen"]')).toBeNull();
    expect(container.querySelector('[data-testid="fallo-de-carga"]')).toBeTruthy();
    const reintentar = container.querySelector<HTMLButtonElement>('[data-testid="reintentar"]');
    expect(reintentar).toBeTruthy();
    act(() => reintentar!.click());
    expect(onReintentar).toHaveBeenCalledTimes(1);
  });

  it('mientras carga pinta el esqueleto, no ceros', () => {
    act(() =>
      root.render(
        <FranjaDelResumen resumen={null} cargando error={null} onReintentar={vi.fn()}>
          {pintarResumen}
        </FranjaDelResumen>,
      ),
    );
    expect(container.querySelector('[data-testid="esqueleto-indicadores"]')).toBeTruthy();
    expect(container.textContent).not.toContain('$0');
  });

  it('con los números los muestra', () => {
    act(() =>
      root.render(
        <FranjaDelResumen resumen={RESUMEN} cargando={false} error={null} onReintentar={vi.fn()}>
          {pintarResumen}
        </FranjaDelResumen>,
      ),
    );
    expect(container.querySelector('[data-testid="resumen"]')?.textContent).toBe('$4000000 recaudado');
    expect(container.querySelector('[data-testid="resumen-desactualizado"]')).toBeNull();
  });

  it('si un refresco falla después, conserva los números y avisa que pueden estar viejos', () => {
    const onReintentar = vi.fn();
    act(() =>
      root.render(
        <FranjaDelResumen resumen={RESUMEN} cargando={false} error={new ApiError(500, 'x')} onReintentar={onReintentar}>
          {pintarResumen}
        </FranjaDelResumen>,
      ),
    );
    expect(container.querySelector('[data-testid="resumen"]')).toBeTruthy();
    const aviso = container.querySelector('[data-testid="resumen-desactualizado"]');
    expect(aviso).toBeTruthy();
    act(() => aviso!.querySelector('button')!.click());
    expect(onReintentar).toHaveBeenCalledTimes(1);
  });
});

describe('la página de Cobros usa lo de arriba', () => {
  const PAGINA = readFileSync(join(process.cwd(), 'src/app/panel/inmobiliaria/pagos/cartera/cobros/page.tsx'), 'utf8');

  it('C2: la franja lee el error del resumen y ya no inventa un resumen de ceros', () => {
    expect(PAGINA).toContain('errorCrudo: summaryError');
    expect(PAGINA).toContain('<FranjaDelResumen');
    expect(PAGINA).not.toContain('totalCollected: 0');
  });

  it('C3: los conteos salen de conteosDePestanas', () => {
    expect(PAGINA).toContain('conteosDePestanas(');
  });

  it('C1: el recordatorio suma al contador sólo después de que el envío volvió, y no traga el error', () => {
    const inicio = PAGINA.indexOf('const handleSendReminder = useCallback(');
    const fin = PAGINA.indexOf('const handleFilterChange', inicio);
    const bloque = PAGINA.slice(inicio, fin);
    expect(inicio).toBeGreaterThan(-1);
    expect(bloque).not.toContain('catch');
    expect(bloque.indexOf('await cobrosApi.sendReminder')).toBeGreaterThan(-1);
    expect(bloque.indexOf('await cobrosApi.sendReminder')).toBeLessThan(
      bloque.indexOf('remindersSent: c.remindersSent + 1'),
    );
  });
});

describe('puedeAvanzarAlMesSiguiente (C7)', () => {
  /*
   * 🔴 Sin tope se llegaba a 2031 y la tabla salía vacía, indistinguible de
   * «no hay cobros». Un botón apagado dice la verdad; un vacío convincente no.
   */
  it('no deja pasar del mes corriente', () => {
    expect(puedeAvanzarAlMesSiguiente('2026-09', '2026-09')).toBe(false);
    expect(puedeAvanzarAlMesSiguiente('2026-10', '2026-09')).toBe(false);
  });

  it('los meses pasados siguen abiertos: ahí está la cartera vieja', () => {
    expect(puedeAvanzarAlMesSiguiente('2026-08', '2026-09')).toBe(true);
    expect(puedeAvanzarAlMesSiguiente('2025-12', '2026-01')).toBe(true);
  });
});

describe('hayFiltrosDeCobros (C4)', () => {
  /*
   * 🔴 El MES no cuenta. Siempre hay uno puesto, así que contarlo haría que el
   * vacío dijera «quita los filtros» hasta en una inmobiliaria recién creada
   * que nunca generó un cobro — justo el caso donde el otro mensaje, el que
   * lleva a la migración, es el correcto.
   */
  it('sin filtros reales devuelve false aunque el mes esté puesto', () => {
    expect(hayFiltrosDeCobros({ status: 'all' })).toBe(false);
    expect(hayFiltrosDeCobros({})).toBe(false);
    expect(hayFiltrosDeCobros({ status: 'all', search: '   ' })).toBe(false);
  });

  it('cualquier filtro de verdad lo enciende', () => {
    expect(hayFiltrosDeCobros({ status: 'late' })).toBe(true);
    expect(hayFiltrosDeCobros({ status: 'all', search: 'perez' })).toBe(true);
    expect(hayFiltrosDeCobros({ status: 'all', consignacionId: 'c1' })).toBe(true);
    expect(hayFiltrosDeCobros({ status: 'all', propietarioId: 'p1' })).toBe(true);
  });
});
