/**
 * SmoothScroll.test.tsx — la rueda tiene que llegar a los contenedores internos.
 *
 * 🔴 Nico, 2026-09-12, en el selector de cuenta del paso 5 con 2.790 cuentas:
 * «dentro del listado no deja hacer scroll, revisa que el resto también
 * funcionen bien».
 *
 * Lenis escucha la rueda en `window` y la consume para mover la página. Sin
 * `allowNestedScroll`, una lista con `overflow-y: auto` se queda quieta — y
 * eso valía para TODO combobox, select y menú del producto, porque los
 * primitivos viven en `@leasefy/cadence` y ahí no se puede poner un
 * `data-lenis-prevent` a mano.
 *
 * La prueba es sobre las OPCIONES con las que se construye Lenis, no sobre el
 * comportamiento de la rueda: simular scroll anidado exigiría un motor de
 * layout real (happy-dom devuelve `scrollHeight: 0` para todo), y una prueba
 * que monta eso a mano probaría el mock. Lo que sí se puede fijar, y es lo que
 * se rompería en una limpieza distraída, es que la opción esté prendida.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { opciones, LenisMock } = vi.hoisted(() => {
  const opciones: Record<string, unknown>[] = [];
  class LenisMock {
    constructor(opts: Record<string, unknown>) {
      opciones.push(opts);
    }
    raf() {}
    stop() {}
    start() {}
    destroy() {}
  }
  return { opciones, LenisMock };
});

vi.mock('lenis', () => ({ default: LenisMock }));
vi.mock('next/navigation', () => ({ usePathname: () => '/panel' }));

import { SmoothScroll } from './SmoothScroll';

let container: HTMLDivElement;
let root: Root | null = null;

beforeEach(() => {
  opciones.length = 0;
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
});

async function montar() {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(
      <SmoothScroll>
        <div data-testid="hijo" />
      </SmoothScroll>,
    );
  });
}

describe('<SmoothScroll>', () => {
  it('🔴 deja que los contenedores con scroll propio se queden con la rueda', async () => {
    await montar();

    expect(opciones).toHaveLength(1);
    expect(opciones[0].allowNestedScroll).toBe(true);
  });

  /*
   * El resto de las opciones no es decoración: `gestureOrientation: 'vertical'`
   * es lo que hace que `allowNestedScroll` mire el overflow VERTICAL del nodo,
   * y `smoothWheel` es lo que hace que la rueda pase por Lenis en primer lugar.
   */
  it('sigue siendo scroll suave vertical: es de lo que cuelga la regla de arriba', async () => {
    await montar();

    expect(opciones[0].smoothWheel).toBe(true);
    expect(opciones[0].gestureOrientation).toBe('vertical');
  });
});
