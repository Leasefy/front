/**
 * El botón compartido se mueve con framer y no lleva sombra de caída (Nico, 23-10-2026).
 *
 * Lo que NO puede cambiar al ponerle movimiento: el HTML del servidor (sin `tabindex` ni
 * `style` nuevos, que serían errores de hidratación), los manejadores del puntero de quien lo
 * usa, `asChild` y el filo interior de Cadence (`inset`), que no es una sombra.
 */
import * as React from 'react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createRoot, type Root } from 'react-dom/client';
import { Button, sinSombraDeCaida } from './button';
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;

afterEach(() => {
  if (root) act(() => root!.unmount());
  host?.remove();
  host = null;
  root = null;
});

function render(el: React.ReactElement) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(el));
  return host;
}

function puntero(el: Element, tipo: string) {
  const Evento = (globalThis as { PointerEvent?: typeof MouseEvent }).PointerEvent ?? MouseEvent;
  act(() => {
    el.dispatchEvent(new Evento(tipo, { bubbles: true, cancelable: true, pointerType: 'mouse' } as MouseEventInit));
  });
}

describe('Button — movimiento y sin sombras de caída', () => {
  it('el HTML del servidor no trae tabindex ni style: el movimiento llega con el puntero', () => {
    const html = renderToString(<Button>Guardar</Button>);
    expect(html).not.toContain('tabindex');
    expect(html).not.toContain('style=');
  });

  it('quita las sombras de caída que llegan por className y deja el resto', () => {
    expect(
      sinSombraDeCaida(
        'h-12 w-full shadow-[0_12px_32px_-12px_rgba(26,64,255,0.65)] hover:shadow-[0_16px_40px_-12px_rgba(26,64,255,0.7)] shadow-lg drop-shadow-md text-[14px]',
      ),
    ).toBe('h-12 w-full text-[14px]');
    expect(sinSombraDeCaida('shadow-none shadow-[inset_0_0_0_1px_var(--border-faint)]')).toBe(
      'shadow-none shadow-[inset_0_0_0_1px_var(--border-faint)]',
    );
    expect(sinSombraDeCaida(undefined)).toBeUndefined();
  });

  it('en el botón pintado no queda la sombra que se le pasó', () => {
    const boton = render(<Button className="shadow-lg px-7">Publicar</Button>).querySelector('button')!;
    expect(boton.className).not.toMatch(/(?:^|\s)shadow-lg(?:\s|$)/);
    expect(boton.className).toContain('px-7');
  });

  it('la presión de CSS y la transición de transform se apagan (las hace el resorte)', () => {
    const clases = render(<Button>Aprobar</Button>).querySelector('button')!.className;
    expect(clases).not.toContain('active:scale-[0.97]');
    expect(clases).toContain('active:scale-100');
    expect(clases).not.toMatch(/transition-\[[^\]]*transform/);
  });

  it('los manejadores del puntero de quien lo usa se siguen llamando', () => {
    const alEntrar = vi.fn();
    const alBajar = vi.fn();
    const alSubir = vi.fn();
    const alSalir = vi.fn();
    const alClic = vi.fn();
    const boton = render(
      <Button onPointerEnter={alEntrar} onPointerDown={alBajar} onPointerUp={alSubir} onPointerLeave={alSalir} onClick={alClic}>
        Registrar
      </Button>,
    ).querySelector('button')!;
    // React arma onPointerEnter/Leave con pointerover/pointerout.
    puntero(boton, 'pointerover');
    puntero(boton, 'pointerdown');
    puntero(boton, 'pointerup');
    act(() => boton.click());
    puntero(boton, 'pointerout');
    expect(alEntrar).toHaveBeenCalledTimes(1);
    expect(alBajar).toHaveBeenCalledTimes(1);
    expect(alSubir).toHaveBeenCalledTimes(1);
    expect(alClic).toHaveBeenCalledTimes(1);
    expect(alSalir).toHaveBeenCalledTimes(1);
  });

  it('con asChild el enlace recibe el ref y los eventos, sin tabindex', () => {
    const ref = { current: null as HTMLButtonElement | null };
    const enlace = render(
      <Button asChild ref={ref}>
        <a href="/panel">Ir al panel</a>
      </Button>,
    ).querySelector('a')!;
    expect(ref.current).toBe(enlace);
    expect(enlace.getAttribute('tabindex')).toBeNull();
    puntero(enlace, 'pointerdown');
    puntero(enlace, 'pointerup');
  });
});
