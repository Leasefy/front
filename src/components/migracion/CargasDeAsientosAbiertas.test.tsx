/**
 * CargasDeAsientosAbiertas.test.tsx — «¿si cierro el navegador a mitad, pierdo
 * el trabajo?». No: la carga queda ABIERTA en el back y esta franja la dice.
 *
 * T-0125. Lo que se congela:
 *  1. Una carga abierta se ve con su avance y con DOS salidas: continuarla o
 *     descartarla. Sin la segunda, el paso `contables` del muro queda en
 *     «pendiente» sin acción.
 *  2. Descartar dice la verdad: no borra ningún asiento.
 *  3. Leer la lista nunca bloquea: un fallo se dice, un 403 (rol sin acceso) calla.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import { ApiError } from '@/lib/api/client';
import type { CargaAbierta } from '@/lib/api/contabilidad.service';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { api } = vi.hoisted(() => ({
  api: { migracion: { cargas: vi.fn(), descartarCarga: vi.fn() } },
}));

vi.mock('@/lib/api/contabilidad.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contabilidad.service')>(
    '@/lib/api/contabilidad.service',
  );
  return { ...actual, contabilidadApi: { ...actual.contabilidadApi, ...api } };
});

import { CargasDeAsientosAbiertas } from './CargasDeAsientosAbiertas';

const CARGA: CargaAbierta = {
  lote: 'asientos-2026-09-29-0900',
  esperados: 116_262,
  procesados: 10_000,
  creadaAt: '2026-09-29T09:00:00Z',
  actualizadaAt: '2026-09-29T09:20:00Z',
};

let container: HTMLDivElement;
let root: Root | null = null;

async function pintar(props: Partial<React.ComponentProps<typeof CargasDeAsientosAbiertas>> = {}) {
  container = document.createElement('div');
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(<CargasDeAsientosAbiertas onContinuar={() => undefined} {...props} />);
  });
  await act(async () => {});
}

const q = (testid: string) => container.querySelector(`[data-testid="${testid}"]`);

async function click(el: Element | null) {
  if (!el) throw new Error('no está el elemento a clickear');
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await act(async () => {});
}

beforeEach(() => {
  api.migracion.cargas.mockResolvedValue([CARGA]);
  api.migracion.descartarCarga.mockResolvedValue({ lote: CARGA.lote, estado: 'DESCARTADA' });
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container?.remove();
  vi.clearAllMocks();
});

describe('la lista de cargas sin terminar', () => {
  it('muestra cada carga con su avance y las dos salidas: continuar y descartar', async () => {
    await pintar();

    const franja = q('cargas-de-asientos');
    expect(franja).not.toBeNull();
    const fila = q(`carga-${CARGA.lote}`);
    expect(fila).not.toBeNull();
    const texto = fila!.textContent ?? '';
    expect(texto).toContain(CARGA.lote);
    expect(texto).toContain('10.000 de 116.262');
    expect(q(`continuar-carga-${CARGA.lote}`)).not.toBeNull();
    expect(q(`descartar-carga-${CARGA.lote}`)).not.toBeNull();
    // Cómo se continúa, en palabras.
    expect(franja!.textContent).toContain('mismo archivo');
  });

  it('sin cargas abiertas no pinta nada', async () => {
    api.migracion.cargas.mockResolvedValue([]);
    await pintar();
    expect(q('cargas-de-asientos')).toBeNull();
    expect(q('cargas-de-asientos-fallo')).toBeNull();
  });

  it('dice la regla de corrección: un asiento ya cargado se reversa, no se reescribe', async () => {
    await pintar();
    expect(q('cargas-de-asientos')!.textContent).toMatch(/revers/i);
  });

  it('«Continuar» entrega la carga al padre', async () => {
    const onContinuar = vi.fn();
    await pintar({ onContinuar });

    await click(q(`continuar-carga-${CARGA.lote}`));

    expect(onContinuar).toHaveBeenCalledWith(CARGA);
  });

  it('mientras algo corre (`ocupado`), no se puede continuar ni descartar', async () => {
    await pintar({ ocupado: true });
    expect((q(`continuar-carga-${CARGA.lote}`) as HTMLButtonElement).disabled).toBe(true);
    expect((q(`descartar-carga-${CARGA.lote}`) as HTMLButtonElement).disabled).toBe(true);
  });

  it('vuelve a leer cuando cambia `version` (terminó o se cortó una aplicación)', async () => {
    await pintar({ version: 0 });
    expect(api.migracion.cargas).toHaveBeenCalledTimes(1);

    api.migracion.cargas.mockResolvedValue([]);
    await act(async () => {
      root!.render(<CargasDeAsientosAbiertas onContinuar={() => undefined} version={1} />);
    });
    await act(async () => {});

    expect(api.migracion.cargas).toHaveBeenCalledTimes(2);
    expect(q('cargas-de-asientos')).toBeNull();
  });
});

describe('descartar una carga', () => {
  it('🔴 pide confirmar y dice que NO borra ningún asiento', async () => {
    await pintar();

    await click(q(`descartar-carga-${CARGA.lote}`));

    const aviso = q('descartar-carga-confirmar');
    expect(aviso).not.toBeNull();
    expect(aviso!.textContent).toContain('no borra ningún asiento');
    // Todavía no se llamó: el primer clic sólo pregunta.
    expect(api.migracion.descartarCarga).not.toHaveBeenCalled();
  });

  it('al confirmar descarta ESA carga y refresca la lista', async () => {
    await pintar();
    await click(q(`descartar-carga-${CARGA.lote}`));

    api.migracion.cargas.mockResolvedValue([]);
    await click(q('descartar-carga-si'));

    expect(api.migracion.descartarCarga).toHaveBeenCalledWith(CARGA.lote);
    expect(q('cargas-de-asientos')).toBeNull();
  });

  it('«Cancelar» no llama al back', async () => {
    await pintar();
    await click(q(`descartar-carga-${CARGA.lote}`));
    await click(q('descartar-carga-no'));

    expect(api.migracion.descartarCarga).not.toHaveBeenCalled();
    expect(q('descartar-carga-confirmar')).toBeNull();
    expect(q(`carga-${CARGA.lote}`)).not.toBeNull();
  });

  it('si el back falla lo dice y la carga sigue en la lista', async () => {
    api.migracion.descartarCarga.mockRejectedValue(new Error('La base no contestó.'));
    await pintar();
    await click(q(`descartar-carga-${CARGA.lote}`));
    await click(q('descartar-carga-si'));

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('La base no contestó.');
    expect(q(`carga-${CARGA.lote}`)).not.toBeNull();
  });

  it('un 403 explica quién puede descartar (la contabilidad es del administrador o el contador)', async () => {
    api.migracion.descartarCarga.mockRejectedValue(new ApiError(403, 'Forbidden'));
    await pintar();
    await click(q(`descartar-carga-${CARGA.lote}`));
    await click(q('descartar-carga-si'));

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('administrador o el contador');
  });

  it('un 404 (otra pestaña ya la descartó) refresca la lista en vez de dejar un error colgado', async () => {
    api.migracion.descartarCarga.mockRejectedValue(new ApiError(404, 'No existe'));
    await pintar();
    await click(q(`descartar-carga-${CARGA.lote}`));
    api.migracion.cargas.mockResolvedValue([]);
    await click(q('descartar-carga-si'));

    expect(q('cargas-de-asientos')).toBeNull();
  });
});

describe('cuando la lectura falla', () => {
  it('🔴 un fallo de red se DICE y ofrece reintentar, sin bloquear nada', async () => {
    api.migracion.cargas.mockRejectedValueOnce(new ApiError(0, 'sin red'));
    await pintar();

    const fallo = q('cargas-de-asientos-fallo');
    expect(fallo).not.toBeNull();

    api.migracion.cargas.mockResolvedValue([CARGA]);
    await click(q('cargas-de-asientos-reintentar'));

    expect(q('cargas-de-asientos-fallo')).toBeNull();
    expect(q(`carga-${CARGA.lote}`)).not.toBeNull();
  });

  it('un 403 (un rol que no maneja la contabilidad) calla: no es un fallo para esa persona', async () => {
    api.migracion.cargas.mockRejectedValue(new ApiError(403, 'Forbidden'));
    await pintar();
    expect(q('cargas-de-asientos-fallo')).toBeNull();
    expect(q('cargas-de-asientos')).toBeNull();
  });
});
