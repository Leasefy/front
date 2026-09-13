/**
 * «Disponibles sin señal» — la lista que deja VERIFICAR que un inmueble quedó
 * preparado. Sin ella, el botón «Preparar para trabajar sin señal» es una
 * promesa que sólo se comprueba llegando al apartamento.
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}));
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { DisponiblesSinSenal } from './DisponiblesSinSenal';
import {
  almacenEnMemoria,
  anotarRuta,
  borrarCopia,
  guardarCopia,
  usarAlmacenDeCopias,
} from '@/lib/inventario/copia-de-inmueble';
import {
  almacenEnMemoria as borradoresEnMemoria,
  usarAlmacen as usarAlmacenDeBorradores,
} from '@/lib/inventario/borrador-de-inventario';
import type { Consignacion } from '@/lib/types/inmobiliaria';

function consignacion(id: string, titulo: string): Consignacion {
  return {
    id,
    propertyId: `prop-${id}`,
    propietarioId: 'own-1',
    copropietarios: [],
    agenteId: 'agent-1',
    propertyTitle: titulo,
    propertyAddress: 'Cra 1 # 2-3',
    propertyCity: 'Medellín',
    propertyZone: 'El Poblado',
    propertyType: 'apartment',
    monthlyRent: 1_000_000,
    commissionPercent: 10,
    listingType: 'rent',
    saleCommissionPercent: null,
    propertyCode: null,
    contractDate: '2026-01-01',
    status: 'active',
    availability: 'available',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  } as Consignacion;
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  usarAlmacenDeCopias(almacenEnMemoria());
  usarAlmacenDeBorradores(borradoresEnMemoria());
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  usarAlmacenDeCopias(null);
  usarAlmacenDeBorradores(null);
});

async function render() {
  await act(async () => {
    root.render(<DisponiblesSinSenal />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

describe('<DisponiblesSinSenal>', () => {
  it('sin nada preparado no ocupa lugar en la pantalla', async () => {
    await render();
    expect(container.querySelector('[data-testid="disponibles-sin-senal"]')).toBeNull();
  });

  it('lista lo que hay guardado, de lo más reciente a lo más viejo', async () => {
    await guardarCopia(consignacion('c-1', 'Apto viejo'), 1_000);
    await guardarCopia(consignacion('c-2', 'Apto nuevo'), 5_000);
    await render();

    const filas = container.querySelectorAll('[data-testid="disponible-sin-senal"]');
    expect(filas).toHaveLength(2);
    expect(filas[0].textContent).toContain('Apto nuevo');
    expect(filas[1].textContent).toContain('Apto viejo');
  });

  it('preparar un inmueble desde otra pantalla se ve acá sin recargar', async () => {
    await render();
    expect(container.querySelector('[data-testid="disponibles-sin-senal"]')).toBeNull();

    await act(async () => {
      await guardarCopia(consignacion('c-9', 'Apto recién preparado'), 7_000);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Apto recién preparado');
  });

  /*
   * 🔴 Desde el 2026-09-13 el inventario también se carga desde la ficha del
   * contrato, y el worker guarda PÁGINAS: preparar desde el contrato no deja
   * lista la del inmueble. El renglón tiene que decirlo — enterarse en el
   * apartamento es enterarse tarde.
   */
  it('dice desde qué pantallas se abre cada uno, y sólo las preparadas', async () => {
    await guardarCopia(consignacion('c-1', 'Apto del contrato'), 1_000);
    await anotarRuta('c-1', '/panel/inmobiliaria/contratos/lease-7');
    await render();

    const desde = container.querySelector('[data-testid="se-abre-desde"]')!;
    const enlaces = [...desde.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(enlaces).toEqual(['/panel/inmobiliaria/contratos/lease-7']);
    // Nadie preparó la ficha del inmueble: no se nombra.
    expect(desde.textContent).not.toContain('elInmueble');
  });

  it('preparadas las dos, las nombra a las dos', async () => {
    await guardarCopia(consignacion('c-1', 'Apto preparado dos veces'), 1_000);
    await anotarRuta('c-1', '/panel/inmobiliaria/inmuebles/c-1');
    await anotarRuta('c-1', '/panel/inmobiliaria/contratos/lease-7');
    await render();

    const enlaces = [...container.querySelectorAll('[data-testid="se-abre-desde"] a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(enlaces).toEqual([
      '/panel/inmobiliaria/inmuebles/c-1',
      '/panel/inmobiliaria/contratos/lease-7',
    ]);
  });

  it('una copia vieja, sin rutas anotadas, sigue siendo la ficha del inmueble', async () => {
    await guardarCopia(consignacion('c-1', 'Apto de antes'), 1_000);
    await render();

    const enlaces = [...container.querySelectorAll('[data-testid="se-abre-desde"] a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(enlaces).toEqual(['/panel/inmobiliaria/inmuebles/c-1']);
  });

  it('quitar uno lo saca de la lista', async () => {
    await guardarCopia(consignacion('c-1', 'Apto único'), 1_000);
    await render();

    await act(async () => {
      await borrarCopia('c-1');
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.querySelector('[data-testid="disponibles-sin-senal"]')).toBeNull();
  });
});
