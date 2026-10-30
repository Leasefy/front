/**
 * «Tus búsquedas» del lado del marketplace: borrar una o todas (Nico, 27-10-2026: «las personas deberían de
 * tener la posibilidad de poder eliminar sus búsquedas»), con «Deshacer» en el aviso.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MotionGlobalConfig } from 'framer-motion';
import { guardarReciente, leerRecientes } from '@/lib/marketplace/busquedas-recientes';

void React;

const toastSuccess = vi.fn();
vi.mock('@/components/ui/toast', () => ({ toast: { success: (...a: unknown[]) => toastSuccess(...a) } }));
vi.mock('@/lib/marketplace/use-inmobiliarias', () => ({
  useAqui: () => '/propiedades',
  useInmobiliariasQueSigues: () => ({ lista: null }),
}));
vi.mock('./CuentaParaPublicar', () => ({ useCuentaParaSeguir: () => ({ abrir: () => undefined, ventana: null }) }));
vi.mock('./PublicarDesdeElMarketplace', () => ({ useDondePublicar: () => null }));

import { LadoDelMarketplace } from './LadoDelMarketplace';

let contenedor: HTMLDivElement;
let raiz: Root;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  toastSuccess.mockClear();
  // La salida animada de la búsqueda borrada termina de una.
  MotionGlobalConfig.skipAnimations = true;
});

/** Deja terminar la salida animada. */
async function esperarLaSalida() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 60));
  });
}

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
  window.localStorage.clear();
});

function montar() {
  act(() => {
    raiz.render(<LadoDelMarketplace />);
  });
}

const titulos = () => [...contenedor.querySelectorAll('li a span.truncate')].map((s) => s.textContent);

/** El `onClick` de «Deshacer» del último aviso. */
function deshacer() {
  const opciones = toastSuccess.mock.calls.at(-1)?.[1] as { action: { label: string; onClick: () => void } };
  expect(opciones.action.label).toBe('Deshacer');
  act(() => opciones.action.onClick());
}

describe('Tus búsquedas: borrar', () => {
  it('cada búsqueda tiene su botón para borrarla, que dice cuál borra', () => {
    guardarReciente('q=a', 'Estudio en Medellín');
    guardarReciente('q=b', 'Casa en Envigado');
    montar();
    const botones = [...contenedor.querySelectorAll('[data-testid="borrar-busqueda"]')];
    expect(botones.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Borrar la búsqueda «Casa en Envigado»',
      'Borrar la búsqueda «Estudio en Medellín»',
    ]);
  });

  it('borrar una la quita de la lista y de este navegador; «Deshacer» la devuelve', async () => {
    guardarReciente('q=a', 'Estudio en Medellín');
    guardarReciente('q=b', 'Casa en Envigado');
    montar();
    const deEnvigado = contenedor.querySelector<HTMLButtonElement>('[aria-label="Borrar la búsqueda «Casa en Envigado»"]')!;
    act(() => deEnvigado.click());
    await esperarLaSalida();
    expect(titulos()).not.toContain('Casa en Envigado');
    expect(leerRecientes().map((r) => r.qs)).toEqual(['q=a']);
    expect(toastSuccess).toHaveBeenCalledWith('Búsqueda borrada', expect.objectContaining({ description: 'Casa en Envigado' }));

    deshacer();
    expect(leerRecientes().map((r) => r.qs)).toEqual(['q=b', 'q=a']);
    expect(titulos()).toContain('Casa en Envigado');
  });

  it('«Borrar todas» deja el lado vacío con su explicación; «Deshacer» las devuelve', () => {
    guardarReciente('q=a', 'A');
    guardarReciente('q=b', 'B');
    guardarReciente('q=c', 'C');
    montar();
    act(() => contenedor.querySelector<HTMLButtonElement>('[data-testid="borrar-todas-las-busquedas"]')!.click());
    expect(leerRecientes()).toEqual([]);
    expect(contenedor.textContent).toContain('Aquí van quedando lo que buscas');
    expect(toastSuccess).toHaveBeenCalledWith('Borraste tus 3 búsquedas', expect.anything());

    deshacer();
    expect(leerRecientes().map((r) => r.qs)).toEqual(['q=c', 'q=b', 'q=a']);
  });

  it('con una sola no sale «Borrar todas» (basta su botón)', () => {
    guardarReciente('q=a', 'A');
    montar();
    expect(contenedor.querySelector('[data-testid="borrar-todas-las-busquedas"]')).toBeNull();
    expect(contenedor.querySelectorAll('[data-testid="borrar-busqueda"]')).toHaveLength(1);
  });
});
