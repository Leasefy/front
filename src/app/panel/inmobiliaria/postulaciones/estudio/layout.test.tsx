/**
 * La puerta de Evaluación de candidatos mientras está oculta (Nico,
 * 2026-09-08): a quien entre por la URL lo devuelve a Postulaciones y no le
 * muestra nada de la sección mientras tanto. Las páginas de abajo siguen
 * vivas; lo cuida `arquitectura-del-panel.test.ts`.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

import EstudioOcultoLayout from './layout';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  replaceMock.mockClear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('postulaciones/estudio/layout — la sección está oculta', () => {
  it('devuelve a Postulaciones y no pinta la sección mientras tanto', async () => {
    await act(async () => {
      root.render(
        <EstudioOcultoLayout>
          <p data-testid="seccion">Evaluación de candidatos</p>
        </EstudioOcultoLayout>,
      );
    });
    expect(replaceMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith('/panel/inmobiliaria/postulaciones');
    expect(container.querySelector('[data-testid="seccion"]')).toBeNull();
    // Algo se ve mientras tanto (el spinner), no una pantalla en blanco.
    expect(container.firstElementChild).not.toBeNull();
    expect(container.textContent).not.toContain('Evaluación de candidatos');
  });
});
