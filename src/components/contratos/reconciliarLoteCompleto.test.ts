/**
 * reconciliarLoteCompleto.test.ts — la vuelta de «Volver a cruzar con lo ya
 * cargado». Mismas garantías que `revisarLoteCompleto` de inmuebles: avanza
 * por cursor, para cuando el back dice `terminado`, y no se queda girando
 * sobre una fila que sigue pendiente.
 */

import { describe, it, expect, vi } from 'vitest';
import { reconciliarLoteCompleto } from './reconciliarLoteCompleto';
import type { ResultadoReconciliacion } from '@/lib/api/contracts.service';

function tanda(over: Partial<ResultadoReconciliacion> = {}): ResultadoReconciliacion {
  return {
    revisadas: 0,
    ultimaFila: null,
    terminado: true,
    inmueblesVinculados: 0,
    propietariosVinculados: 0,
    inquilinosVinculados: 0,
    listas: 0,
    pendientes: 0,
    porMotivo: {},
    fallidas: [],
    ...over,
  };
}

describe('reconciliarLoteCompleto — una vuelta completa por cursor', () => {
  it('suma lo de cada tanda y avanza con el cursor hasta que el back dice terminado', async () => {
    const reconciliar = vi
      .fn()
      .mockResolvedValueOnce(tanda({ revisadas: 30, inmueblesVinculados: 28, listas: 20, ultimaFila: 30, terminado: false }))
      .mockResolvedValueOnce(tanda({ revisadas: 30, inmueblesVinculados: 30, listas: 30, ultimaFila: 61, terminado: false }))
      .mockResolvedValueOnce(tanda({ revisadas: 2, inmueblesVinculados: 0, listas: 0, ultimaFila: 63, terminado: true }));

    const r = await reconciliarLoteCompleto('lote-1', reconciliar);

    expect(reconciliar.mock.calls).toEqual([
      ['lote-1', 0],
      ['lote-1', 30],
      ['lote-1', 61],
    ]);
    expect(r.revisadas).toBe(62);
    expect(r.inmueblesVinculados).toBe(58);
    expect(r.listas).toBe(50);
    expect(r.llamadas).toBe(3);
    expect(r.detenidoSinAvance).toBe(false);
  });

  it('🔴 una fila que sigue pendiente después de cruzarla NO se vuelve a pedir', async () => {
    const reconciliar = vi
      .fn()
      .mockResolvedValue(tanda({ revisadas: 1, pendientes: 1, ultimaFila: 7, terminado: true }));

    const r = await reconciliarLoteCompleto('lote-1', reconciliar);

    expect(reconciliar).toHaveBeenCalledTimes(1);
    expect(r.detenidoSinAvance).toBe(false);
  });

  it('un back que no mueve el cursor se corta en la llamada siguiente', async () => {
    const reconciliar = vi
      .fn()
      .mockResolvedValueOnce(tanda({ revisadas: 5, ultimaFila: 5, terminado: false }))
      .mockResolvedValueOnce(tanda({ revisadas: 5, ultimaFila: 5, terminado: false }));

    const r = await reconciliarLoteCompleto('lote-1', reconciliar);

    expect(reconciliar).toHaveBeenCalledTimes(2);
    expect(r.detenidoSinAvance).toBe(true);
  });

  it('un back viejo sin cursor no cuelga la pestaña: se corta y lo dice', async () => {
    const viejo = { revisadas: 3, inmueblesVinculados: 1, propietariosVinculados: 0, inquilinosVinculados: 0, listas: 1, pendientes: 2, porMotivo: {}, fallidas: [] } as unknown as ResultadoReconciliacion;
    const reconciliar = vi.fn().mockResolvedValue(viejo);

    const r = await reconciliarLoteCompleto('lote-1', reconciliar);

    expect(reconciliar).toHaveBeenCalledTimes(1);
    expect(r.detenidoSinAvance).toBe(true);
    expect(r.inmueblesVinculados).toBe(1);
  });

  it('«Detener» para después de la llamada en curso', async () => {
    const reconciliar = vi
      .fn()
      .mockResolvedValueOnce(tanda({ revisadas: 30, ultimaFila: 30, terminado: false }))
      .mockResolvedValueOnce(tanda({ revisadas: 30, ultimaFila: 60, terminado: true }));
    let parar = false;

    const r = await reconciliarLoteCompleto('lote-1', reconciliar, () => {
      parar = true;
    }, { debeParar: () => parar });

    expect(reconciliar).toHaveBeenCalledTimes(1);
    expect(r.detenidoPorPersona).toBe(true);
  });

  it('cuenta las fallidas de cada tanda y reporta el progreso acumulado', async () => {
    const reconciliar = vi
      .fn()
      .mockResolvedValueOnce(tanda({ revisadas: 10, inmueblesVinculados: 9, ultimaFila: 10, terminado: false, fallidas: [{ id: 'x', fila: 3, motivo: 'boom' }] }))
      .mockResolvedValueOnce(tanda({ revisadas: 10, inmueblesVinculados: 10, ultimaFila: 20, terminado: true }));
    const onProgreso = vi.fn();

    const r = await reconciliarLoteCompleto('lote-1', reconciliar, onProgreso);

    expect(r.fallidas).toBe(1);
    expect(onProgreso.mock.calls.map(([p]) => [p.revisadas, p.inmueblesVinculados, p.llamadas])).toEqual([
      [10, 9, 1],
      [20, 19, 2],
    ]);
  });

  it('un error a mitad de camino sube tal cual', async () => {
    const reconciliar = vi.fn().mockRejectedValue(new Error('Tu sesión venció'));

    await expect(reconciliarLoteCompleto('lote-1', reconciliar)).rejects.toThrow('Tu sesión venció');
  });
});
