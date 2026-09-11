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
    // reporting more work, pero SÍ avanzando (si no avanzara, cortaría antes
    // por `detenidoSinAvance`, que es la salida buena).
    const activar = vi.fn().mockResolvedValue(resumen({ activados: 1, restantes: 1 }));

    const result = await activarLoteCompleto('lote-1', activar);

    expect(result.detenidoPorLimite).toBe(true);
    expect(activar).toHaveBeenCalledTimes(1_000);
  });

  /*
   * 🔴 El techo de llamadas subió de 100 a 1.000 el 2026-09-10, y eso solo
   * habría hecho que una importación rota colgara la pestaña diez veces más.
   *
   * El corte de verdad es éste: una llamada que vuelve con filas pendientes
   * sin haber movido NINGUNA. La siguiente haría exactamente lo mismo.
   *
   * El incidente: la agencia subió 2.864 inmuebles, entraron 1.381 y 1.240
   * quedaron en LISTO sin activarse nunca — cada llamada tardaba 11,6 minutos
   * (500 filas × 1,39 s) y la cuarta nunca volvió. El back ahora corta por
   * tiempo, así que las llamadas son muchas y cortas: sin esta guarda, un lote
   * atascado daría 1.000 vueltas antes de decir nada.
   */
  it('corta en cuanto una tanda no mueve ninguna fila: insistir no sirve', async () => {
    const activar = vi
      .fn()
      .mockResolvedValueOnce(resumen({ activados: 11, restantes: 300 }))
      .mockResolvedValue(resumen({ activados: 0, restantes: 300 }));

    const result = await activarLoteCompleto('lote-1', activar);

    expect(result.detenidoSinAvance).toBe(true);
    expect(result.detenidoPorLimite).toBe(false);
    expect(result.activados).toBe(11);
    // Dos: la que avanzó y la que no. No mil.
    expect(activar).toHaveBeenCalledTimes(2);
  });

  it('reusar un inmueble que ya existe SÍ es avance: el lote se movió', async () => {
    const activar = vi
      .fn()
      .mockResolvedValueOnce(resumen({ activados: 0, reusados: 8, restantes: 10 }))
      .mockResolvedValueOnce(resumen({ activados: 10, restantes: 0 }));

    const result = await activarLoteCompleto('lote-1', activar);

    expect(result.detenidoSinAvance).toBe(false);
    expect(result.activados).toBe(10);
    expect(activar).toHaveBeenCalledTimes(2);
  });

  it('omitir filas también es avance: salieron de LISTO', async () => {
    const activar = vi
      .fn()
      .mockResolvedValueOnce(
        resumen({ activados: 0, restantes: 5, omitidas: [{ id: 'f1', fila: 9, faltantes: ['canon'] }] }),
      )
      .mockResolvedValueOnce(resumen({ activados: 5, restantes: 0 }));

    const result = await activarLoteCompleto('lote-1', activar);

    expect(result.detenidoSinAvance).toBe(false);
    expect(result.omitidas).toHaveLength(1);
    expect(activar).toHaveBeenCalledTimes(2);
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

/*
 * 🔴 2026-09-11: Nico miró «Activando…» cinco minutos y preguntó si se había
 * dañado. Iban 1.809 de 2.824. El loop tiene que CONTAR mientras corre y
 * tiene que poder pararse — una espera de 40 minutos sin número ni salida es
 * indistinguible de un cuelgue.
 */
/*
 * 🔴 Nico, 2026-09-11: «¿por qué dices que se importaron 679 propiedades si
 * le subí 2800 y algo?». Porque 2.145 filas ya tenían su inmueble de la carga
 * anterior y se re-apuntaron. El resultado tiene que llevar ese número hasta
 * la pantalla: sin él, una importación completa se ve como un fracaso.
 */
describe('activarLoteCompleto — los reusados llegan al resultado', () => {
  it('suma los reusados de todas las tandas y los devuelve aparte de los creados', async () => {
    const activar = vi
      .fn()
      .mockResolvedValueOnce(resumen({ activados: 200, reusados: 1_500, restantes: 1_124 }))
      .mockResolvedValueOnce(resumen({ activados: 479, reusados: 645, restantes: 0 }));

    const r = await activarLoteCompleto('lote-1', activar);

    expect(r.activados).toBe(679);
    expect(r.reusados).toBe(2_145);
    // Las 2.824 filas del archivo: es el número que la pantalla tiene que dar.
    expect(r.activados + r.reusados).toBe(2_824);
  });

  it('sin reusados el número queda en 0, no en undefined', async () => {
    const activar = vi.fn().mockResolvedValue(resumen({ activados: 5, restantes: 0 }));
    expect((await activarLoteCompleto('lote-1', activar)).reusados).toBe(0);
  });
});

describe('activarLoteCompleto — el progreso y la salida', () => {
  it('avisa después de CADA llamada con los acumulados y lo que queda', async () => {
    const activar = vi
      .fn()
      .mockResolvedValueOnce(resumen({ activados: 10, reusados: 5, restantes: 20 }))
      .mockResolvedValueOnce(
        resumen({ activados: 8, restantes: 12, omitidas: [{ id: 'f1', fila: 4, faltantes: ['canon'] }] }),
      )
      .mockResolvedValueOnce(resumen({ activados: 12, restantes: 0 }));
    const onProgreso = vi.fn();

    await activarLoteCompleto('lote-1', activar, onProgreso);

    expect(onProgreso.mock.calls.map(([p]) => p)).toEqual([
      { activados: 10, reusados: 5, omitidas: 0, restantes: 20, llamadas: 1 },
      { activados: 18, reusados: 5, omitidas: 1, restantes: 12, llamadas: 2 },
      { activados: 30, reusados: 5, omitidas: 1, restantes: 0, llamadas: 3 },
    ]);
  });

  it('«Detener» para DESPUÉS de la llamada en curso y lo dice: nada se deshace', async () => {
    const activar = vi
      .fn()
      .mockResolvedValueOnce(resumen({ activados: 10, restantes: 90 }))
      .mockResolvedValueOnce(resumen({ activados: 10, restantes: 80 }))
      .mockResolvedValue(resumen({ activados: 10, restantes: 70 }));
    let parar = false;
    const onProgreso = vi.fn(({ llamadas }: { llamadas: number }) => {
      if (llamadas === 2) parar = true;
    });

    const r = await activarLoteCompleto('lote-1', activar, onProgreso, { debeParar: () => parar });

    expect(r.detenidoPorPersona).toBe(true);
    expect(r.detenidoSinAvance).toBe(false);
    expect(r.detenidoPorLimite).toBe(false);
    // Las dos tandas que pasaron cuentan; la tercera nunca salió.
    expect(r.activados).toBe(20);
    expect(activar).toHaveBeenCalledTimes(2);
  });

  it('parar cuando ya no queda nada NO se reporta como detenido: terminó', async () => {
    const activar = vi.fn().mockResolvedValue(resumen({ activados: 3, restantes: 0 }));

    const r = await activarLoteCompleto('lote-1', activar, undefined, { debeParar: () => true });

    expect(r.detenidoPorPersona).toBe(false);
    expect(r.activados).toBe(3);
  });
});
