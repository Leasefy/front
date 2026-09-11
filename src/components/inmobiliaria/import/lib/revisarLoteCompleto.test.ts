/**
 * revisarLoteCompleto.test.ts — el bucle de «Volver a revisar lo pendiente».
 *
 * La prueba que importa es la tercera: una fila que SIGUE pendiente después
 * de mirarla no puede hacer que el bucle la mire otra vez. El bucle anterior
 * («mientras restantes > 0») lo hacía: 151 llamadas en vivo el 2026-09-11.
 */

import { describe, it, expect, vi } from 'vitest';
import { revisarLoteCompleto } from './revisarLoteCompleto';
import type { ResumenRevisionInmuebles } from '@/lib/api/inmuebles-importacion.service';

function respuesta(over: Partial<ResumenRevisionInmuebles> = {}): ResumenRevisionInmuebles {
  return {
    lote: 'lote-1',
    revisadas: 0,
    liberadas: 0,
    restantes: 0,
    ultimaFila: null,
    terminado: true,
    ...over,
  };
}

describe('revisarLoteCompleto — una vuelta completa, ni una más', () => {
  it('una llamada con terminado: true cierra el bucle con sus conteos', async () => {
    const revisar = vi
      .fn()
      .mockResolvedValue(respuesta({ revisadas: 4, liberadas: 3, restantes: 1, ultimaFila: 5, terminado: true }));

    const r = await revisarLoteCompleto('lote-1', revisar);

    expect(revisar).toHaveBeenCalledTimes(1);
    expect(revisar).toHaveBeenCalledWith('lote-1', 0);
    expect(r).toEqual({
      revisadas: 4,
      liberadas: 3,
      restantes: 1,
      llamadas: 1,
      detenidoPorLimite: false,
      detenidoSinAvance: false,
      detenidoPorPersona: false,
    });
  });

  it('avanza con el cursor: la segunda llamada empieza donde terminó la primera', async () => {
    const revisar = vi
      .fn()
      .mockResolvedValueOnce(respuesta({ revisadas: 40, liberadas: 38, restantes: 200, ultimaFila: 40, terminado: false }))
      .mockResolvedValueOnce(respuesta({ revisadas: 40, liberadas: 40, restantes: 160, ultimaFila: 91, terminado: false }))
      .mockResolvedValueOnce(respuesta({ revisadas: 3, liberadas: 0, restantes: 160, ultimaFila: 94, terminado: true }));

    const r = await revisarLoteCompleto('lote-1', revisar);

    expect(revisar.mock.calls).toEqual([
      ['lote-1', 0],
      ['lote-1', 40],
      ['lote-1', 91],
    ]);
    expect(r.revisadas).toBe(83);
    expect(r.liberadas).toBe(78);
    expect(r.restantes).toBe(160);
    expect(r.llamadas).toBe(3);
  });

  it('🔴 una fila que sigue pendiente después de mirarla NO se vuelve a pedir (2026-09-11: 151 llamadas sobre una fila)', async () => {
    // La fila 4 se queda pendiente por `tipo`. El back la miró, no la liberó,
    // y dice que después de ella no queda nada: la vuelta terminó aunque
    // `restantes` siga siendo 1.
    const revisar = vi
      .fn()
      .mockResolvedValue(respuesta({ revisadas: 1, liberadas: 0, restantes: 1, ultimaFila: 4, terminado: true }));

    const r = await revisarLoteCompleto('lote-1', revisar);

    expect(revisar).toHaveBeenCalledTimes(1);
    expect(r.restantes).toBe(1);
    expect(r.detenidoSinAvance).toBe(false);
  });

  it('un back que no mueve el cursor se corta en la llamada siguiente, no en la 1.000', async () => {
    const revisar = vi
      .fn()
      .mockResolvedValueOnce(respuesta({ revisadas: 5, liberadas: 2, restantes: 9, ultimaFila: 5, terminado: false }))
      .mockResolvedValueOnce(respuesta({ revisadas: 5, liberadas: 0, restantes: 9, ultimaFila: 5, terminado: false }));

    const r = await revisarLoteCompleto('lote-1', revisar);

    expect(revisar).toHaveBeenCalledTimes(2);
    expect(r.detenidoSinAvance).toBe(true);
    expect(r.revisadas).toBe(10);
    expect(r.liberadas).toBe(2);
  });

  it('un back viejo sin cursor (sin terminado ni ultimaFila) no cuelga la pestaña: se corta y lo dice', async () => {
    const sinCursor = { lote: 'lote-1', revisadas: 3, liberadas: 1, restantes: 2 } as unknown as ResumenRevisionInmuebles;
    const revisar = vi.fn().mockResolvedValue(sinCursor);

    const r = await revisarLoteCompleto('lote-1', revisar);

    expect(revisar).toHaveBeenCalledTimes(1);
    expect(r.detenidoSinAvance).toBe(true);
    expect(r.liberadas).toBe(1);
  });

  it('una llamada que no miró ninguna fila también termina la vuelta', async () => {
    const revisar = vi.fn().mockResolvedValue(respuesta({ revisadas: 0, restantes: 0, ultimaFila: null, terminado: false }));

    const r = await revisarLoteCompleto('lote-1', revisar);

    expect(revisar).toHaveBeenCalledTimes(1);
    expect(r.detenidoSinAvance).toBe(false);
  });

  it('reporta el progreso acumulado después de cada llamada', async () => {
    const revisar = vi
      .fn()
      .mockResolvedValueOnce(respuesta({ revisadas: 10, liberadas: 9, restantes: 30, ultimaFila: 10, terminado: false }))
      .mockResolvedValueOnce(respuesta({ revisadas: 10, liberadas: 10, restantes: 20, ultimaFila: 20, terminado: true }));
    const onProgreso = vi.fn();

    await revisarLoteCompleto('lote-1', revisar, onProgreso);

    expect(onProgreso.mock.calls.map(([p]) => p)).toEqual([
      { revisadas: 10, liberadas: 9, restantes: 30, llamadas: 1 },
      { revisadas: 20, liberadas: 19, restantes: 20, llamadas: 2 },
    ]);
  });

  it('«Detener» para después de la llamada en curso y conserva lo liberado', async () => {
    const revisar = vi
      .fn()
      .mockResolvedValueOnce(respuesta({ revisadas: 40, liberadas: 38, restantes: 200, ultimaFila: 40, terminado: false }))
      .mockResolvedValueOnce(respuesta({ revisadas: 40, liberadas: 40, restantes: 160, ultimaFila: 91, terminado: false }));
    let parar = false;
    const onProgreso = vi.fn(() => {
      parar = true; // la persona toca «Detener» mientras corre la primera llamada
    });

    const r = await revisarLoteCompleto('lote-1', revisar, onProgreso, { debeParar: () => parar });

    expect(revisar).toHaveBeenCalledTimes(1);
    expect(r.detenidoPorPersona).toBe(true);
    expect(r.liberadas).toBe(38);
  });

  it('un error a mitad de camino sube tal cual: la pantalla decide qué decir', async () => {
    const revisar = vi.fn().mockRejectedValue(new Error('Tu sesión venció'));

    await expect(revisarLoteCompleto('lote-1', revisar)).rejects.toThrow('Tu sesión venció');
  });
});
