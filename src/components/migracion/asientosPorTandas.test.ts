/**
 * asientosPorTandas.test.ts — 116.262 asientos entran sin partir el Excel.
 *
 * 🔴 Nico, 2026-09-12: «debemos ampliar lo del lote porque mira que pueden
 * llegar a ser muchos», frente al cartel que le pedía partir el archivo por
 * año y subirlo en 24 tandas a mano.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  aplicarPorTandas,
  revisarPorTandas,
  tandasDe,
  TOPE_DE_RECHAZADAS,
} from './asientosPorTandas';
import {
  MAX_ASIENTOS_POR_LOTE,
  type AsientoMigrado,
  type InformeDeMigracion,
  type RevisionDeLote,
} from '@/lib/api/contabilidad.service';

const asientos = (n: number): AsientoMigrado[] =>
  Array.from({ length: n }, (_, i) => ({
    fecha: '2026-01-01',
    descripcion: `Asiento ${i}`,
    numero: String(i),
    movimientos: [{ codigoCuenta: '110505', debito: '1000' }],
  }));

function revision(over: Partial<RevisionDeLote> = {}): RevisionDeLote {
  return {
    lote: 'L',
    total: 0,
    listas: 0,
    rechazadas: 0,
    yaMigradas: 0,
    cuentasFaltantes: [],
    motivos: [],
    filas: [],
    ...over,
  };
}

function informe(over: Partial<InformeDeMigracion> = {}): InformeDeMigracion {
  return {
    lote: 'L',
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

describe('tandasDe', () => {
  it('116.262 asientos son 24 tandas de 5.000', () => {
    expect(tandasDe(116_262)).toBe(24);
    expect(MAX_ASIENTOS_POR_LOTE).toBe(5_000);
  });

  it('un archivo que cabe en una llamada es una sola tanda, y uno vacío ninguna', () => {
    expect(tandasDe(5_000)).toBe(1);
    expect(tandasDe(1)).toBe(1);
    expect(tandasDe(0)).toBe(0);
  });
});

describe('revisarPorTandas', () => {
  it('🔴 parte el archivo solo y manda TODAS las tandas con el mismo nombre de lote', async () => {
    const revisar = vi.fn(async ({ asientos: a }: { lote: string; asientos: AsientoMigrado[] }) =>
      revision({ total: a.length, listas: a.length }),
    );

    const r = await revisarPorTandas('mi-lote', asientos(11_000), revisar);

    expect(revisar).toHaveBeenCalledTimes(3);
    expect(revisar.mock.calls.map((c) => c[0].asientos.length)).toEqual([5_000, 5_000, 1_000]);
    // El mismo lote en las tres: la idempotencia del back es por `(lote, clave)`,
    // así que tres nombres distintos serían tres lotes que nadie puede reintentar junto.
    expect(new Set(revisar.mock.calls.map((c) => c[0].lote))).toEqual(new Set(['mi-lote']));
    expect(r.revision.total).toBe(11_000);
    expect(r.revision.listas).toBe(11_000);
  });

  it('suma los conteos y une las cuentas que faltan por código, sin repetirlas por tanda', async () => {
    const revisar = vi
      .fn()
      .mockResolvedValueOnce(
        revision({
          total: 5_000,
          listas: 4_000,
          rechazadas: 1_000,
          cuentasFaltantes: [{ codigo: '240805', filas: [3, 7] }],
          motivos: [{ motivo: 'cuenta inexistente', filas: [3, 7] }],
        }),
      )
      .mockResolvedValueOnce(
        revision({
          total: 2_000,
          listas: 1_500,
          yaMigradas: 500,
          cuentasFaltantes: [{ codigo: '240805', filas: [9] }, { codigo: '415510', filas: [11] }],
          motivos: [{ motivo: 'cuenta inexistente', filas: [9] }],
        }),
      );

    const r = await revisarPorTandas('L', asientos(7_000), revisar);

    expect(r.revision.total).toBe(7_000);
    expect(r.revision.listas).toBe(5_500);
    expect(r.revision.rechazadas).toBe(1_000);
    expect(r.revision.yaMigradas).toBe(500);
    // «240805 no está en el PUC» se dice UNA vez, con sus tres filas juntas.
    // QA-MIG-B: las de la segunda tanda con su número en el ARCHIVO (5.000 + n).
    expect(r.revision.cuentasFaltantes).toEqual([
      { codigo: '240805', filas: [3, 7, 5_009] },
      { codigo: '415510', filas: [5_011] },
    ]);
    expect(r.revision.motivos).toEqual([{ motivo: 'cuenta inexistente', filas: [3, 7, 5_009] }]);
  });

  /*
   * 🔴 `filas` trae TODAS las del lote con su veredicto: con 116.000 asientos
   * es una segunda copia entera en memoria. Sólo se guardan las rechazadas,
   * que son las únicas que la pantalla dibuja.
   */
  it('guarda sólo las filas RECHAZADAS, no las que entraron', async () => {
    const revisar = vi.fn(async () =>
      revision({
        total: 3,
        listas: 2,
        rechazadas: 1,
        filas: [
          { fila: 1, numeroOriginal: null, estado: 'LISTO', errores: [], advertencias: [], clave: 'a' },
          { fila: 2, numeroOriginal: null, estado: 'YA_MIGRADA', errores: [], advertencias: [], clave: 'b' },
          { fila: 3, numeroOriginal: null, estado: 'RECHAZADA', errores: ['x'], advertencias: [], clave: 'c' },
        ],
      }),
    );

    const r = await revisarPorTandas('L', asientos(3), revisar, undefined, { tamano: 3 });

    expect(r.revision.filas).toHaveLength(1);
    expect(r.revision.filas[0].fila).toBe(3);
  });

  it('🔴 lo que no entra por el tope se CUENTA: truncar en silencio es mentir', async () => {
    const rechazada = (fila: number) => ({
      fila,
      numeroOriginal: null,
      estado: 'RECHAZADA' as const,
      errores: ['x'],
      advertencias: [],
      clave: `k${fila}`,
    });
    const cuantas = TOPE_DE_RECHAZADAS + 25;
    const revisar = vi.fn(async () =>
      revision({
        total: cuantas,
        rechazadas: cuantas,
        filas: Array.from({ length: cuantas }, (_, i) => rechazada(i + 1)),
      }),
    );

    const r = await revisarPorTandas('L', asientos(cuantas), revisar, undefined, { tamano: cuantas });

    expect(r.revision.filas).toHaveLength(TOPE_DE_RECHAZADAS);
    expect(r.rechazadasNoListadas).toBe(25);
    // Y el conteo del back sigue diciendo la verdad completa.
    expect(r.revision.rechazadas).toBe(cuantas);
  });

  it('informa el avance con el total del ARCHIVO, no el de la tanda', async () => {
    const vistos: { hechos: number; total: number; tanda: number; tandas: number }[] = [];
    const revisar = vi.fn(async ({ asientos: a }: { asientos: AsientoMigrado[] }) =>
      revision({ total: a.length }),
    );

    await revisarPorTandas('L', asientos(11_000), revisar, (p) => vistos.push(p));

    expect(vistos).toEqual([
      { hechos: 5_000, total: 11_000, tanda: 1, tandas: 3 },
      { hechos: 10_000, total: 11_000, tanda: 2, tandas: 3 },
      { hechos: 11_000, total: 11_000, tanda: 3, tandas: 3 },
    ]);
  });

  it('«Detener» corta entre tandas y devuelve lo revisado hasta ahí', async () => {
    const revisar = vi.fn(async ({ asientos: a }: { asientos: AsientoMigrado[] }) =>
      revision({ total: a.length }),
    );

    const r = await revisarPorTandas('L', asientos(11_000), revisar, undefined, {
      debeParar: () => true,
    });

    expect(revisar).toHaveBeenCalledTimes(1);
    expect(r.detenidoPorPersona).toBe(true);
    expect(r.revision.total).toBe(5_000);
  });
});

describe('aplicarPorTandas', () => {
  it('parte el archivo y acumula el informe de todas las tandas', async () => {
    const aplicar = vi.fn(async ({ asientos: a }: { lote: string; asientos: AsientoMigrado[] }) =>
      informe({ total: a.length, aplicados: a.length, primerNumero: 1, ultimoNumero: a.length }),
    );

    const r = await aplicarPorTandas('L', asientos(12_000), aplicar);

    expect(aplicar.mock.calls.map((c) => c[0].asientos.length)).toEqual([5_000, 5_000, 2_000]);
    expect(r.informe.aplicados).toBe(12_000);
    expect(r.informe.total).toBe(12_000);
    // El primero de todo el archivo y el último: los números los emite el back
    // en orden, así que el primero manda y el último gana.
    expect(r.informe.primerNumero).toBe(1);
    expect(r.informe.ultimoNumero).toBe(2_000);
  });

  /*
   * 🔴 Las DOS particiones anidadas. Afuera por tamaño de request; adentro por
   * el reloj del back, que devuelve a los 15 s con `restantes`. Sin la de
   * afuera el request no cabe; sin la de adentro la llamada no vuelve.
   */
  it('dentro de una tanda sigue respetando el corte por reloj del back', async () => {
    const aplicar = vi
      .fn()
      // Primera tanda: el back corta a la mitad y dice que quedan 2.000.
      .mockResolvedValueOnce(informe({ total: 5_000, aplicados: 3_000, restantes: 2_000 }))
      .mockResolvedValueOnce(informe({ total: 5_000, aplicados: 2_000, restantes: 0 }))
      // Segunda tanda, de una sola vuelta.
      .mockResolvedValueOnce(informe({ total: 1_000, aplicados: 1_000, restantes: 0 }));

    const r = await aplicarPorTandas('L', asientos(6_000), aplicar);

    expect(aplicar).toHaveBeenCalledTimes(3);
    expect(r.informe.aplicados).toBe(6_000);
    expect(r.detenidoPorPersona).toBe(false);
    expect(r.detenidoSinAvance).toBe(false);
  });

  it('«Detener» corta y lo dice; lo aplicado queda aplicado', async () => {
    const aplicar = vi.fn(async ({ asientos: a }: { asientos: AsientoMigrado[] }) =>
      informe({ total: a.length, aplicados: a.length, restantes: 0 }),
    );

    const r = await aplicarPorTandas('L', asientos(12_000), aplicar, undefined, {
      debeParar: () => true,
    });

    expect(r.detenidoPorPersona).toBe(true);
    expect(r.informe.aplicados).toBe(5_000);
  });

  it('una tanda que deja de avanzar corta el recorrido entero', async () => {
    const aplicar = vi
      .fn()
      .mockResolvedValueOnce(informe({ total: 5_000, aplicados: 0, restantes: 5_000 }))
      .mockResolvedValue(informe({ total: 5_000, aplicados: 0, restantes: 5_000 }));

    const r = await aplicarPorTandas('L', asientos(12_000), aplicar);

    expect(r.detenidoSinAvance).toBe(true);
    // No siguió con las otras dos tandas: insistir haría exactamente lo mismo.
    expect(aplicar.mock.calls.every((c) => c[0].asientos.length === 5_000)).toBe(true);
    expect(r.informe.total).toBe(5_000);
  });

  it('la barra se mueve DENTRO de la tanda, no sólo al cerrarla', async () => {
    const hechos: number[] = [];
    const aplicar = vi
      .fn()
      .mockResolvedValueOnce(informe({ total: 5_000, aplicados: 3_000, restantes: 2_000 }))
      .mockResolvedValueOnce(informe({ total: 5_000, aplicados: 2_000, restantes: 0 }));

    await aplicarPorTandas('L', asientos(5_000), aplicar, (p) => hechos.push(p.hechos));

    // 3.000 a mitad de la tanda, y 5.000 al cerrarla.
    expect(hechos).toContain(3_000);
    expect(hechos[hechos.length - 1]).toBe(5_000);
  });
});

/*
 * T-0125 · el avance de un archivo cortado. El back sabe cuánto del archivo
 * lleva escrito SÓLO si cada llamada le dice de qué archivo es (`totalDelArchivo`)
 * y en qué posición empieza (`desde`). Sin eso, cerrar el navegador a mitad
 * dejaba una carga que nadie podía reconocer como incompleta.
 */
describe('aplicarPorTandas · declara el avance del archivo', () => {
  type Cuerpo = { lote: string; asientos: AsientoMigrado[]; totalDelArchivo?: number; desde?: number };

  it('🔴 manda totalDelArchivo = el archivo ENTERO y desde = posición de la tanda, en CADA llamada', async () => {
    const aplicar = vi.fn(async ({ asientos: a }: Cuerpo) => informe({ total: a.length, aplicados: a.length }));

    await aplicarPorTandas('L', asientos(12_000), aplicar);

    expect(aplicar.mock.calls.map((c) => c[0].totalDelArchivo)).toEqual([12_000, 12_000, 12_000]);
    expect(aplicar.mock.calls.map((c) => c[0].desde)).toEqual([0, 5_000, 10_000]);
  });

  it('el desde sigue el tamaño de tanda que se use, no un 5.000 fijo', async () => {
    const aplicar = vi.fn(async ({ asientos: a }: Cuerpo) => informe({ total: a.length, aplicados: a.length }));

    await aplicarPorTandas('L', asientos(25), aplicar, undefined, { tamano: 10 });

    expect(aplicar.mock.calls.map((c) => c[0].desde)).toEqual([0, 10, 20]);
    expect(aplicar.mock.calls.every((c) => c[0].totalDelArchivo === 25)).toBe(true);
  });

  it('un MISMO lote en todas las tandas: es lo que hace que el back las cuente como un solo archivo', async () => {
    const aplicar = vi.fn(async ({ asientos: a }: Cuerpo) => informe({ total: a.length, aplicados: a.length }));

    await aplicarPorTandas('mi-lote', asientos(12_000), aplicar);

    expect(new Set(aplicar.mock.calls.map((c) => c[0].lote))).toEqual(new Set(['mi-lote']));
  });

  it('las vueltas por reloj DENTRO de una tanda reenvían el mismo desde (no avanzan el prefijo)', async () => {
    const aplicar = vi
      .fn()
      .mockResolvedValueOnce(informe({ total: 10, aplicados: 4, restantes: 6 }))
      .mockResolvedValueOnce(informe({ total: 10, aplicados: 6, restantes: 0, yaMigrados: 4 }));

    await aplicarPorTandas('L', asientos(10), aplicar);

    expect(aplicar).toHaveBeenCalledTimes(2);
    expect(aplicar.mock.calls.map((c) => c[0].desde)).toEqual([0, 0]);
    expect(aplicar.mock.calls.map((c) => c[0].totalDelArchivo)).toEqual([10, 10]);
  });

  it('un archivo vacío no llama al back: no hay nada que declarar', async () => {
    const aplicar = vi.fn();
    await aplicarPorTandas('L', [], aplicar);
    expect(aplicar).not.toHaveBeenCalled();
  });

  it('el informe lleva la `carga` de la ÚLTIMA respuesta (la más reciente del back)', async () => {
    const aplicar = vi
      .fn()
      .mockResolvedValueOnce(
        informe({ total: 5_000, aplicados: 5_000, carga: { lote: 'L', esperados: 6_000, procesados: 5_000, estado: 'ABIERTA' } }),
      )
      .mockResolvedValueOnce(
        informe({ total: 1_000, aplicados: 1_000, carga: { lote: 'L', esperados: 6_000, procesados: 6_000, estado: 'COMPLETA' } }),
      );

    const r = await aplicarPorTandas('L', asientos(6_000), aplicar);

    expect(r.informe.carga).toEqual({ lote: 'L', esperados: 6_000, procesados: 6_000, estado: 'COMPLETA' });
  });

  it('🔴 sin `carga` en la respuesta, el informe no la inventa: ausente es «no sé», no «0» ni «terminó»', async () => {
    const aplicar = vi.fn(async ({ asientos: a }: Cuerpo) => informe({ total: a.length, aplicados: a.length }));

    const r = await aplicarPorTandas('L', asientos(6_000), aplicar);

    expect(r.informe.carga).toBeUndefined();
  });
});

describe('QA-MIG-B — números de asiento del archivo entero', () => {
  it('🔴 una rechazada de la segunda tanda se muestra con su número en el archivo, y los avisos se unen', async () => {
    const revisar = vi
      .fn()
      .mockResolvedValueOnce(revision({ total: 5_000, listas: 5_000, avisos: [{ motivo: 'nota', filas: [2] }] }))
      .mockResolvedValueOnce(
        revision({
          total: 10,
          rechazadas: 1,
          avisos: [{ motivo: 'nota', filas: [4] }],
          filas: [{ fila: 4, numeroOriginal: 'X', estado: 'RECHAZADA', errores: ['x'], advertencias: [], clave: 'c' }],
        }),
      );
    const r = await revisarPorTandas('L', asientos(5_010), revisar);
    expect(r.revision.filas[0].fila).toBe(5_004);
    expect(r.revision.avisos).toEqual([{ motivo: 'nota', filas: [2, 5_004] }]);
  });
});

describe('MC-27 (MIG-C 04-10): una tanda no separa dos piezas iguales', () => {
  it('🔴 el corte se corre hacia atrás para que dos asientos sin número iguales vayan en el mismo envío', async () => {
    const igual = (): AsientoMigrado => ({
      fecha: '2026-08-20',
      descripcion: 'Comisión transferencia',
      movimientos: [{ codigoCuenta: '530505', debito: '3.500' }, { codigoCuenta: '1110', credito: '3.500' }],
    });
    const lista: AsientoMigrado[] = [...asientos(2), igual(), igual(), ...asientos(2)];
    const envios: { asientos: AsientoMigrado[]; desde?: number }[] = [];
    const aplicar = vi.fn(async (l: { asientos: AsientoMigrado[]; desde?: number }) => {
      envios.push(l);
      return {
        lote: 'L', total: l.asientos.length, aplicados: l.asientos.length, restantes: 0, omitidos: 0, yaMigrados: 0,
        primerNumero: null, ultimoNumero: null, cuentasFaltantes: [], motivos: [], fallasAlEscribir: [],
      } as unknown as InformeDeMigracion;
    });
    await aplicarPorTandas('L', lista, aplicar as never, undefined, { tamano: 3 });
    // Con tamaño 3 el corte caía entre las dos iguales (índices 2 y 3).
    const dondeVan = envios.map((e) => e.asientos.filter((a) => a.descripcion === 'Comisión transferencia').length);
    expect(dondeVan).toContain(2);
    expect(envios.map((e) => e.desde)).toEqual([0, 2, 5]);
  });
});
