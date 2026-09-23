/**
 * 🔴 «SUBE UN EXTRACTO» NO SE LE DICE A QUIEN YA LO SUBIÓ.
 *
 * Dos veces, en dos pantallas distintas, Conciliación le pidió a la
 * inmobiliaria que cargara un extracto que ya estaba cargado:
 *
 *   · 20-09, Resumen: «no has cargado ningún extracto», con uno del 2 de
 *     septiembre y tres movimientos esperando al lado;
 *   · 21-09, Por revisar: «Nada por revisar. Sube un extracto del banco…»,
 *     con ese mismo extracto.
 *
 * La causa es siempre la misma: quien RECIBE el extracto es el back, y las dos
 * pantallas le preguntaban al agente. Este guardián fija la regla del
 * primitivo — y que «no sé» nunca se convierta en «no hay».
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Root } from 'react-dom/client';

const { api } = vi.hoisted(() => ({ api: { resumen: vi.fn() } }));
vi.mock('@/lib/api/conciliacion-bancaria.service', () => ({
  conciliacionBancariaApi: api,
}));

import { createRoot } from 'react-dom/client';
import { act } from 'react';
import * as React from 'react';

import { useExtractoDelBack } from './use-extracto-del-back';

let root: Root | null = null;

async function leer() {
  const visto: ReturnType<typeof useExtractoDelBack>[] = [];
  function Sonda() {
    visto.push(useExtractoDelBack());
    return null;
  }
  const host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(React.createElement(Sonda));
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  await act(async () => {
    root!.unmount();
  });
  root = null;
  host.remove();
  return visto[visto.length - 1]!;
}

beforeEach(() => {
  api.resumen.mockReset();
});

describe('¿hay extracto?', () => {
  it('con un extracto cargado, `hayExtracto` y NO `sinExtracto`', async () => {
    api.resumen.mockResolvedValue({
      ultimoExtracto: { id: 'e-1', cargadoAt: '2026-09-02T10:00:00.000Z' },
    });
    const r = await leer();
    expect(r.hayExtracto).toBe(true);
    expect(r.sinExtracto).toBe(false);
    expect(r.leyendo).toBe(false);
  });

  it('sin ningún extracto, `sinExtracto`', async () => {
    api.resumen.mockResolvedValue({ ultimoExtracto: null });
    const r = await leer();
    expect(r.sinExtracto).toBe(true);
    expect(r.hayExtracto).toBe(false);
  });

  it('🔴 si el back falla, NO se afirma ni que sí ni que no', async () => {
    api.resumen.mockRejectedValue(new Error('se cayó la red'));
    const r = await leer();
    expect(r.sinExtracto).toBe(false);
    expect(r.hayExtracto).toBe(false);
    expect(r.delBack).toBeNull();
  });
});
