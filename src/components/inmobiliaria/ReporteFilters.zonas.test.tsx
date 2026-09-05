/**
 * El desplegable de zonas sólo existe si hay zonas.
 *
 * Antes la página le pasaba a este filtro seis nombres escritos a mano, así
 * que el control siempre estaba y siempre tenía opciones. Ahora las zonas
 * salen del reporte de ocupación: mientras carga, o si la agencia no tiene
 * ninguna, la lista llega vacía. Un desplegable vacío que igual dice «Todas
 * las zonas» es peor que no tenerlo: afirma que hay zonas y que las estamos
 * mostrando todas.
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));

import { ReporteFilters, type ReporteFiltersState } from './ReporteFilters';

void React;

const FILTROS: ReporteFiltersState = {
  period: { start: '2026-09-01', end: '2026-09-30' },
  zone: null,
  category: 'all',
  search: '',
  favoritesOnly: false,
};

const CONTEOS = { all: 6, financiero: 2, operativo: 2, agentes: 2 };

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
  document.body.innerHTML = '';
});

function pintar(zones: string[]) {
  act(() => {
    root.render(
      <ReporteFilters
        filters={FILTROS}
        onFiltersChange={() => {}}
        reportCounts={CONTEOS}
        zones={zones}
      />,
    );
  });
}

const texto = () => document.body.textContent ?? '';

describe('<ReporteFilters> — zonas', () => {
  it('sin zonas no ofrece el desplegable', () => {
    pintar([]);
    expect(texto()).not.toContain('Todas las zonas');
  });

  it('con zonas reales sí lo ofrece', () => {
    pintar(['Ciudad Jardín']);
    expect(texto()).toContain('Todas las zonas');
  });

  it('nunca pinta las zonas que estaban quemadas en la página', () => {
    pintar([]);
    for (const inventada of ['Chapinero', 'El Poblado', 'Usaquen', 'Suba']) {
      expect(texto()).not.toContain(inventada);
    }
  });
});
