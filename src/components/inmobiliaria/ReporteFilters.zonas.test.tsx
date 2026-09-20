/**
 * 🔴 El desplegable de zonas ya NO existe (RP2, auditoría del 13-09).
 *
 * Primero la página le pasaba seis nombres escritos a mano («Chapinero», «El
 * Poblado»…); después salieron del reporte de ocupación. Pero el filtro NUNCA
 * filtró: `filteredReports` mira categoría, favoritos y búsqueda, y ningún
 * endpoint de reportes acepta una zona. Un control que no cambia un solo
 * número, en la pantalla donde el dato se vuelve decisión, hace creer que lo
 * que se está mirando es de esa zona.
 *
 * Esta prueba es lo que impide que vuelva sin filtrar.
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

function pintar() {
  act(() => {
    root.render(
      <ReporteFilters
        filters={FILTROS}
        onFiltersChange={() => {}}
        reportCounts={CONTEOS}
      />,
    );
  });
}

const texto = () => document.body.textContent ?? '';

describe('<ReporteFilters> — zonas', () => {
  it('🔴 no ofrece ningún filtro de zona: no filtraba nada', () => {
    pintar();
    expect(texto()).not.toContain('Todas las zonas');
  });

  it('nunca pinta las zonas que estaban quemadas en la página', () => {
    pintar();
    for (const inventada of ['Chapinero', 'El Poblado', 'Usaquen', 'Suba']) {
      expect(texto()).not.toContain(inventada);
    }
  });
});
