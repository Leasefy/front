/**
 * activarContratosCompleto.test.ts — la vuelta completa de la activación.
 *
 * 🔴 Nico, 2026-09-12: «el activar contratos también puede tomar mucho tiempo,
 * debemos colocar una progress bar real que muestre porcentaje y tiempo». Para
 * que exista una barra, la llamada tiene que volver: desde hoy el back corta
 * por reloj y devuelve `restantes`, y este bucle da la vuelta.
 */

import { describe, it, expect, vi } from 'vitest';
import { activarContratosCompleto } from './activarContratosCompleto';
import type { ResumenActivacion } from '@/lib/api/contracts.service';

function resumen(over: Partial<ResumenActivacion> = {}): ResumenActivacion {
  return {
    intentadas: 0,
    restantes: 0,
    activadas: 0,
    fallidas: 0,
    invitados: 0,
    resultados: [],
    ...over,
  };
}

describe('activarContratosCompleto', () => {
  it('da la vuelta hasta que no quedan, sumando lo de cada tanda', async () => {
    const activar = vi
      .fn()
      .mockResolvedValueOnce(resumen({ intentadas: 10, activadas: 9, fallidas: 1, restantes: 15 }))
      .mockResolvedValueOnce(resumen({ intentadas: 10, activadas: 10, restantes: 5 }))
      .mockResolvedValueOnce(resumen({ intentadas: 5, activadas: 5, restantes: 0 }));

    const r = await activarContratosCompleto(activar);

    expect(activar).toHaveBeenCalledTimes(3);
    expect(r.hechas).toBe(25);
    expect(r.activadas).toBe(24);
    expect(r.fallidas).toBe(1);
    expect(r.restantes).toBe(0);
  });

  it('avisa después de CADA tanda, con el total tomado del servidor', async () => {
    const activar = vi
      .fn()
      .mockResolvedValueOnce(resumen({ intentadas: 10, activadas: 10, restantes: 90 }))
      .mockResolvedValueOnce(resumen({ intentadas: 10, activadas: 10, restantes: 0 }));
    const onProgreso = vi.fn();

    await activarContratosCompleto(activar, onProgreso);

    const vistos = onProgreso.mock.calls.map(([p]) => ({
      hechas: p.hechas,
      total: p.hechas + p.restantes,
    }));
    expect(vistos).toEqual([
      { hechas: 10, total: 100 },
      { hechas: 20, total: 20 },
    ]);
  });

  /*
   * 🔴 Un back anterior al 2026-09-12 no manda `restantes`. Ausente ⇒ una
   * sola vuelta, que es el comportamiento de siempre: nunca se asume que
   * queda trabajo por un campo que no vino.
   */
  it('sin `restantes` hace UNA sola llamada', async () => {
    const activar = vi.fn().mockResolvedValue(
      resumen({ intentadas: 90, activadas: 90, restantes: undefined }),
    );

    const r = await activarContratosCompleto(activar);

    expect(activar).toHaveBeenCalledTimes(1);
    expect(r.hechas).toBe(90);
  });

  it('«Detener» corta DESPUÉS de la tanda en curso y lo dice', async () => {
    const activar = vi.fn().mockResolvedValue(
      resumen({ intentadas: 10, activadas: 10, restantes: 90 }),
    );
    let parar = false;
    const r = await activarContratosCompleto(
      activar,
      ({ llamadas }) => {
        if (llamadas === 2) parar = true;
      },
      { debeParar: () => parar },
    );

    expect(r.detenidoPorPersona).toBe(true);
    expect(activar).toHaveBeenCalledTimes(2);
    expect(r.activadas).toBe(20);
  });

  /*
   * Una tanda que no procesa NINGUNA fila y deja restantes: la siguiente haría
   * exactamente lo mismo. Sin esta guarda, el bucle daría mil vueltas.
   */
  it('corta cuando una tanda no procesa ninguna fila', async () => {
    const activar = vi
      .fn()
      .mockResolvedValueOnce(resumen({ intentadas: 10, activadas: 10, restantes: 90 }))
      .mockResolvedValue(resumen({ intentadas: 0, restantes: 90 }));

    const r = await activarContratosCompleto(activar);

    expect(r.detenidoSinAvance).toBe(true);
    expect(activar).toHaveBeenCalledTimes(2);
  });

  it('un error de red se propaga, no se traga', async () => {
    const activar = vi.fn().mockRejectedValue(new Error('se cayó la red'));
    await expect(activarContratosCompleto(activar)).rejects.toThrow('se cayó la red');
  });
});
