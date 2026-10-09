/**
 * useLinksDePago / useResumenDePayu / useAutopagosDeLaInmobiliaria contra
 * DOBLES de las rutas del back (el back se construye en paralelo).
 *
 * Lo que importa: la tabla nunca muestra la página de otros filtros, y una
 * respuesta vieja que llega tarde no pisa a la nueva.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const get = vi.fn();
vi.mock('@/lib/api/client', () => ({ apiClient: { get: (...a: unknown[]) => get(...a) } }));

import {
  useAutopagosDeLaInmobiliaria,
  useLinksDePago,
  useResumenDePayu,
  type Lectura,
} from './use-payu';
import type { PaginaDeLinksDePago } from '@/lib/types/payu';

let contenedor: HTMLDivElement;
let root: Root;

beforeEach(() => {
  get.mockReset();
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
});

afterEach(() => {
  act(() => root.unmount());
  contenedor.remove();
});

const pagina = (mes: string): PaginaDeLinksDePago => ({
  items: [
    {
      cuotaId: `c-${mes}`,
      contratoId: 'k1',
      contratoNumero: '#43',
      inmueble: 'Apartamento 101',
      inquilino: 'Marta Gómez',
      fechaDeVencimiento: `${mes}-05`,
      montoCop: 1_500_000,
      estado: 'enviado',
      hitosEnviados: ['antes'],
      ultimoEnvioEn: null,
      pagadoEn: null,
      paymentUrl: null,
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
});

/** Una promesa que se resuelve cuando la prueba quiere. */
function diferida<T>() {
  let resolver!: (v: T) => void;
  const promesa = new Promise<T>((r) => {
    resolver = r;
  });
  return { promesa, resolver };
}

describe('useLinksDePago', () => {
  let ultima: Lectura<PaginaDeLinksDePago> | null = null;
  function Sonda({ mes }: { mes: string }) {
    ultima = useLinksDePago({ mes, page: 1, limit: 20 });
    return null;
  }

  it('pide la ruta con los filtros y entrega la página', async () => {
    get.mockResolvedValue(pagina('2026-10'));
    await act(async () => root.render(<Sonda mes="2026-10" />));
    expect(get).toHaveBeenCalledWith('/inmobiliaria/cobros/links?mes=2026-10&page=1&limit=20');
    expect(ultima?.cargando).toBe(false);
    expect(ultima?.data?.items[0].cuotaId).toBe('c-2026-10');
  });

  it('🔴 al cambiar de mes, la página del mes anterior no se muestra mientras llega la nueva', async () => {
    const octubre = diferida<PaginaDeLinksDePago>();
    const noviembre = diferida<PaginaDeLinksDePago>();
    get.mockImplementation((ruta: string) => (ruta.includes('2026-10') ? octubre.promesa : noviembre.promesa));

    await act(async () => root.render(<Sonda mes="2026-10" />));
    await act(async () => octubre.resolver(pagina('2026-10')));
    expect(ultima?.data?.items[0].cuotaId).toBe('c-2026-10');

    await act(async () => root.render(<Sonda mes="2026-11" />));
    expect(ultima?.cargando).toBe(true);
    expect(ultima?.data).toBeNull();

    await act(async () => noviembre.resolver(pagina('2026-11')));
    expect(ultima?.data?.items[0].cuotaId).toBe('c-2026-11');
  });

  it('🔴 una respuesta vieja que llega tarde no pisa a la nueva', async () => {
    const octubre = diferida<PaginaDeLinksDePago>();
    const noviembre = diferida<PaginaDeLinksDePago>();
    get.mockImplementation((ruta: string) => (ruta.includes('2026-10') ? octubre.promesa : noviembre.promesa));

    await act(async () => root.render(<Sonda mes="2026-10" />));
    await act(async () => root.render(<Sonda mes="2026-11" />));
    await act(async () => noviembre.resolver(pagina('2026-11')));
    await act(async () => octubre.resolver(pagina('2026-10')));
    expect(ultima?.data?.items[0].cuotaId).toBe('c-2026-11');
  });

  it('si el back falla, el error sube entero y no hay datos', async () => {
    const error = new Error('500');
    get.mockRejectedValue(error);
    await act(async () => root.render(<Sonda mes="2026-10" />));
    expect(ultima?.error).toBe(error);
    expect(ultima?.data).toBeNull();
    expect(ultima?.cargando).toBe(false);
  });
});

describe('useResumenDePayu y useAutopagosDeLaInmobiliaria', () => {
  it('leen sus rutas', async () => {
    const leidas: unknown[] = [];
    function Sonda() {
      const r = useResumenDePayu('2026-10');
      const a = useAutopagosDeLaInmobiliaria();
      leidas.push([r.data, a.data]);
      return null;
    }
    get.mockImplementation(async (ruta: string) =>
      ruta.startsWith('/inmobiliaria/autopago')
        ? { cobroAutomaticoActivo: false, items: [] }
        : { mes: '2026-10', payuActivo: false },
    );
    await act(async () => root.render(<Sonda />));
    expect(get).toHaveBeenCalledWith('/inmobiliaria/cobros/links/resumen?mes=2026-10');
    expect(get).toHaveBeenCalledWith('/inmobiliaria/autopago');
    expect(leidas.at(-1)).toEqual([
      { mes: '2026-10', payuActivo: false },
      { cobroAutomaticoActivo: false, items: [] },
    ]);
  });
});
