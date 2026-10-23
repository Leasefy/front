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

describe('Giros a propietarios — lo hecho en el mes y lo que sigue (ronda 19)', () => {
  it('el paso hecho lleva el chulo en vez del número; el que va en curso, un punto', () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() =>
      root!.render(
        <PasosDeLosGiros paso="banco" estados={{ liquidar: 'hecho', revisar: 'hecho', banco: 'hecho', pagado: 'en_curso' }} />,
      ),
    );
    expect(host.querySelector('[data-testid="paso-hecho-liquidar"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="paso-hecho-banco"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="paso-en-curso-pagado"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="paso-de-los-giros-liquidar"]')?.textContent).toContain('(hecho este mes)');
  });

  it('sin estados, ningún paso dice que está hecho', () => {
    montar('liquidar');
    expect(host!.querySelector('[data-testid^="paso-hecho-"]')).toBeNull();
  });

  it('al pie, el siguiente paso con su botón; en el último no hay nada', async () => {
    const { SiguientePasoDeLosGiros } = await import('./PasosDeLosGiros');
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root!.render(<SiguientePasoDeLosGiros paso="liquidar" />));
    const ir = host.querySelector('[data-testid="ir-al-paso-revisar"]');
    expect(ir?.getAttribute('href')).toBe('/panel/inmobiliaria/pagos/dispersiones');
    expect(ir?.textContent).toBe('Ir a Revisar y aprobar');
    act(() => root!.render(<SiguientePasoDeLosGiros paso="pagado" />));
    expect(host.querySelector('[data-testid="siguiente-paso-de-los-giros"]')).toBeNull();
  });
});

describe('Giros a propietarios — con el mes girado entero (ronda 21)', () => {
  it('el pie no manda al siguiente paso: dice que el mes está listo', async () => {
    const { SiguientePasoDeLosGiros } = await import('./PasosDeLosGiros');
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() =>
      root!.render(
        <SiguientePasoDeLosGiros paso="banco" estados={{ liquidar: 'hecho', revisar: 'hecho', banco: 'hecho', pagado: 'hecho' }} />,
      ),
    );
    expect(host.querySelector('[data-testid="giros-del-mes-listos"]')).not.toBeNull();
    expect(host.querySelector('[data-testid^="ir-al-paso-"]')).toBeNull();
  });
});
