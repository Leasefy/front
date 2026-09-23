/**
 * 🔴 LO PEOR QUE PUEDE HACER LA PÁGINA DE VERIFICACIÓN: decir que un documento
 * verdadero es falso porque se cayó la red. Alguien no le arrienda a alguien
 * por eso.
 *
 * Va en su propio archivo y dobla `fetch` —no el servicio— por dos razones:
 * porque así se ejercita también `verificarEstudio`, y porque con el servicio
 * doblado con `vi.fn` el espía de Vitest engancha un manejador de error a lo
 * que devuelve el doble y cualquier rechazo queda marcado como no manejado,
 * tumbando la prueba con la pantalla correctamente pintada.
 */

import { describe, expect, it, afterEach, vi } from 'vitest';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/navigation', () => ({ useParams: () => ({ code: 'cod-1' }) }));

import VerificarPage from './page';

let host: HTMLDivElement | null = null;
let root: Root | null = null;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  host = null;
  root = null;
  vi.unstubAllGlobals();
});

async function montar() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => { root!.render(<VerificarPage />); });
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
}

const texto = () => document.body.textContent ?? '';

describe('cuando no se pudo preguntar', () => {
  it('🔴 NO dice que el documento sea falso', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false, status: 503 } as Response)),
    );
    await montar();
    expect(texto()).toContain('No pudimos comprobarlo ahora');
    expect(texto()).toContain('no quiere decir que el documento sea falso');
    expect(texto()).not.toContain('Código no encontrado');
    expect(texto()).not.toContain('Estudio verificado');
  });

  it('🔴 «Intentar de nuevo» vuelve a preguntar de verdad', async () => {
    const llamadas = vi.fn(() => Promise.resolve({ ok: false, status: 503 } as Response));
    vi.stubGlobal('fetch', llamadas);
    await montar();
    expect(llamadas).toHaveBeenCalledTimes(1);

    const boton = [...document.querySelectorAll('button')].find(
      (b) => b.textContent === 'Intentar de nuevo',
    )!;
    await act(async () => {
      boton.click();
    });
    await act(async () => { await Promise.resolve(); });
    expect(llamadas).toHaveBeenCalledTimes(2);
  });
});
