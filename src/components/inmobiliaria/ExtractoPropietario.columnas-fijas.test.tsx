/**
 * ExtractoPropietario — Propiedad y Neto se quedan quietos (02-10-2026).
 *
 * Nico (pregunta 18): la tabla del extracto mide ~1.170 px en un cajón de 1024
 * y el NETO —lo que el propietario recibe— quedaba detrás del scroll lateral.
 * Ahora la primera y la última columna son `position: sticky`, con un filete
 * de sombra en su borde interior que aparece SÓLO cuando hay tabla escondida
 * de ese lado.
 *
 * jsdom no mide: `scrollWidth`/`clientWidth`/`scrollLeft` se simulan en el
 * contenedor que se corre (el que `Table` pone alrededor del `<table>`) y se
 * avisa con un `scroll`, que es lo que escucha la medición.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import type { ExtractoPropietario as Extracto } from '@/lib/types/inmobiliaria';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial: _i, animate: _a, ...props }: React.ComponentProps<'div'> & Record<string, unknown>) =>
      React.createElement('div', props, children),
    tr: ({ children, initial: _i, animate: _a, transition: _t, ...props }: React.ComponentProps<'tr'> & Record<string, unknown>) =>
      React.createElement('tr', props, children),
  },
}));
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  usePropietarios: () => ({ propietarios: [] }),
  useInmobiliariaConfig: () => ({ config: { agency: { name: 'Inmobiliaria', nit: '1', address: null, city: null } } }),
}));

import { ExtractoPropietario } from './ExtractoPropietario';

type Linea = Extracto['lineItems'][number];

const linea = (n: number): Linea => ({
  cuotaId: `q-${n}`, cobroId: null, contractId: `ct-${n}`, consignacionId: `c-${n}`,
  propertyTitle: `Apartamento ${n}01`, propertyAddress: 'Cra 42',
  tenantName: 'Juan', rentAmount: 2_000_000, adminAmount: 150_000, totalAmount: 2_150_000, paidAmount: 0,
  status: 'COBRO_PENDING', commissionPercent: 10, commissionAmount: 200_000, netAmount: 1_800_000,
  rentCollected: 2_000_000, conceptosAFavor: 0, conceptosACargo: 0, deTerceros: 150_000,
  dispersionId: null, giradoCop: 0, enGiroCop: 0, porGirarCop: 1_800_000,
  estadoDelGiro: 'POR_GIRAR', renglones: [], baseDelCanon: 'CAUSADO',
});

const extracto: Extracto = {
  propietarioId: 'p1',
  propietarioName: 'Ana',
  month: '2026-09',
  generatedAt: '2026-09-16T18:00:00.000Z',
  lineItems: [linea(1), linea(2), linea(3)],
  sinMovimiento: null,
  baseDelCanon: 'CAUSADO',
  totals: {
    totalRent: 6_000_000, totalAdmin: 450_000, totalPaid: 0, totalCommission: 600_000, totalNet: 5_400_000,
    totalConceptosAFavor: 0, totalConceptosACargo: 0, totalDeTerceros: 450_000,
    totalGirado: 0, totalEnGiro: 0, totalPorGirar: 5_400_000,
  },
  bankInfo: { bankName: null, bankAccountType: null, bankAccountNumber: null, bankAccountHolder: null },
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function render() {
  await act(async () => {
    root.render(React.createElement(ExtractoPropietario, { extracto }));
  });
}

/** El contenedor que se corre: el que `Table` pone alrededor del `<table>`. */
function contenedor(): HTMLElement {
  return container.querySelector('[data-testid="extracto-tabla"] table')!.parentElement!;
}

/** Simula el ancho y la posición del scroll, y avisa como lo haría el navegador. */
async function medir({ ancho, visible, corrido }: { ancho: number; visible: number; corrido: number }) {
  const caja = contenedor();
  Object.defineProperty(caja, 'scrollWidth', { configurable: true, value: ancho });
  Object.defineProperty(caja, 'clientWidth', { configurable: true, value: visible });
  Object.defineProperty(caja, 'scrollLeft', { configurable: true, value: corrido, writable: true });
  await act(async () => {
    caja.dispatchEvent(new Event('scroll'));
  });
}

const filetes = (columna: 'propiedad' | 'neto') =>
  Array.from(container.querySelectorAll<HTMLElement>(`[data-testid="filete-${columna}"]`));
const visibles = (columna: 'propiedad' | 'neto') => filetes(columna).map((f) => f.dataset.visible);

describe('ExtractoPropietario — columnas fijas', () => {
  it('Propiedad y Neto son sticky en la cabecera, en cada fila y en el pie; el resto no', async () => {
    await render();
    const filas = Array.from(container.querySelectorAll('[data-testid="extracto-tabla"] tr'));
    // cabecera + 3 filas + pie
    expect(filas).toHaveLength(5);
    for (const fila of filas) {
      const celdas = Array.from(fila.children) as HTMLElement[];
      const primera = celdas[0];
      const ultima = celdas[celdas.length - 1];
      expect(primera.className).toMatch(/\bsticky\b/);
      expect(primera.className).toMatch(/\bleft-0\b/);
      expect(ultima.className).toMatch(/\bsticky\b/);
      expect(ultima.className).toMatch(/\bright-0\b/);
      for (const delMedio of celdas.slice(1, -1)) expect(delMedio.className).not.toMatch(/\bsticky\b/);
    }
  });

  it('la celda fija tiene fondo opaco (nada se lee por debajo) y no es fija al imprimir', async () => {
    await render();
    const neto = container.querySelector<HTMLElement>('[data-testid="extracto-tabla"] tbody tr td:last-child')!;
    expect(neto.className).toMatch(/\bbg-surface\b/);
    expect(neto.className).toMatch(/dark:bg-card/);
    expect(neto.className).toMatch(/print:static/);
  });

  it('el pie dice el total en la columna de Propiedad, no en una celda de cuatro columnas fija', async () => {
    await render();
    const pie = container.querySelector('[data-testid="extracto-tabla"] tfoot tr')!;
    const primera = pie.children[0] as HTMLTableCellElement;
    expect(primera.colSpan).toBe(1);
    expect(primera.textContent).toContain('3');
  });

  it('sin desborde no hay ningún filete', async () => {
    await render();
    await medir({ ancho: 900, visible: 900, corrido: 0 });
    expect(visibles('propiedad').every((v) => v === 'false')).toBe(true);
    expect(visibles('neto').every((v) => v === 'false')).toBe(true);
  });

  it('🔴 con la tabla más ancha que la caja aparece el filete de NETO (queda tabla a la derecha)', async () => {
    await render();
    await medir({ ancho: 1170, visible: 900, corrido: 0 });
    expect(filetes('neto')).toHaveLength(5);
    expect(visibles('neto').every((v) => v === 'true')).toBe(true);
    expect(visibles('propiedad').every((v) => v === 'false')).toBe(true);
  });

  it('a mitad de camino se ven los dos', async () => {
    await render();
    await medir({ ancho: 1170, visible: 900, corrido: 120 });
    expect(visibles('propiedad').every((v) => v === 'true')).toBe(true);
    expect(visibles('neto').every((v) => v === 'true')).toBe(true);
  });

  it('al llegar al final el de Neto se va y queda el de Propiedad', async () => {
    await render();
    await medir({ ancho: 1170, visible: 900, corrido: 270 });
    expect(visibles('neto').every((v) => v === 'false')).toBe(true);
    expect(visibles('propiedad').every((v) => v === 'true')).toBe(true);
  });

  it('el filete entra con opacidad y sin transición con movimiento reducido; nunca al imprimir', async () => {
    await render();
    await medir({ ancho: 1170, visible: 900, corrido: 0 });
    const [neto] = filetes('neto');
    expect(neto.className).toMatch(/\bopacity-100\b/);
    expect(neto.className).toMatch(/\btransition-opacity\b/);
    expect(neto.className).toMatch(/motion-reduce:transition-none/);
    expect(neto.className).toMatch(/print:hidden/);
    expect(neto.getAttribute('aria-hidden')).toBe('true');
    const [propiedad] = filetes('propiedad');
    expect(propiedad.className).toMatch(/\bopacity-0\b/);
  });
});
