/**
 * Qué se puede hacer con un lote de egresos en cada uno de sus seis estados.
 *
 * Este archivo recorre la tabla entera a propósito: son 6 estados × 4 acciones
 * = 24 decisiones, y son las que deciden si sale plata del banco. Un `if` en el
 * JSX que se olvide de un estado deja un botón vivo donde no debería, y eso se
 * descubre con un lote pagado dos veces.
 *
 * 🔴 El caso que más importa es el de la doble firma: quien armó el lote no lo
 * aprueba. Se prueba que se avisa antes del clic CUANDO SE SABE, y que cuando
 * falta el dato NO se bloquea — porque bloquear sin dato le cierra la puerta al
 * contador que no armó el lote.
 */

import { describe, it, expect } from 'vitest';

import {
  MOTIVO_DEL_MISMO_APROBADOR,
  egresosArmables,
  faltaParaGirar,
  nombreDelArchivoDelLote,
  permisosDelLote,
  retencionesDelLote,
  sinConciliar,
  totalDelLote,
} from './egresos';
import { diaLegible } from './fechas';
import type { Egreso, EstadoDelLoteDeEgreso, LoteDeEgreso } from '@/lib/api/gastos.service';

const egreso = (extra: Partial<Egreso> = {}): Egreso => ({
  id: 'e1',
  numero: null,
  estado: 'PENDIENTE',
  beneficiarioTipo: 'PROVEEDOR',
  beneficiarioId: null,
  beneficiarioNombre: 'Ferretería El Tornillo SAS',
  beneficiarioTipoDocumento: 'NIT',
  beneficiarioDocumento: '900123456',
  banco: 'Bancolombia',
  tipoDeCuenta: 'AHORROS',
  numeroDeCuenta: '123456789',
  facturaId: 'f1',
  concepto: 'FE-4521 Cerraduras',
  valorCop: 476_000,
  retefuenteCop: 10_000,
  reteivaCop: 0,
  reteicaCop: 3_040,
  netoCop: 462_960,
  rubro: 'oficina',
  sedeId: null,
  loteId: null,
  fechaDelEgreso: null,
  asientoId: null,
  asientoNumero: null,
  movimientoBancarioId: null,
  motivoDeLaAnulacion: null,
  ...extra,
});

const lote = (
  estado: EstadoDelLoteDeEgreso,
  extra: Partial<LoteDeEgreso> = {},
): Pick<LoteDeEgreso, 'estado' | 'cantidad' | 'creadoPorUserId' | 'pagadoAt' | 'formatoArchivo'> => ({
  estado,
  cantidad: 9,
  creadoPorUserId: 'u-armador',
  pagadoAt: null,
  formatoArchivo: 'BANCOLOMBIA_PAB',
  ...extra,
});

describe('egresosArmables', () => {
  it('sólo los PENDIENTE: los de otro lote y los pagados no entran', () => {
    const armables = egresosArmables([
      egreso({ id: 'a', estado: 'PENDIENTE' }),
      egreso({ id: 'b', estado: 'EN_LOTE' }),
      egreso({ id: 'c', estado: 'PAGADO' }),
      egreso({ id: 'd', estado: 'ANULADO' }),
    ]);
    expect(armables.map((e) => e.id)).toEqual(['a']);
  });
});

describe('las sumas del lote', () => {
  it('🔴 el total es la suma de los NETOS: es lo que sale del banco', () => {
    // Si sumara `valorCop` diría 952.000 y el archivo del banco pediría
    // 925.920: el lote no cuadraría con la plata que salió.
    expect(totalDelLote([egreso(), egreso({ id: 'e2' })])).toBe(925_920);
  });

  it('las retenciones del lote son las tres de cada egreso', () => {
    expect(retencionesDelLote([egreso(), egreso({ id: 'e2' })])).toBe(26_080);
  });

  it('cuenta los pagados que nadie conció contra el extracto', () => {
    expect(
      sinConciliar([
        egreso({ estado: 'PAGADO', movimientoBancarioId: null }),
        egreso({ id: 'e2', estado: 'PAGADO', movimientoBancarioId: 'mb1' }),
        egreso({ id: 'e3', estado: 'PENDIENTE' }),
      ]),
    ).toBe(1);
  });
});

describe('permisosDelLote — la tabla entera', () => {
  it('BORRADOR: se aprueba y se anula; el archivo y el pago no', () => {
    const p = permisosDelLote(lote('BORRADOR'));
    expect(p.aprobar.puede).toBe(true);
    expect(p.anular.puede).toBe(true);
    expect(p.archivo.puede).toBe(false);
    expect(p.pagado.puede).toBe(false);
    expect(p.archivo.motivo).toContain('aprobar');
  });

  it('ESPERANDO_APROBACION: igual que borrador', () => {
    const p = permisosDelLote(lote('ESPERANDO_APROBACION'));
    expect(p.aprobar.puede).toBe(true);
    expect(p.archivo.puede).toBe(false);
  });

  it('APROBADO: sale el archivo, no se vuelve a aprobar', () => {
    const p = permisosDelLote(lote('APROBADO'));
    expect(p.archivo.puede).toBe(true);
    expect(p.aprobar.puede).toBe(false);
    expect(p.aprobar.motivo).toContain('ya está aprobado');
  });

  it('🔴 APROBADO no se marca pagado: primero se sube el archivo al banco', () => {
    const p = permisosDelLote(lote('APROBADO'));
    expect(p.pagado.puede).toBe(false);
    expect(p.pagado.motivo).toContain('archivo');
    expect(p.pagado.motivo).toContain('salida que no ocurrió');
  });

  it('ARCHIVO_GENERADO: se marca pagado y se puede volver a bajar el archivo', () => {
    const p = permisosDelLote(lote('ARCHIVO_GENERADO'));
    expect(p.pagado.puede).toBe(true);
    expect(p.archivo.puede).toBe(true);
  });

  it('PAGADO: nada se toca, y la anulación manda a anular cada egreso', () => {
    const p = permisosDelLote(lote('PAGADO', { pagadoAt: '2026-09-20' }));
    expect(p.aprobar.puede).toBe(false);
    expect(p.archivo.puede).toBe(false);
    expect(p.pagado.puede).toBe(false);
    expect(p.anular.puede).toBe(false);
    // La fecha con el mismo formateador que el resto del libro, no una copia
    // del texto: el locale del entorno decide «20 de sept de 2026».
    expect(p.anular.motivo).toContain(diaLegible('2026-09-20'));
    expect(p.anular.motivo).toContain('cada egreso');
  });

  it('ANULADO: las cuatro acciones dicen que está anulado', () => {
    const p = permisosDelLote(lote('ANULADO'));
    for (const accion of ['aprobar', 'archivo', 'pagado', 'anular'] as const) {
      expect(p[accion].puede).toBe(false);
      expect(p[accion].motivo).toContain('anulado');
    }
  });

  it('un lote vacío no se aprueba', () => {
    const p = permisosDelLote(lote('BORRADOR', { cantidad: 0 }));
    expect(p.aprobar.puede).toBe(false);
    expect(p.aprobar.motivo).toContain('vacío');
  });

  it('toda acción imposible trae su motivo escrito, nunca un motivo nulo', () => {
    const estados: EstadoDelLoteDeEgreso[] = [
      'BORRADOR',
      'ESPERANDO_APROBACION',
      'APROBADO',
      'ARCHIVO_GENERADO',
      'PAGADO',
      'ANULADO',
    ];
    for (const estado of estados) {
      const p = permisosDelLote(lote(estado, { pagadoAt: '2026-09-20' }));
      for (const accion of ['aprobar', 'archivo', 'pagado', 'anular'] as const) {
        if (!p[accion].puede) {
          expect(p[accion].motivo, `${estado} → ${accion}`).toBeTruthy();
        } else {
          expect(p[accion].motivo, `${estado} → ${accion}`).toBeNull();
        }
      }
    }
  });
});

describe('🔴 la doble firma', () => {
  it('a quien armó el lote se le dice antes del clic', () => {
    const p = permisosDelLote(lote('BORRADOR', { creadoPorUserId: 'u-yo' }), 'u-yo');
    expect(p.aprobar.puede).toBe(false);
    expect(p.aprobar.motivo).toContain('otra persona');
  });

  it('a otra persona se le deja aprobar', () => {
    const p = permisosDelLote(lote('BORRADOR', { creadoPorUserId: 'u-otro' }), 'u-yo');
    expect(p.aprobar.puede).toBe(true);
  });

  it('🔴 P-4 aclarado (24-09): al ADMINISTRADOR que lo armó no se le apaga (no se confirma a sí mismo)', () => {
    const p = permisosDelLote(lote('BORRADOR', { creadoPorUserId: 'u-yo' }), 'u-yo', true);
    expect(p.aprobar).toEqual({ puede: true, motivo: null });
    // Y a quien no es administrador, el motivo lo dice.
    expect(permisosDelLote(lote('BORRADOR', { creadoPorUserId: 'u-yo' }), 'u-yo', false).aprobar.motivo).toContain(
      'Sólo lo que arma un administrador queda aprobado por él mismo (P-4)',
    );
  });

  it('sin saber quién soy NO se bloquea: el 409 del back es la autoridad', () => {
    expect(permisosDelLote(lote('BORRADOR')).aprobar.puede).toBe(true);
    expect(permisosDelLote(lote('BORRADOR'), null).aprobar.puede).toBe(true);
  });

  it('sin saber quién armó el lote tampoco se bloquea', () => {
    const p = permisosDelLote(lote('BORRADOR', { creadoPorUserId: null }), 'u-yo');
    expect(p.aprobar.puede).toBe(true);
  });

  it('el motivo del 409 nombra la segunda firma y quién sí puede', () => {
    expect(MOTIVO_DEL_MISMO_APROBADOR).toContain('segunda firma');
    expect(MOTIVO_DEL_MISMO_APROBADOR).toContain('CONTADOR');
  });
});

describe('faltaParaGirar', () => {
  it('un egreso completo no le falta nada', () => {
    expect(faltaParaGirar(egreso())).toEqual([]);
  });

  it('dice exactamente qué falta, en el orden del archivo del banco', () => {
    expect(
      faltaParaGirar(egreso({ banco: null, numeroDeCuenta: null, beneficiarioDocumento: null })),
    ).toEqual(['el banco', 'el número de cuenta', 'el documento del beneficiario']);
  });
});

describe('nombreDelArchivoDelLote', () => {
  it('lleva el id y el formato en minúscula', () => {
    expect(nombreDelArchivoDelLote('l1', 'BANCOLOMBIA_PAB')).toBe(
      'egresos-lote-l1-bancolombia_pab.csv',
    );
  });

  it('sin formato no inventa uno', () => {
    expect(nombreDelArchivoDelLote('l1', null)).toBe('egresos-lote-l1.csv');
  });
});
