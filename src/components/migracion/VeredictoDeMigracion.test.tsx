/**
 * El veredicto, montado.
 *
 * Los números los prueba `muro-reglas.test.ts`. Acá se prueba lo otro: que
 * cada línea traiga su botón (Nico: «una alerta dice qué pasó, qué hacer, y
 * trae el botón»), que un motivo que el back no cuenta no se dibuje, y que la
 * tabla mire por los DOS caminos —fila pendiente y fila activada— porque
 * mirar por uno solo es cómo 89 contratos sin inmueble se veían como cero.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, params?: Record<string, unknown>) =>
      params ? `${k}::${JSON.stringify(params)}` : k,
    locale: 'es',
  }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...resto }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...resto}>
      {children}
    </a>
  ),
}));

const { filasMock } = vi.hoisted(() => ({ filasMock: vi.fn() }));
vi.mock('@/lib/api/contracts.service', () => ({
  contractsApi: { migracion: { filas: (...args: unknown[]) => filasMock(...args) } },
}));

import { FilasFrenadas, VeredictoDeMigracion } from './VeredictoDeMigracion';
import type { DeudaDeMigracion } from './muro-reglas';

/** Lo que devolvía dev para la agencia de Nico el 2026-09-03. */
const DEUDA_DE_NICO: DeudaDeMigracion = {
  contratos: 91,
  sinInmueble: 89,
  sinPropietario: 89,
  pendientes: 0,
  sinInquilino: null,
};

let container: HTMLDivElement;
let root: Root | null = null;

async function pintar(nodo: React.ReactElement) {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(nodo);
  });
  await act(async () => {});
}

function q(testid: string) {
  return container.querySelector(`[data-testid="${testid}"]`);
}

function todos(testid: string) {
  return Array.from(container.querySelectorAll(`[data-testid="${testid}"]`));
}

beforeEach(() => {
  filasMock.mockReset();
  filasMock.mockResolvedValue({ filas: [], total: 0, pagina: 1, porPagina: 10 });
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container?.remove();
});

// ══════════════════════════════════════════════════════════════════════════

describe('VeredictoDeMigracion', () => {
  it('dice el total y una línea por motivo, cada una con su botón', async () => {
    const ir = vi.fn();
    await pintar(<VeredictoDeMigracion deuda={DEUDA_DE_NICO} resolver={{ onIr: ir }} />);

    expect(q('veredicto-contratos')?.textContent).toContain('"n":91');

    const lineas = todos('veredicto-linea');
    expect(lineas.map((l) => l.getAttribute('data-motivo'))).toEqual([
      'sinInmueble',
      'sinPropietario',
    ]);
    expect(lineas[0].textContent).toContain('"n":89');
    // Ningún control sin comportamiento: cada línea lleva a resolverla.
    expect(lineas.every((l) => l.querySelector('button') !== null)).toBe(true);

    await act(async () => {
      (lineas[0].querySelector('button') as HTMLElement).dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
    });
    expect(ir).toHaveBeenCalledTimes(1);
  });

  it('🔴 un motivo que el back no cuenta no se dibuja — ni siquiera en cero', async () => {
    await pintar(<VeredictoDeMigracion deuda={DEUDA_DE_NICO} resolver={{ onIr: vi.fn() }} />);
    const motivos = todos('veredicto-linea').map((l) => l.getAttribute('data-motivo'));
    expect(motivos).not.toContain('sinInquilino');
    expect(motivos).not.toContain('pendientes');
  });

  it('fuera del muro el botón es un enlace a la migración', async () => {
    await pintar(
      <VeredictoDeMigracion deuda={DEUDA_DE_NICO} resolver={{ href: '/panel/x/migrar' }} />,
    );
    const enlace = todos('veredicto-linea')[0].querySelector('a');
    expect(enlace?.getAttribute('href')).toBe('/panel/x/migrar');
  });
});

// ══════════════════════════════════════════════════════════════════════════

describe('FilasFrenadas', () => {
  const FILA_ACTIVADA_SIN_INMUEBLE = {
    id: 'f1',
    lote: 'l1',
    fila: 7,
    datos: { direccion: 'Calle 100 #11-20', inquilino: { nombre: 'Ana Ruiz', correo: 'a@b.co' } },
    propertyId: null,
    propietarioId: null,
    tenantId: 't1',
    candidatos: [],
    estado: 'ACTIVADO',
    faltantes: [],
    contractId: 'c1',
    propietario: null,
  };

  it('🔴 arranca por la lente que TIENE algo: con 0 pendientes, las activadas', async () => {
    filasMock.mockResolvedValue({
      filas: [FILA_ACTIVADA_SIN_INMUEBLE],
      total: 89,
      pagina: 1,
      porPagina: 10,
    });
    await pintar(<FilasFrenadas deuda={DEUDA_DE_NICO} resolver={{ onIr: vi.fn() }} />);

    expect(filasMock).toHaveBeenCalledWith(undefined, {
      pagina: 1,
      porPagina: 10,
      estado: 'ACTIVADO',
    });
  });

  it('la fila muestra el número del archivo, la dirección, el inquilino y qué le falta', async () => {
    filasMock.mockResolvedValue({
      filas: [FILA_ACTIVADA_SIN_INMUEBLE],
      total: 89,
      pagina: 1,
      porPagina: 10,
    });
    await pintar(<FilasFrenadas deuda={DEUDA_DE_NICO} resolver={{ onIr: vi.fn() }} />);

    const fila = q('veredicto-fila');
    expect(fila).not.toBeNull();
    // Una fila ACTIVADA no trae `faltantes`: su deuda se ve en las columnas.
    expect(fila?.getAttribute('data-faltas')).toBe('inmueble');
    expect(fila?.textContent).toContain('7');
    expect(fila?.textContent).toContain('Calle 100 #11-20');
    expect(fila?.textContent).toContain('Ana Ruiz');
  });

  it('sin deuda de ninguna clase no hay tabla que mostrar', async () => {
    await pintar(
      <FilasFrenadas
        deuda={{
          contratos: 91,
          sinInmueble: 0,
          sinPropietario: 0,
          pendientes: 0,
          sinInquilino: null,
        }}
        resolver={{ onIr: vi.fn() }}
      />,
    );
    expect(q('veredicto-filas')).toBeNull();
    expect(filasMock).not.toHaveBeenCalled();
  });

  it('con filas pendientes mira por ese camino primero', async () => {
    await pintar(
      <FilasFrenadas
        deuda={{
          contratos: 91,
          sinInmueble: 0,
          sinPropietario: 0,
          pendientes: 12,
          sinInquilino: 12,
        }}
        resolver={{ onIr: vi.fn() }}
      />,
    );
    expect(filasMock).toHaveBeenCalledWith(undefined, {
      pagina: 1,
      porPagina: 10,
      estado: 'PENDIENTE',
    });
  });
});
