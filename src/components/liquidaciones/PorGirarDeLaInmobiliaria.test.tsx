/**
 * 🔴 Liquidaciones era la tercera cifra distinta de «Por girar» (sólo el mes).
 * Ahora encima del mes va la de la inmobiliaria entera, la MISMA del Tablero
 * y de «Cartera → Por pagar» (`GET /dispersiones/por-girar`), y el aviso de
 * los inmuebles que no se giran por falta del porcentaje de cada dueño.
 */
import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const api = vi.hoisted(() => ({ porGirar: vi.fn() }));
vi.mock('@/lib/api/inmobiliaria.service', () => ({ dispersionesApi: api }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

import { PorGirarDeLaInmobiliaria } from './PorGirarDeLaInmobiliaria';
import { AvisoSinPorcentaje } from '@/components/inmobiliaria/AvisoSinPorcentaje';

let container: HTMLDivElement;
let root: Root | null = null;

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
});

async function pintar(nodo: React.ReactElement) {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(nodo);
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe('<PorGirarDeLaInmobiliaria>', () => {
  it('🔴 pinta la cifra del back hasta el mes en curso y los próximos giros aparte', async () => {
    api.porGirar.mockResolvedValue({
      hastaMes: '2026-10',
      porGirarCop: 208_308_995,
      deduccionesCop: 230_000,
      cuotas: 41,
      proximosGiros: { desdeMes: '2026-11', hastaMes: '2027-01', totalCop: 96_000_000, cuotas: 40 },
    });
    await pintar(<PorGirarDeLaInmobiliaria />);
    const caja = container.querySelector('[data-testid="por-girar-liquidaciones"]')?.textContent ?? '';
    expect(caja).toContain('Por girar hasta octubre de 2026');
    expect(caja).toContain('Próximos giros · noviembre de 2026 a enero de 2027');
    expect(caja).toContain('la misma cifra en el Tablero, en Cartera → Por pagar y en Liquidaciones');
  });

  it('un back sin la ruta no rompe la pantalla: no se pinta nada', async () => {
    api.porGirar.mockRejectedValue(new Error('404'));
    await pintar(<PorGirarDeLaInmobiliaria />);
    expect(container.querySelector('[data-testid="por-girar-liquidaciones"]')).toBeNull();
  });
});

describe('<AvisoSinPorcentaje>', () => {
  it('🔴 dice qué inmueble no se gira, cuánto queda sin girar y lleva a ponerle el porcentaje', async () => {
    await pintar(
      <AvisoSinPorcentaje
        inmuebles={[
          {
            consignacionId: 'cons-9004',
            propertyId: 'prop-9004',
            propertyTitle: 'Casa 9004',
            cuotas: 1,
            pendienteCop: 1_800_000,
          },
        ]}
      />,
    );
    const aviso = container.querySelector('[data-testid="aviso-sin-porcentaje"]');
    expect(aviso?.textContent).toContain('1 inmueble no se gira: falta el porcentaje de cada propietario');
    expect(aviso?.textContent).toContain('Casa 9004');
    expect(aviso?.textContent).toContain('1.800.000');
    expect(aviso?.querySelector('a')?.getAttribute('href')).toBe(
      '/panel/inmobiliaria/inmuebles/cons-9004#propietarios',
    );
  });

  it('sin inmuebles no hay aviso', async () => {
    await pintar(<AvisoSinPorcentaje inmuebles={[]} />);
    expect(container.querySelector('[data-testid="aviso-sin-porcentaje"]')).toBeNull();
  });
});
