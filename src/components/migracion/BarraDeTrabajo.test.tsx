/**
 * BarraDeTrabajo.test.tsx — la barra que comparten las esperas largas.
 *
 * 🔴 Nico la pidió tres veces en dos días: activar inmuebles, activar
 * contratos, y el plan de cuentas con los registros contables. Las tres
 * necesitan lo mismo: en qué va, cuánto falta y cómo salir.
 */

import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { BarraDeTrabajo } from './BarraDeTrabajo';

let container: HTMLDivElement;
let root: Root | null = null;
const q = (t: string) => container.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;

async function pintar(props: Partial<React.ComponentProps<typeof BarraDeTrabajo>> = {}) {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(
      <BarraDeTrabajo testid="x" titulo="Creando" hechas={0} total={100} {...props} />,
    );
  });
  return async (nuevas: Partial<React.ComponentProps<typeof BarraDeTrabajo>>) => {
    await act(async () => {
      root!.render(
        <BarraDeTrabajo testid="x" titulo="Creando" hechas={0} total={100} {...props} {...nuevas} />,
      );
    });
  };
}

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
  vi.restoreAllMocks();
});

describe('<BarraDeTrabajo>', () => {
  it('muestra el porcentaje y el conteo', async () => {
    await pintar({ hechas: 25, total: 100 });
    expect(q('x-porcentaje')!.textContent).toBe('25%');
    expect(q('x-progreso')!.textContent).toContain('25 de 100');
  });

  it('sin total no divide por cero', async () => {
    await pintar({ hechas: 0, total: 0 });
    expect(q('x-porcentaje')!.textContent).toBe('0%');
  });

  it('nunca pasa del 100 %, aunque el servidor mande más hechas que total', async () => {
    await pintar({ hechas: 120, total: 100 });
    expect(q('x-porcentaje')!.textContent).toBe('100%');
  });

  it('sin `onDetener` no dibuja el botón: no se ofrece una salida que no existe', async () => {
    await pintar({ hechas: 10 });
    expect(q('x-detener')).toBeNull();
  });

  it('con `deteniendo` el botón lo dice y queda apagado', async () => {
    await pintar({ hechas: 10, onDetener: vi.fn(), deteniendo: true });
    const btn = q('x-detener') as HTMLButtonElement;
    expect(btn.textContent).toContain('Deteniendo');
    expect(btn.disabled).toBe(true);
  });

  /*
   * 🔴 La estimación sale de una VENTANA, no del promedio desde el arranque:
   * el ritmo cambia dentro de la misma corrida y el promedio promete de menos
   * justo al final. Con una sola medición todavía no se sabe nada, y no se
   * inventa un número.
   */
  it('con una sola medición no promete ningún tiempo', async () => {
    await pintar({ hechas: 10, total: 100 });
    expect(q('x-progreso')!.textContent).not.toContain('faltan');
  });

  it('con dos mediciones ya estima, a partir del ritmo medido', async () => {
    let t = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => t);
    const repintar = await pintar({ hechas: 10, total: 100 });
    // 10 filas en 60 s ⇒ 6 s por fila; quedan 80 ⇒ 8 min.
    t += 60_000;
    await repintar({ hechas: 20, total: 100 });
    expect(q('x-progreso')!.textContent).toContain('faltan unos 8 min');
  });

  it('sin avance medible entre dos mediciones se calla', async () => {
    let t = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => t);
    const repintar = await pintar({ hechas: 10, total: 100 });
    t += 60_000;
    await repintar({ hechas: 10, total: 100 });
    expect(q('x-progreso')!.textContent).not.toContain('faltan');
  });
});
