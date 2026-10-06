import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import {
  PAUSA_COMPLETO_MS,
  pausaAlBorrar,
  pausaAlEscribir,
  useEjemploQueSeEscribe,
  type EjemploQueSeEscribe,
} from './use-ejemplo-que-se-escribe';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const EJEMPLOS = ['¿Cuál es mi ocupación hoy?', '¿Qué giros quedan pendientes?'];

describe('el ritmo', () => {
  it('arranca más despacio y los espacios van más rápido', () => {
    expect(pausaAlEscribir('a', 1, 0)).toBeCloseTo(32 * 1.7);
    expect(pausaAlEscribir('a', 10, 0)).toBe(32);
    expect(pausaAlEscribir(' ', 10, 0.9)).toBe(24);
  });

  it('borra acelerando: la última letra se va más rápido que la primera', () => {
    expect(pausaAlBorrar(20, 20)).toBe(9);
    expect(pausaAlBorrar(0, 20)).toBeCloseTo(43);
  });
});

describe('useEjemploQueSeEscribe', () => {
  let container: HTMLDivElement;
  let root: Root;
  let ultimo: EjemploQueSeEscribe | null = null;

  function Prueba(props: { activo: boolean; reducido: boolean }) {
    ultimo = useEjemploQueSeEscribe(EJEMPLOS, props);
    return null;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    vi.useRealTimers();
  });

  it('con «reducir movimiento», el primer ejemplo quieto', () => {
    act(() => root.render(<Prueba activo reducido />));
    act(() => vi.advanceTimersByTime(20_000));
    expect(ultimo).toEqual({ texto: EJEMPLOS[0], completo: EJEMPLOS[0], escribiendo: false });
  });

  it('escribe letra por letra, se queda quieto y pasa al siguiente', async () => {
    act(() => root.render(<Prueba activo reducido={false} />));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(ultimo!.escribiendo).toBe(true);
    expect(ultimo!.texto.length).toBeGreaterThan(0);
    expect(EJEMPLOS[0].startsWith(ultimo!.texto)).toBe(true);
    expect(ultimo!.texto.length).toBeLessThan(EJEMPLOS[0].length);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(ultimo!.texto).toBe(EJEMPLOS[0]);
    expect(ultimo!.escribiendo).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PAUSA_COMPLETO_MS + 3000);
    });
    expect(ultimo!.completo).toBe(EJEMPLOS[1]);
  });

  it('inactivo (la persona enfocó o escribió), se congela en el ejemplo completo', async () => {
    act(() => root.render(<Prueba activo reducido={false} />));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    act(() => root.render(<Prueba activo={false} reducido={false} />));
    expect(ultimo).toEqual({ texto: EJEMPLOS[0], completo: EJEMPLOS[0], escribiendo: false });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(ultimo!.texto).toBe(EJEMPLOS[0]);
  });
});
