/**
 * FotosDesdeEnlace — la tercera forma de traer fotos al inmueble.
 *
 * 🔴 Nico, 2026-09-12. Lo que se fija: que entrega los archivos por el MISMO
 * camino que la zona de arrastre (`onArchivos`), y que lo que no entró se
 * dice — un corte en silencio es cómo alguien da por subidas unas fotos que
 * no están.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { fotosDesdeEnlace, toastMock } = vi.hoisted(() => ({
  fotosDesdeEnlace: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/inmuebles/fotos-desde-enlace', () => ({ fotosDesdeEnlace }));
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }));

import { FotosDesdeEnlace } from './FotosDesdeEnlace';

const archivo = (n: string) => new File([new Uint8Array([1])], n, { type: 'image/jpeg' });

let container: HTMLDivElement;
let root: Root | null = null;
const q = (t: string) => container.querySelector(`[data-testid="${t}"]`) as HTMLElement | null;

async function pintar(cupo = 40) {
  const onArchivos = vi.fn();
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<FotosDesdeEnlace cupo={cupo} onArchivos={onArchivos} />);
  });
  return onArchivos;
}

async function escribir(valor: string) {
  const input = q('enlace-del-aviso') as HTMLInputElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function traer() {
  await act(async () => {
    (q('traer-fotos') as HTMLButtonElement).click();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  fotosDesdeEnlace.mockReset();
  Object.values(toastMock).forEach((f) => f.mockClear());
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = null;
  }
  container?.remove();
});

describe('<FotosDesdeEnlace>', () => {
  it('🔴 entrega los archivos por el mismo camino que la zona de arrastre', async () => {
    fotosDesdeEnlace.mockResolvedValue({
      ok: true,
      archivos: [archivo('a.jpg'), archivo('b.jpg')],
      encontradas: 2,
      fallidas: 0,
      fueraDeCupo: 0,
    });
    const onArchivos = await pintar();

    await escribir('https://www.fincaraiz.com.co/apartamento/1');
    await traer();

    expect(fotosDesdeEnlace).toHaveBeenCalledWith(
      'https://www.fincaraiz.com.co/apartamento/1',
      40,
      expect.any(Function),
    );
    expect(onArchivos).toHaveBeenCalledTimes(1);
    expect(onArchivos.mock.calls[0][0]).toHaveLength(2);
    // Y el campo queda limpio: la siguiente es otro aviso, no el mismo.
    expect((q('enlace-del-aviso') as HTMLInputElement).value).toBe('');
  });

  it('🔴 dice lo que NO entró: lo que falló y lo que no cabe', async () => {
    fotosDesdeEnlace.mockResolvedValue({
      ok: true,
      archivos: [archivo('a.jpg')],
      encontradas: 18,
      fallidas: 2,
      fueraDeCupo: 13,
    });
    await pintar(5);

    await escribir('https://x/1');
    await traer();

    const [, opciones] = toastMock.success.mock.calls[0];
    expect(opciones.description).toContain('2 no se pudieron bajar');
    expect(opciones.description).toContain('13 no caben');
  });

  it('un aviso que no se pudo leer muestra su motivo y NO entrega nada', async () => {
    fotosDesdeEnlace.mockResolvedValue({
      ok: false,
      motivo: 'bloqueado',
      mensaje: 'El portal no dejó entrar.',
    });
    const onArchivos = await pintar();

    await escribir('https://x/1');
    await traer();

    expect(q('error-fotos-enlace')?.textContent).toBe('El portal no dejó entrar.');
    expect(onArchivos).not.toHaveBeenCalled();
  });

  it('algo que no es una dirección se ataja antes de pedir nada', async () => {
    await pintar();

    await escribir('fincaraiz apartamento bonito');
    await traer();

    expect(fotosDesdeEnlace).not.toHaveBeenCalled();
    expect(q('error-fotos-enlace')?.textContent).toContain('empezando por https://');
  });

  /* Sin cupo no se ofrece: un campo que no puede hacer nada es peor que
     ninguno. */
  it('sin cupo no se dibuja', async () => {
    await pintar(0);

    expect(q('fotos-desde-enlace')).toBeNull();
  });
});
