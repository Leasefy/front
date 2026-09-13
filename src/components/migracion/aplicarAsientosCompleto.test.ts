/**
 * aplicarAsientosCompleto.test.ts — la vuelta completa de los asientos.
 *
 * 🔴 Nico, 2026-09-12, pidiendo la misma barra que inmuebles y contratos. Su
 * archivo real trae 116.469 filas: en un solo request eso es media hora
 * colgado de una conexión HTTP, sin un dato de avance.
 */

import { describe, it, expect, vi } from 'vitest';
import { aplicarAsientosCompleto } from './aplicarAsientosCompleto';
import type { InformeDeMigracion } from '@/lib/api/contabilidad.service';

function informe(over: Partial<InformeDeMigracion> = {}): InformeDeMigracion {
  return {
    lote: 'l-1',
    total: 0,
    aplicados: 0,
    restantes: 0,
    omitidos: 0,
    yaMigrados: 0,
    primerNumero: null,
    ultimoNumero: null,
    cuentasFaltantes: [],
    motivos: [],
    fallasAlEscribir: [],
    ...over,
  };
}

describe('aplicarAsientosCompleto', () => {
  it('da la vuelta hasta que no quedan y suma lo escrito', async () => {
    const aplicar = vi
      .fn()
      .mockResolvedValueOnce(informe({ aplicados: 200, restantes: 300 }))
      .mockResolvedValueOnce(informe({ aplicados: 200, restantes: 100 }))
      .mockResolvedValueOnce(informe({ aplicados: 100, restantes: 0 }));

    const r = await aplicarAsientosCompleto(aplicar);

    expect(aplicar).toHaveBeenCalledTimes(3);
    expect(r.aplicados).toBe(500);
    expect(r.restantes).toBe(0);
  });

  it('avisa después de cada vuelta, con el total del servidor', async () => {
    const aplicar = vi
      .fn()
      .mockResolvedValueOnce(informe({ aplicados: 200, restantes: 800 }))
      .mockResolvedValueOnce(informe({ aplicados: 800, restantes: 0 }));
    const onProgreso = vi.fn();

    await aplicarAsientosCompleto(aplicar, onProgreso);

    expect(onProgreso.mock.calls.map(([p]) => p.aplicados + p.restantes)).toEqual([
      1_000, 1_000,
    ]);
  });

  /* Un back anterior al 2026-09-12 no manda `restantes`: una sola vuelta. */
  it('sin `restantes` hace UNA sola llamada', async () => {
    const aplicar = vi
      .fn()
      .mockResolvedValue(informe({ aplicados: 500, restantes: undefined }));

    await aplicarAsientosCompleto(aplicar);

    expect(aplicar).toHaveBeenCalledTimes(1);
  });

  it('«Detener» corta después de la vuelta en curso', async () => {
    const aplicar = vi.fn().mockResolvedValue(informe({ aplicados: 200, restantes: 800 }));
    let parar = false;
    const r = await aplicarAsientosCompleto(
      aplicar,
      ({ llamadas }) => {
        if (llamadas === 2) parar = true;
      },
      { debeParar: () => parar },
    );

    expect(r.detenidoPorPersona).toBe(true);
    expect(aplicar).toHaveBeenCalledTimes(2);
  });

  it('corta cuando una vuelta no escribe ninguno', async () => {
    const aplicar = vi
      .fn()
      .mockResolvedValueOnce(informe({ aplicados: 200, restantes: 800 }))
      .mockResolvedValue(informe({ aplicados: 0, restantes: 800 }));

    const r = await aplicarAsientosCompleto(aplicar);

    expect(r.detenidoSinAvance).toBe(true);
    expect(aplicar).toHaveBeenCalledTimes(2);
  });
});
