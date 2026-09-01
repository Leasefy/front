/**
 * activarLoteCompleto.test.ts — T-0038 WU-6, wu-4-report.md §6.
 *
 * "Call again while `restantes > 0` — 500 rows per call, resumable,
 * nothing repeats." Pins the loop termination logic in isolation.
 */

import { describe, it, expect, vi } from 'vitest';
import { activarLoteCompleto, ActivacionInterrumpida } from './activarLoteCompleto';
import type { ResumenActivacionInmuebles } from '@/lib/api/inmuebles-importacion.service';

function resumen(overrides: Partial<ResumenActivacionInmuebles> = {}): ResumenActivacionInmuebles {
  return { lote: 'lote-1', activados: 0, omitidas: [], restantes: 0, ...overrides };
}

describe('activarLoteCompleto — the restantes loop', () => {
  it('a single call with restantes: 0 finishes immediately', async () => {
    const activar = vi.fn().mockResolvedValue(resumen({ activados: 42, restantes: 0 }));
    const result = await activarLoteCompleto('lote-1', activar);

    expect(activar).toHaveBeenCalledTimes(1);
    expect(activar).toHaveBeenCalledWith('lote-1');
    expect(result.activados).toBe(42);
    expect(result.llamadas).toBe(1);
    expect(result.detenidoPorLimite).toBe(false);
  });

  it('calls again while restantes > 0, accumulating activados across calls', async () => {
    const activar = vi
      .fn()
      .mockResolvedValueOnce(resumen({ activados: 500, restantes: 300 }))
      .mockResolvedValueOnce(resumen({ activados: 300, restantes: 0 }));

    const result = await activarLoteCompleto('lote-1', activar);

    expect(activar).toHaveBeenCalledTimes(2);
    expect(result.activados).toBe(800);
    expect(result.llamadas).toBe(2);
  });

  it('accumulates omitidas across every call — never drops an earlier batch\'s omissions', async () => {
    const activar = vi
      .fn()
      .mockResolvedValueOnce(resumen({ activados: 400, restantes: 100, omitidas: [{ id: 'f1', fila: 3, faltantes: ['canon'] }] }))
      .mockResolvedValueOnce(resumen({ activados: 90, restantes: 0, omitidas: [{ id: 'f2', fila: 55, faltantes: ['ciudad'] }] }));

    const result = await activarLoteCompleto('lote-1', activar);

    expect(result.omitidas).toHaveLength(2);
    expect(result.omitidas.map((o) => o.id)).toEqual(['f1', 'f2']);
  });

  it('stops at the safety ceiling instead of looping forever on a backend bug', async () => {
    // Never resolves restantes to 0 — simulates a broken back always
    // reporting more work.
    const activar = vi.fn().mockResolvedValue(resumen({ activados: 1, restantes: 1 }));

    const result = await activarLoteCompleto('lote-1', activar);

    expect(result.detenidoPorLimite).toBe(true);
    expect(activar).toHaveBeenCalledTimes(100);
  });

  it('propagates a rejected activar() call instead of swallowing it', async () => {
    const activar = vi.fn().mockRejectedValue(new Error('network down'));
    await expect(activarLoteCompleto('lote-1', activar)).rejects.toThrow('network down');
  });

  it('🔴 un corte a mitad del loop trae el progreso de las tandas que SÍ pasaron', async () => {
    /*
     * La llamada 3 se cae con 1.000 filas ya activadas. Sin el progreso en
     * el error, la pantalla sólo podía decir «no pudimos activar» — y la
     * persona no sabía si reintentar duplicaba (no duplica: el back no
     * repite filas).
     */
    const activar = vi
      .fn()
      .mockResolvedValueOnce(resumen({ activados: 500, restantes: 700, omitidas: [{ id: 'f1', fila: 3, faltantes: ['canon'] }] }))
      .mockResolvedValueOnce(resumen({ activados: 500, restantes: 200 }))
      .mockRejectedValueOnce(new Error('network down'));

    const promesa = activarLoteCompleto('lote-1', activar);
    await expect(promesa).rejects.toBeInstanceOf(ActivacionInterrumpida);
    const e = (await promesa.catch((x) => x)) as ActivacionInterrumpida;
    expect(e.message).toBe('network down');
    expect(e.progreso.activados).toBe(1000);
    expect(e.progreso.llamadas).toBe(2);
    expect(e.progreso.omitidas.map((o) => o.id)).toEqual(['f1']);
  });

  it('un corte en la PRIMERA llamada reporta cero activados, no inventa progreso', async () => {
    const activar = vi.fn().mockRejectedValue(new Error('boom'));
    const e = (await activarLoteCompleto('lote-1', activar).catch((x) => x)) as ActivacionInterrumpida;
    expect(e).toBeInstanceOf(ActivacionInterrumpida);
    expect(e.progreso.activados).toBe(0);
    expect(e.progreso.llamadas).toBe(0);
  });

  it('un rechazo sin mensaje cae al copy de respaldo, nunca a un error vacío', async () => {
    const activar = vi.fn().mockRejectedValue('crudo');
    const e = (await activarLoteCompleto('lote-1', activar).catch((x) => x)) as ActivacionInterrumpida;
    expect(e.message).toBe('No pudimos activar el lote.');
  });
});
