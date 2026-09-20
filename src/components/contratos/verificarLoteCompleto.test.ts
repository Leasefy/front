/**
 * verificarLoteCompleto.test.ts — la vuelta completa de la doble verificación.
 *
 * Lo que estas pruebas congelan es la promesa de Nico: «que el número sea del
 * lote completo, no de una muestra». Y los tres seguros para que ese bucle no
 * se convierta en el que ya nos costó 151 llamadas en tres minutos.
 */

import { describe, it, expect, vi } from 'vitest';
import { verificarLoteCompleto } from './verificarLoteCompleto';
import type {
  ResultadoDeVerificacion,
  VeredictoDeFila,
} from '@/lib/api/contracts.service';

function tanda(over: Partial<ResultadoDeVerificacion> = {}): ResultadoDeVerificacion {
  return {
    verificadas: 0,
    coinciden: 0,
    difieren: 0,
    noVerificables: 0,
    veredictos: [],
    veredictosTruncados: false,
    ultimaFila: null,
    terminado: true,
    restantes: 0,
    guardado: true,
    ...over,
  };
}

function veredicto(over: Partial<VeredictoDeFila> = {}): VeredictoDeFila {
  return {
    fila: 0,
    veredicto: 'coincide',
    contratoId: 'c-1',
    diferencias: [],
    sinCotejar: [],
    cotejados: ['inmueble'],
    ...over,
  };
}

describe('verificarLoteCompleto', () => {
  it('suma TODAS las vueltas: el número es del lote completo, no de la primera tanda', async () => {
    const verificar = vi
      .fn()
      .mockResolvedValueOnce(
        tanda({ verificadas: 50, coinciden: 48, difieren: 2, ultimaFila: 49, terminado: false, restantes: 1_786 }),
      )
      .mockResolvedValueOnce(
        tanda({ verificadas: 50, coinciden: 50, ultimaFila: 99, terminado: false, restantes: 1_736 }),
      )
      .mockResolvedValueOnce(
        tanda({ verificadas: 10, coinciden: 9, noVerificables: 1, ultimaFila: 109, terminado: true }),
      );

    const r = await verificarLoteCompleto('lote-1', verificar);

    // 🔴 El cursor avanza a `ultimaFila + 1`: el back mira desde `desdeFila`
    // INCLUSIVE, así que sin el uno la última fila se miraría dos veces.
    expect(verificar.mock.calls).toEqual([
      ['lote-1', 0],
      ['lote-1', 50],
      ['lote-1', 100],
    ]);
    expect(r.verificadas).toBe(110);
    expect(r.coinciden).toBe(107);
    expect(r.difieren).toBe(2);
    expect(r.noVerificables).toBe(1);
    expect(r.llamadas).toBe(3);
  });

  it('junta el detalle de todas las vueltas y pone lo que DIFIERE primero', async () => {
    const verificar = vi
      .fn()
      .mockResolvedValueOnce(
        tanda({
          verificadas: 2,
          coinciden: 2,
          veredictos: [veredicto({ fila: 0 }), veredicto({ fila: 1 })],
          ultimaFila: 1,
          terminado: false,
        }),
      )
      .mockResolvedValueOnce(
        tanda({
          verificadas: 2,
          difieren: 1,
          noVerificables: 1,
          veredictos: [
            veredicto({ fila: 2, veredicto: 'no_verificable' }),
            veredicto({ fila: 3, veredicto: 'difiere' }),
          ],
          ultimaFila: 3,
          terminado: true,
        }),
      );

    const r = await verificarLoteCompleto('lote-1', verificar);

    expect(r.veredictos.map((v) => v.veredicto)).toEqual([
      'difiere',
      'no_verificable',
      'coincide',
      'coincide',
    ]);
  });

  it('🔴 basta que UNA vuelta no haya podido guardar para que el lote no esté guardado', async () => {
    const verificar = vi
      .fn()
      .mockResolvedValueOnce(
        tanda({ verificadas: 1, coinciden: 1, guardado: false, ultimaFila: 0, terminado: false }),
      )
      .mockResolvedValueOnce(
        tanda({ verificadas: 1, coinciden: 1, guardado: true, ultimaFila: 1, terminado: true }),
      );

    const r = await verificarLoteCompleto('lote-1', verificar);

    expect(r.guardado).toBe(false);
  });

  it('se corta —y lo dice— si el cursor no avanza, en vez de girar para siempre', async () => {
    // Un back que no conoce este endpoint, o que devuelve siempre la misma
    // fila: el bucle «mientras queden» no termina nunca. Ya pasó con la
    // re-revisión de inmuebles (151 llamadas en tres minutos).
    const verificar = vi
      .fn()
      .mockResolvedValue(
        tanda({ verificadas: 1, coinciden: 1, ultimaFila: 0, terminado: false }),
      );

    const r = await verificarLoteCompleto('lote-1', verificar);

    // Dos llamadas: la primera avanza a 1, la segunda devuelve el mismo 0.
    expect(verificar).toHaveBeenCalledTimes(2);
    expect(r.detenidoSinAvance).toBe(true);
  });

  it('para cuando la persona toca «Detener», después de la llamada en curso', async () => {
    let parar = false;
    const verificar = vi.fn().mockImplementation(async () => {
      parar = true;
      return tanda({ verificadas: 50, coinciden: 50, ultimaFila: 49, terminado: false });
    });

    const r = await verificarLoteCompleto('lote-1', verificar, undefined, {
      debeParar: () => parar,
    });

    expect(verificar).toHaveBeenCalledTimes(1);
    expect(r.detenidoPorPersona).toBe(true);
    // Lo que alcanzó a mirar sigue contando: no se tira el trabajo hecho.
    expect(r.verificadas).toBe(50);
  });

  it('una vuelta sin filas termina sin pedir más', async () => {
    const verificar = vi.fn().mockResolvedValue(tanda({ terminado: false }));
    const r = await verificarLoteCompleto('lote-1', verificar);
    expect(verificar).toHaveBeenCalledTimes(1);
    expect(r.verificadas).toBe(0);
  });

  it('informa el progreso en cada vuelta, con lo que falta', async () => {
    const verificar = vi
      .fn()
      .mockResolvedValueOnce(
        tanda({ verificadas: 50, coinciden: 50, ultimaFila: 49, terminado: false, restantes: 100 }),
      )
      .mockResolvedValueOnce(
        tanda({ verificadas: 100, coinciden: 100, ultimaFila: 149, terminado: true }),
      );
    const vistos: number[] = [];

    await verificarLoteCompleto('lote-1', verificar, (p) => vistos.push(p.verificadas));

    expect(vistos).toEqual([50, 150]);
  });

  it('sin lote verifica toda la cartera migrada: el lote viaja como undefined', async () => {
    const verificar = vi.fn().mockResolvedValue(tanda({ verificadas: 3, coinciden: 3 }));
    await verificarLoteCompleto(undefined, verificar);
    expect(verificar).toHaveBeenCalledWith(undefined, 0);
  });
});
