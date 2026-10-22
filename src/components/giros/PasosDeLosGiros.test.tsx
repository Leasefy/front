import * as React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { PasosDeLosGiros, PASOS_DE_LOS_GIROS } from './PasosDeLosGiros';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | null = null;
let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
});
function montar(paso: Parameters<typeof PasosDeLosGiros>[0]['paso']) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(<PasosDeLosGiros paso={paso} />));
}

describe('Giros a propietarios — los cuatro pasos (Nico, 22-10)', () => {
  it('van en el orden del trabajo: liquidar, revisar, el archivo del banco y marcar pagado', () => {
    expect(PASOS_DE_LOS_GIROS.map((p) => p.id)).toEqual(['liquidar', 'revisar', 'banco', 'pagado']);
  });

  it('cada paso lleva a su pantalla de siempre y el actual se marca', () => {
    montar('revisar');
    const enlaces = Array.from(host!.querySelectorAll('a'));
    expect(enlaces.map((a) => a.getAttribute('href'))).toEqual([
      '/panel/inmobiliaria/pagos/liquidaciones',
      '/panel/inmobiliaria/pagos/dispersiones',
      '/panel/inmobiliaria/pagos/dispersiones/lotes',
      '/panel/inmobiliaria/pagos/dispersiones/lotes?paso=pagado',
    ]);
    const actual = host!.querySelector('[aria-current="step"]');
    expect(actual?.getAttribute('data-testid')).toBe('paso-de-los-giros-revisar');
  });
});
