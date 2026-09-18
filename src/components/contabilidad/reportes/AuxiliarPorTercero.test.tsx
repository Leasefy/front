/**
 * El auxiliar por tercero.
 *
 * 🔴 El test que no se puede aflojar: `sinTercero` se muestra SIEMPRE, también
 * en cero. Un movimiento a la 2815 sin tercero es un asiento que no cumple el
 * régimen de mandato y es lo que bloquea la exógena; un bloque que aparece sólo
 * cuando hay problema enseña a no buscarlo, y «cero» es información distinta de
 * «no hay nada acá».
 *
 * Y el segundo: que el auxiliar no cuadre contra el libro invalida los saldos de
 * abajo, así que sale en rojo y arriba — con esos saldos se cobra y se gira.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import type { AuxiliarPorTercero as Auxiliar } from '@/lib/api/estados-financieros.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api } = vi.hoisted(() => ({
  api: { terceros: vi.fn(), mayor: vi.fn(), pyg: vi.fn(), balanceGeneral: vi.fn() },
}));

vi.mock('@/lib/api/estados-financieros.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/estados-financieros.service')>(
    '@/lib/api/estados-financieros.service',
  );
  return { ...actual, estadosFinancierosApi: api };
});
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ formatCurrency: (n: number) => `$${n.toLocaleString('es-CO')}` }),
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { AuxiliarPorTercero } from './AuxiliarPorTercero';

const auxiliar = (extra: Partial<Auxiliar> = {}): Auxiliar => ({
  total: 1,
  limite: 50,
  desplazamiento: 0,
  terceros: [
    {
      terceroTipo: 'PROPIETARIO',
      terceroId: 'p1',
      nombre: 'María Gómez',
      documento: '43123456',
      debitosCop: 0,
      creditosCop: 881_000,
      saldoCop: -881_000,
      cuentas: [{ codigo: '28150505', saldoCop: -881_000 }],
    },
  ],
  sinTercero: { movimientos: 0, debitosCop: 0, creditosCop: 0 },
  cuadraConElLibro: true,
  ...extra,
});

let container: HTMLDivElement;
let root: Root | null = null;
const q = (t: string) => document.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;

beforeEach(() => {
  api.terceros.mockReset().mockResolvedValue(auxiliar());
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.clearAllMocks();
});

async function pintar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<AuxiliarPorTercero />);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('<AuxiliarPorTercero>', () => {
  it('enumera los terceros con su saldo y sus cuentas', async () => {
    await pintar();
    const fila = q('tercero-p1')!.textContent!;
    expect(fila).toContain('María Gómez');
    expect(fila).toContain('43123456');
    expect(fila).toContain('28150505');
  });

  it('🔴 `sinTercero` en CERO también se muestra: «revisado» no es «no hay nada»', async () => {
    await pintar();
    const bloque = q('movimientos-sin-tercero')!;
    expect(bloque).not.toBeNull();
    expect(bloque.textContent).toContain('Ningún movimiento quedó sin tercero');
    expect(bloque.textContent).toContain('se revisa siempre');
  });

  it('🔴 con movimientos sin tercero grita, y nombra el mandato y la exógena', async () => {
    api.terceros.mockResolvedValue(
      auxiliar({
        sinTercero: { movimientos: 412, debitosCop: 1_000, creditosCop: 4_300_000 },
      }),
    );

    await pintar();

    const bloque = q('movimientos-sin-tercero')!;
    expect(bloque.getAttribute('role')).toBe('alert');
    expect(bloque.textContent).toContain('412 movimientos sin tercero');
    expect(bloque.textContent).toContain('régimen de mandato');
    expect(bloque.textContent).toContain('bloquea la exógena');
  });

  it('🔴 que no cuadre con el libro sale arriba y dice que los saldos no se usan', async () => {
    api.terceros.mockResolvedValue(auxiliar({ cuadraConElLibro: false }));

    await pintar();

    const cartel = q('auxiliar-no-cuadra')!.textContent!;
    expect(cartel).toContain('dejando algo afuera');
    expect(cartel).toContain('no se pueden usar para cobrar ni para girar');
  });

  it('explica el signo del saldo: positivo nos debe, negativo le debemos', async () => {
    await pintar();
    const nota = q('que-dice-el-saldo')!.textContent!;
    expect(nota).toContain('positivo');
    expect(nota).toContain('negativo');
    expect(nota).toContain('canon recaudado y sin girar');
  });

  it('un tercero sin nombre lo dice, en vez de una celda vacía', async () => {
    api.terceros.mockResolvedValue(
      auxiliar({
        terceros: [
          {
            terceroTipo: 'PROVEEDOR',
            terceroId: 'x1',
            nombre: null,
            documento: null,
            debitosCop: 0,
            creditosCop: 100,
            saldoCop: -100,
            cuentas: [],
          },
        ],
      }),
    );

    await pintar();

    expect(q('tercero-x1')!.textContent).toContain('Sin nombre en el sistema');
    expect(q('tercero-x1')!.textContent).toContain('sin documento');
  });

  it('cada fila lleva al estado de cuenta de ESE tercero', async () => {
    await pintar();
    const enlace = q('tercero-p1')!.querySelector('a')!;
    expect(enlace.getAttribute('href')).toContain('informe=tercero');
    expect(enlace.getAttribute('href')).toContain('terceroTipo=PROPIETARIO');
    expect(enlace.getAttribute('href')).toContain('terceroId=p1');
  });

  it('`conSaldo` viaja en la consulta, por defecto prendido', async () => {
    await pintar();
    expect(api.terceros).toHaveBeenCalledWith(expect.objectContaining({ conSaldo: true }));
  });

  it('la paginación no ofrece «siguiente» cuando ya se vieron todos', async () => {
    await pintar();
    expect((q('siguiente') as HTMLButtonElement).disabled).toBe(true);
    expect((q('anterior') as HTMLButtonElement).disabled).toBe(true);
    expect(q('pagina-de-terceros')!.textContent).toContain('1 de 1');
  });

  it('con más terceros que la página, «siguiente» se habilita', async () => {
    api.terceros.mockResolvedValue(auxiliar({ total: 1_733 }));
    await pintar();
    expect((q('siguiente') as HTMLButtonElement).disabled).toBe(false);
  });

  it('una lista vacía dice por qué, incluido el filtro de saldo', async () => {
    api.terceros.mockResolvedValue(auxiliar({ total: 0, terceros: [] }));
    await pintar();
    expect(container.textContent).toContain('y con saldo');
  });
});
