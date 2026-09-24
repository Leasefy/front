/**
 * @vitest-environment happy-dom
 *
 * O1: el hook de Mi plata separa «el portafolio no llegó por una caída» de «el portal no está
 * habilitado», y `reintentar` vuelve a pedir. Sin esto la página no tiene cómo distinguirlos.
 */
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/*
 * Las tres partes del portal se piden CON ESTADO: el hook distingue «falló» de
 * «no hay nada», y una tarjeta que se borra no dice cuál de las dos pasó (O3).
 * Este doble tiene que hablar ese idioma o el efecto revienta al montar.
 */
const api = vi.hoisted(() => ({
  getPortafolioConEstado: vi.fn(),
  getInmuebles: vi.fn(async () => []),
  getProyeccionConEstado: vi.fn(async () => ({ estado: 'ok', data: null })),
  getRecaudoAnualConEstado: vi.fn(async () => ({ estado: 'ok', data: null })),
}));
vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => ({ agency: { id: 'ag-1' } }) }));
vi.mock('@/lib/api/owner-finanzas.service', () => ({ ownerFinanzasApi: api }));
vi.mock('@/lib/api/owner-portal.service', () => ({ ownerPortalApi: {} }));
vi.mock('@/lib/api/owner-seleccion.service', () => ({ ownerSeleccionApi: {} }));
vi.mock('@/lib/api/owner-solicitudes.service', () => ({ ownerSolicitudesApi: {} }));
vi.mock('@/lib/api/owner-novedades.service', () => ({ ownerNovedadesApi: {} }));

import { useOwnerFinanzas, type UseOwnerFinanzasResult } from './useOwnerPortal';

let ultimo: UseOwnerFinanzasResult | null = null;
function Sonda() {
  ultimo = useOwnerFinanzas();
  return null;
}

let container: HTMLDivElement;
let root: Root;

const esperar = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  ultimo = null;
  api.getPortafolioConEstado.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
});

describe('useOwnerFinanzas — fallo ≠ no habilitado (O1)', () => {
  it('🔴 un 500 es un fallo, no «no disponible»', async () => {
    api.getPortafolioConEstado.mockResolvedValue({ estado: 'fallo', status: 500, mensaje: 'El portal respondió 500.' });
    await act(async () => {
      root.render(<Sonda />);
    });
    await esperar();

    expect(ultimo?.isLoading).toBe(false);
    expect(ultimo?.fallo).toEqual({ status: 500, mensaje: 'El portal respondió 500.' });
    expect(ultimo?.unavailable).toBe(false);
  });

  it('con el portal apagado es «no disponible», sin fallo', async () => {
    api.getPortafolioConEstado.mockResolvedValue({ estado: 'no-habilitado' });
    await act(async () => {
      root.render(<Sonda />);
    });
    await esperar();

    expect(ultimo?.fallo).toBeNull();
    expect(ultimo?.unavailable).toBe(true);
  });

  it('reintentar vuelve a pedir y limpia el fallo cuando llega', async () => {
    api.getPortafolioConEstado
      .mockResolvedValueOnce({ estado: 'fallo', status: 0, mensaje: 'No hubo conexión con el portal.' })
      .mockResolvedValueOnce({ estado: 'ok', data: { totalCop: 5 } });
    await act(async () => {
      root.render(<Sonda />);
    });
    await esperar();
    expect(ultimo?.fallo?.status).toBe(0);

    await act(async () => {
      ultimo?.reintentar();
    });
    await esperar();

    expect(api.getPortafolioConEstado).toHaveBeenCalledTimes(2);
    expect(ultimo?.fallo).toBeNull();
    expect(ultimo?.portafolio).toEqual({ totalCop: 5 });
  });
});
