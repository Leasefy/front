/**
 * 🔴 «Por girar» → UNA sola cifra: hasta el mes en curso; lo de meses futuros
 * aparte como «Próximos giros» (Nico, 04-10-2026, tal cual).
 *
 * «Cartera → Por pagar» decía «Pendiente de girar · atrasado, este mes y los 3
 * siguientes» y sumaba la tabla: una tercera cifra para la misma pregunta. Ahora
 * el encabezado muestra la del back (la misma función del Tablero, de
 * Liquidaciones y del chat) y la tabla parte cada dueño por el mes en curso.
 */
import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { CarteraConPropietarios } from '@/lib/api/cartera.types';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const datos = vi.hoisted(() => ({ valor: null as unknown }));
vi.mock('@/lib/hooks/use-cartera', () => ({
  useCarteraConPropietarios: () => ({
    datos: datos.valor,
    cargando: false,
    error: null,
    recargar: vi.fn(),
  }),
}));
vi.mock('@/components/cartera/PropietariosQueDeben', () => ({ PropietariosQueDeben: () => null }));
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

import { CarteraDePropietarios, partirPorElMesEnCurso } from './CarteraDePropietarios';

const mes = (month: string, pendienteCop: number) => ({
  month,
  recaudadoCop: pendienteCop,
  comisionCop: 0,
  ivaComisionCop: 0,
  retencionesComisionCop: 0,
  conceptosAFavorCop: 0,
  conceptosACargoCop: 0,
  netoCop: pendienteCop,
  estado: 'SIN_GENERAR',
  giradoCop: 0,
  pendienteCop,
});

const CARTERA = {
  generadoEn: '2026-10-04T15:00:00.000Z',
  meses: ['2026-09', '2026-10', '2026-11'],
  avisos: [],
  totalesPorMes: [],
  totales: { netoCop: 6_000_000, giradoCop: 0, pendienteCop: 6_000_000 },
  porGirar: {
    hastaMes: '2026-10',
    porGirarCop: 3_770_000,
    deduccionesCop: 230_000,
    proximosGiros: { desdeMes: '2026-11', hastaMes: '2027-01', totalCop: 2_000_000 },
  },
  propietarios: [
    {
      propietarioId: 'p1',
      nombre: 'Paula Propietaria Ruiz',
      meses: [mes('2026-09', 2_000_000), mes('2026-10', 2_000_000), mes('2026-11', 2_000_000)],
      totales: { netoCop: 6_000_000, giradoCop: 0, pendienteCop: 6_000_000 },
    },
  ],
} as unknown as CarteraConPropietarios;

let container: HTMLDivElement;
let root: Root | null = null;

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
});

async function pintar() {
  datos.valor = CARTERA;
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<CarteraDePropietarios />);
  });
}

describe('«Cartera → Por pagar» con la cifra única', () => {
  it('🔴 el encabezado es la cifra del back hasta el mes en curso, y los próximos giros van aparte', async () => {
    await pintar();
    const encabezado = container.querySelector('[data-testid="por-girar-por-pagar"]')?.textContent ?? '';
    expect(encabezado).toContain('Por girar hasta octubre de 2026');
    expect(container.querySelector('[data-testid="por-girar-cifra"]')?.textContent).toContain('3.770.000');
    // Nunca la suma de la tabla (que trae los meses siguientes).
    expect(encabezado).not.toContain('6.000.000');
    expect(container.querySelector('[data-testid="proximos-giros"]')?.textContent).toContain(
      'Próximos giros · noviembre de 2026 a enero de 2027',
    );
    expect(container.textContent).not.toContain('atrasado, este mes y los 3 siguientes');
  });

  it('la tabla parte a cada dueño por el mes en curso: lo de noviembre va en «Próximos giros»', () => {
    expect(
      partirPorElMesEnCurso(
        [mes('2026-09', 2_000_000), mes('2026-10', 2_000_000), mes('2026-11', 2_000_000)] as never,
        '2026-10',
      ),
    ).toEqual({ pendienteCop: 4_000_000, proximosCop: 2_000_000 });
  });
});
