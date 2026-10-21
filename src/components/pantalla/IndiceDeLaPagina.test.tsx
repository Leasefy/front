/**
 * «En esta sección» (GLOW UP, 21-10-2026): el índice de una página larga.
 *
 * Lo que fija: arma una entrada por cada bloque con `id` + `data-indice` dentro de la raíz, en el
 * orden de la página; con menos de tres bloques no se pinta (no hace falta un índice); y tocar
 * una entrada la marca como el lugar donde vas.
 */
import * as React from 'react';
import { act, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IndiceDeLaPagina } from './IndiceDeLaPagina';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

function Pagina({ bloques }: { bloques: string[] }) {
  const raiz = useRef<HTMLDivElement>(null);
  return (
    <div ref={raiz}>
      <IndiceDeLaPagina raiz={raiz} />
      {bloques.map((b) => (
        <section key={b} id={`b-${b}`} data-indice={b}>
          {b}
        </section>
      ))}
      <section id="sin-indice">no entra</section>
    </div>
  );
}

async function pintar(bloques: string[]) {
  await act(async () => {
    root.render(<Pagina bloques={bloques} />);
  });
}

describe('IndiceDeLaPagina', () => {
  it('una entrada por bloque marcado, en el orden de la página', async () => {
    await pintar(['Contacto', 'Cobros y mora', 'Impuestos', 'Renovación']);
    const enlaces = Array.from(host.querySelectorAll('[data-testid="indice-de-la-pagina"] a'));
    expect(enlaces.map((a) => a.textContent)).toEqual(['Contacto', 'Cobros y mora', 'Impuestos', 'Renovación']);
    expect(enlaces[1].getAttribute('href')).toBe('#b-Cobros y mora');
    expect(host.textContent).toContain('En esta sección');
  });

  it('con menos de tres bloques no se pinta', async () => {
    await pintar(['Contacto', 'Impuestos']);
    expect(host.querySelector('[data-testid="indice-de-la-pagina"]')).toBeNull();
  });

  it('tocar una entrada lleva al bloque y la marca como el lugar donde vas', async () => {
    await pintar(['Contacto', 'Cobros y mora', 'Impuestos']);
    const impuestos = Array.from(host.querySelectorAll<HTMLAnchorElement>('[data-testid="indice-de-la-pagina"] a')).find(
      (a) => a.textContent === 'Impuestos',
    )!;
    await act(async () => {
      impuestos.click();
    });
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(impuestos.getAttribute('aria-current')).toBe('location');
  });
});
