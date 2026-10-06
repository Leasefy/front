/**
 * «Quiero entender más»: la explicación detrás de un botón, no puesta sobre la
 * pantalla (Nico, 21-09-2026). Desde el 05-10-2026 el botón abre un CAJÓN
 * lateral, no un modal (Nico: «llévalas al botón que al dar clic abre drawer y
 * explica mejor cada cosa y más bonito»).
 *
 * Lo que fija, y por qué cada cosa:
 * - cerrado, el contenido NO está en el DOM: no es un `hidden`, es que once
 *   tarjetas no se calculan para quien no las pidió;
 * - el botón dice de qué es, no «más información»;
 * - se abre en el cajón de la casa (`Cajon`, el Sheet flotante de Cadence) con
 *   el título y la descripción en su cabecera;
 * - se cierra con Esc y el foco VUELVE al botón que lo abrió;
 * - cerrado otra vez, el contenido se va del DOM.
 *
 * Usa el cajón de verdad (Radix con portal en `document.body`), no un doble:
 * lo que importa acá es justamente el foco y el montaje, que un doble no prueba.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { ParaEntenderMas } from './para-entender-mas';

let contenedor: HTMLDivElement;
let raiz: Root;
const pintado = vi.fn();

function Caro() {
  pintado();
  return <p data-testid="lo-caro">El recorrido completo</p>;
}

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  pintado.mockReset();
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

async function montar(props: Partial<React.ComponentProps<typeof ParaEntenderMas>> = {}) {
  await act(async () => {
    raiz.render(
      <ParaEntenderMas etiqueta="Cómo funciona una postulación" titulo="El recorrido completo" {...props}>
        <Caro />
      </ParaEntenderMas>,
    );
  });
}

const boton = () => contenedor.querySelector<HTMLButtonElement>('[data-testid="para-entender-mas"]')!;
const cajon = () => document.body.querySelector<HTMLElement>('[data-testid="para-entender-mas-contenido"]');

async function esperar(ms: number) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

async function abrir() {
  await act(async () => {
    boton().click();
  });
  await esperar(50);
}

describe('<ParaEntenderMas>', () => {
  it('🔴 cerrado, el contenido no se monta siquiera', async () => {
    await montar();
    expect(document.body.textContent).not.toContain('El recorrido completo');
    expect(pintado).not.toHaveBeenCalled();
    expect(cajon()).toBeNull();
  });

  it('el botón dice de qué es, no «más información»', async () => {
    await montar();
    expect(boton().textContent).toContain('Cómo funciona una postulación');
    expect(boton().getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('al pulsarlo se abre el CAJÓN (no un modal) con el título y el contenido', async () => {
    await montar({ descripcion: 'Once pasos, de la postulación a la firma.' });
    await abrir();
    const c = cajon();
    expect(c).not.toBeNull();
    // El cajón de la casa: el Sheet flotante de Cadence, desde la derecha.
    expect(c!.getAttribute('data-sheet-side')).toBe('right');
    expect(c!.getAttribute('role')).toBe('dialog');
    expect(c!.textContent).toContain('El recorrido completo');
    expect(c!.textContent).toContain('Once pasos, de la postulación a la firma.');
    expect(c!.querySelector('[data-testid="lo-caro"]')).not.toBeNull();
    expect(pintado).toHaveBeenCalled();
    expect(boton().getAttribute('aria-expanded')).toBe('true');
  });

  it('🔴 el cuerpo que hace scroll se alcanza con el teclado (axe, scrollable-region-focusable)', async () => {
    await montar();
    await abrir();
    const cuerpo = cajon()!.querySelector<HTMLElement>('[data-sheet-band="body"]');
    expect(cuerpo).not.toBeNull();
    expect(cuerpo!.getAttribute('tabindex')).toBe('0');
    expect(cuerpo!.getAttribute('role')).toBe('region');
    expect(cuerpo!.getAttribute('aria-label')).toBe('El recorrido completo');
    expect(cuerpo!.querySelector('[data-testid="lo-caro"]')).not.toBeNull();
  });

  it('el ancho sigue al prop: «normal» es el cajón mediano, «ancho» el grande', async () => {
    await montar();
    await abrir();
    expect(cajon()!.className).toContain('sm:max-w-[560px]');
    act(() => raiz.unmount());
    raiz = createRoot(contenedor);
    await montar({ ancho: 'ancho' });
    await abrir();
    expect(cajon()!.className).toContain('sm:max-w-[880px]');
  });

  it('🔴 Esc lo cierra, el contenido se va y el foco vuelve al botón', async () => {
    await montar();
    await abrir();
    expect(cajon()).not.toBeNull();
    expect(document.activeElement).not.toBe(boton());
    await act(async () => {
      document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    await esperar(600);
    expect(cajon()).toBeNull();
    expect(document.body.textContent).not.toContain('El recorrido completo');
    expect(document.activeElement).toBe(boton());
    expect(boton().getAttribute('aria-expanded')).toBe('false');
  });

  it('la ✕ del cajón también lo cierra y devuelve el foco', async () => {
    await montar();
    await abrir();
    const aspa = cajon()!.querySelector<HTMLButtonElement>('[data-testid="dialog-close"]');
    expect(aspa).not.toBeNull();
    await act(async () => {
      aspa!.click();
    });
    await esperar(600);
    expect(cajon()).toBeNull();
    expect(document.activeElement).toBe(boton());
  });

  it('la variante secundaria es la del encabezado (donde iría el botón de acción)', async () => {
    await montar({ variante: 'secundario' });
    const fantasma = boton().className;
    act(() => raiz.unmount());
    raiz = createRoot(contenedor);
    await montar();
    expect(boton().className).not.toBe(fantasma);
  });
});
