/**
 * El loop que crea las fichas por tandas.
 *
 * Lo que se prueba acá no es que sume: es que NUNCA gire para siempre, que un
 * corte de red deje a la vista lo que sí se hizo, y que las filas que fallaron
 * no lo hagan repetirse.
 */

import { describe, it, expect, vi } from 'vitest';

import {
  aplicarLoteDeTerceros,
  AplicacionInterrumpida,
  MAX_TANDAS,
} from './aplicar-lote-de-terceros';
import type { ResumenDeAplicacion } from '@/lib/api/migracion-terceros.service';

const tanda = (over: Partial<ResumenDeAplicacion> = {}): ResumenDeAplicacion => ({
  lote: 'l1',
  intentadas: 100,
  aplicadas: 100,
  fallidas: 0,
  invitados: 100,
  sinInvitar: 0,
  resultados: [],
  restantes: 0,
  ...over,
});

describe('aplicarLoteDeTerceros', () => {
  it('llama de nuevo mientras queden, y suma los informes', async () => {
    const aplicar = vi
      .fn()
      .mockResolvedValueOnce(tanda({ restantes: 150 }))
      .mockResolvedValueOnce(tanda({ restantes: 50 }))
      .mockResolvedValueOnce(tanda({ intentadas: 50, aplicadas: 50, invitados: 50, restantes: 0 }));

    const r = await aplicarLoteDeTerceros('l1', aplicar);

    expect(aplicar).toHaveBeenCalledTimes(3);
    expect(r.intentadas).toBe(250);
    expect(r.aplicadas).toBe(250);
    expect(r.invitados).toBe(250);
    expect(r.restantes).toBe(0);
  });

  it('una sola tanda alcanza cuando el lote entra completo', async () => {
    const aplicar = vi.fn().mockResolvedValue(tanda({ intentadas: 12, aplicadas: 12 }));

    const r = await aplicarLoteDeTerceros('l1', aplicar);

    expect(aplicar).toHaveBeenCalledTimes(1);
    expect(r.aplicadas).toBe(12);
  });

  it('informa el progreso con lo que va y lo que falta', async () => {
    const aplicar = vi
      .fn()
      .mockResolvedValueOnce(tanda({ restantes: 100 }))
      .mockResolvedValueOnce(tanda({ restantes: 0 }));
    const vistos: { aplicadas: number; restantes: number }[] = [];

    await aplicarLoteDeTerceros('l1', aplicar, (p) => vistos.push({ ...p }));

    expect(vistos).toEqual([
      { aplicadas: 100, restantes: 100 },
      { aplicadas: 200, restantes: 0 },
    ]);
  });

  it('un corte de red a mitad viaja CON lo que ya se creó', async () => {
    // Sin esto, el mensaje sería «no pudimos crear las fichas» sobre 100 que
    // sí quedaron creadas — y la persona no sabe si reintentar duplica.
    const aplicar = vi
      .fn()
      .mockResolvedValueOnce(tanda({ restantes: 100 }))
      .mockRejectedValueOnce(new Error('Sin conexión'));

    const error = await aplicarLoteDeTerceros('l1', aplicar).catch((e) => e);

    expect(error).toBeInstanceOf(AplicacionInterrumpida);
    expect((error as AplicacionInterrumpida).parcial.aplicadas).toBe(100);
    expect((error as AplicacionInterrumpida).message).toContain('Sin conexión');
  });

  it('las filas que fallaron NO lo hacen girar: el back ya no las cuenta', async () => {
    const aplicar = vi
      .fn()
      .mockResolvedValue(tanda({ intentadas: 3, aplicadas: 1, fallidas: 2, restantes: 0 }));

    const r = await aplicarLoteDeTerceros('l1', aplicar);

    expect(aplicar).toHaveBeenCalledTimes(1);
    expect(r.fallidas).toBe(2);
  });

  it('🔴 un back que dice «quedan» pero no avanza no cuelga el navegador', async () => {
    const aplicar = vi.fn().mockResolvedValue(tanda({ intentadas: 0, aplicadas: 0, restantes: 500 }));

    const r = await aplicarLoteDeTerceros('l1', aplicar);

    expect(aplicar).toHaveBeenCalledTimes(1);
    expect(r.restantes).toBe(500);
  });

  it('🔴 y aunque avance de a poco, hay un techo de vueltas', async () => {
    const aplicar = vi.fn().mockResolvedValue(tanda({ intentadas: 1, aplicadas: 1, restantes: 999 }));

    const r = await aplicarLoteDeTerceros('l1', aplicar);

    expect(aplicar).toHaveBeenCalledTimes(MAX_TANDAS);
    expect(r.aplicadas).toBe(MAX_TANDAS);
  });

  it('un back viejo sin `restantes` se lee como «no queda nada»', async () => {
    const aplicar = vi.fn().mockResolvedValue({ ...tanda(), restantes: undefined });

    const r = await aplicarLoteDeTerceros('l1', aplicar);

    expect(aplicar).toHaveBeenCalledTimes(1);
    expect(r.restantes).toBe(0);
  });
});
