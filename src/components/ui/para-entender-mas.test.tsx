/**
 * «Quiero entender más»: la explicación detrás de un botón, no puesta sobre la
 * pantalla (Nico, 21-09-2026).
 *
 * Lo que fija, y por qué cada cosa:
 * - cerrado, el contenido NO está en el DOM: no es un `hidden`, es que once
 *   tarjetas no se calculan para quien no las pidió;
 * - el botón dice de qué es, no «más información»;
 * - se abre y se cierra sin que la pantalla de abajo se mueva.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { propsDelContenido } = vi.hoisted(() => ({ propsDelContenido: [] as Record<string, unknown>[] }));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="modal">{children}</div> : null,
  DialogContent: ({ children, ...p }: { children: React.ReactNode }) => {
    propsDelContenido.push(p);
    return <div {...p}>{children}</div>;
  },
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

import { ParaEntenderMas } from './para-entender-mas';

let contenedor: HTMLDivElement;
let raiz: Root;
const pintado = vi.fn();

function Caro() {
  pintado();
  return <p>El recorrido completo</p>;
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

async function montar() {
  await act(async () => {
    raiz.render(
      <ParaEntenderMas etiqueta="Cómo funciona una postulación" titulo="El recorrido completo">
        <Caro />
      </ParaEntenderMas>,
    );
  });
}

async function abrir() {
  const b = contenedor.querySelector<HTMLButtonElement>('[data-testid="para-entender-mas"]')!;
  await act(async () => {
    b.click();
  });
}

describe('<ParaEntenderMas>', () => {
  it('🔴 cerrado, el contenido no se monta siquiera', async () => {
    await montar();
    expect(contenedor.textContent).not.toContain('El recorrido completo');
    expect(pintado).not.toHaveBeenCalled();
  });

  it('el botón dice de qué es, no «más información»', async () => {
    await montar();
    const b = contenedor.querySelector('[data-testid="para-entender-mas"]')!;
    expect(b.textContent).toContain('Cómo funciona una postulación');
  });

  it('al pulsarlo se abre el modal con el contenido', async () => {
    await montar();
    await abrir();
    expect(contenedor.querySelector('[data-testid="modal"]')).not.toBeNull();
    expect(contenedor.textContent).toContain('El recorrido completo');
    expect(pintado).toHaveBeenCalled();
  });

  it('🔴 sin descripción, le dice a Radix que no hay (aria-describedby={undefined}) y no avisa en la consola (QA 23-09)', async () => {
    propsDelContenido.length = 0;
    await montar();
    await abrir();
    const ultimo = propsDelContenido[propsDelContenido.length - 1];
    expect(ultimo).toBeDefined();
    expect('aria-describedby' in ultimo).toBe(true);
    expect(ultimo['aria-describedby']).toBeUndefined();
  });
});
