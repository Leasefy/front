/**
 * Las pestañas de una ficha: la pestaña vive en la URL, todas se montan (nada
 * deja de cargar) y sólo se ve la activa.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

const { nav } = vi.hoisted(() => ({
  nav: { query: '', replace: vi.fn() },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.query),
}));

import { PestanasDeLaFicha, pestanaDeLaUrl } from './PestanasDeLaFicha';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

async function montar() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(
      <PestanasDeLaFicha
        etiqueta="Secciones del contrato"
        pestanas={[
          { id: 'resumen', etiqueta: 'Resumen', contenido: <p data-testid="bloque-resumen">resumen</p> },
          { id: 'cobro', etiqueta: 'Cobro y reglas', cuenta: 3, contenido: <p data-testid="bloque-cobro">cobro</p> },
          { id: 'historial', etiqueta: 'Historial', contenido: <p id="fotos" data-testid="bloque-historial">historial</p> },
        ]}
      />,
    );
  });
}

const $ = (id: string) => document.querySelector(`[data-testid="${id}"]`);
const visible = (id: string) => $(`panel-${id}`)?.getAttribute('data-state') === 'active';

beforeEach(() => {
  window.history.replaceState(null, '', '/panel/inmobiliaria/contratos/k1');
  nav.query = '';
  nav.replace.mockClear();
  document.body.innerHTML = '';
});

afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
  document.body.innerHTML = '';
});

describe('pestanaDeLaUrl', () => {
  it('la que pide la URL, o la primera si no existe', () => {
    expect(pestanaDeLaUrl('cobro', ['resumen', 'cobro'] as const)).toBe('cobro');
    expect(pestanaDeLaUrl('otra', ['resumen', 'cobro'] as const)).toBe('resumen');
    expect(pestanaDeLaUrl(null, ['resumen', 'cobro'] as const)).toBe('resumen');
  });
});

describe('PestanasDeLaFicha', () => {
  it('sin pestaña en la URL abre la primera; todas quedan montadas', async () => {
    await montar();
    expect(visible('resumen')).toBe(true);
    expect(visible('cobro')).toBe(false);
    // Montadas aunque no se vean: sus bloques cargan y avisan como antes.
    expect($('bloque-cobro')).not.toBeNull();
    expect($('bloque-historial')).not.toBeNull();
    expect($('pestana-cobro')?.textContent).toContain('3');
  });

  it('abre la pestaña que dice la URL', async () => {
    nav.query = 'pestana=historial';
    await montar();
    expect(visible('historial')).toBe(true);
    expect(visible('resumen')).toBe(false);
  });

  it('llegar con un #ancla de otra pestaña abre esa pestaña', async () => {
    window.history.replaceState(null, '', '/panel/inmobiliaria/contratos/k1#fotos');
    await montar();
    expect(nav.replace).toHaveBeenCalledWith('/panel/inmobiliaria/contratos/k1?pestana=historial', { scroll: false });
  });

  it('elegir una pestaña la escribe en la URL (y la primera la limpia)', async () => {
    nav.query = 'por=inmueble';
    await montar();
    const cobro = $('pestana-cobro') as HTMLElement;
    await act(async () => {
      cobro.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
      cobro.click();
    });
    expect(nav.replace).toHaveBeenCalledWith('/panel/inmobiliaria/contratos/k1?por=inmueble&pestana=cobro', { scroll: false });
  });

  it('cada pestaña va en una sola línea (a 390 px «Cobro y reglas» se partía)', async () => {
    await montar();
    const cobro = $('pestana-cobro') as HTMLElement;
    expect(cobro.className).toContain('whitespace-nowrap');
    expect(cobro.className).toContain('shrink-0');
  });

  it('sin pestañas fuera de la vista no pinta el degradado de «hay más»', async () => {
    await montar();
    // En el entorno de pruebas todo cabe (anchos en 0): nada que avisar.
    expect($('hay-mas-pestanas')).toBeNull();
  });
});
