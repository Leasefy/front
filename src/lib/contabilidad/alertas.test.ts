/**
 * Las alertas de la portada — con datos en la mano.
 *
 * Lo que se congela: que cada alerta sale de un dato del back y de ninguno
 * inventado, que lo que no llegó (`null`) no grita, y que cada una trae qué
 * pasó con el número, qué hacer y un botón (regla de Nico).
 */

import { describe, expect, it } from 'vitest';

import type { AsientosFaltantes } from '@/lib/api/contabilidad.service';
import { alertasDeContabilidad, describirAlerta, type EntradaDeAlertas } from './alertas';

const NADA: EntradaDeAlertas = { faltantes: null, balance: null, cierre: null, mesAnterior: null };

const faltantes = (over: Partial<AsientosFaltantes> = {}): AsientosFaltantes => ({
  recibos: 0,
  lotes: 0,
  cobros: 0,
  total: 0,
  mapeoCompleto: true,
  eventosSinCuenta: [],
  ...over,
});

const pesos = (n: number) => `$${n.toLocaleString('es-CO')}`;

describe('alertasDeContabilidad', () => {
  it('sin datos no hay alertas: una portada que no pudo preguntar no grita', () => {
    expect(alertasDeContabilidad(NADA)).toEqual([]);
  });

  it('todo en orden tampoco: mapeo completo, nada sin asentar, libro que cuadra, mes anterior cerrado', () => {
    expect(
      alertasDeContabilidad({
        faltantes: faltantes(),
        balance: { cuadra: true, diferenciaCop: 0 },
        cierre: { cerradaHasta: '2026-08-31' },
        mesAnterior: { mes: '2026-08', hasta: '2026-08-31', asientos: 40 },
      }),
    ).toEqual([]);
  });

  it('el libro que no cuadra va primero y con la diferencia', () => {
    const [a] = alertasDeContabilidad({ ...NADA, balance: { cuadra: false, diferenciaCop: -300000 } });
    expect(a).toEqual({ tipo: 'NO_CUADRA', diferenciaCop: -300000 });
  });

  it('movimientos sin asiento: una sola alerta con el desglose y si el mapeo alcanza para reprocesar', () => {
    const [a] = alertasDeContabilidad({
      ...NADA,
      faltantes: faltantes({ total: 5, cobros: 3, recibos: 2, mapeoCompleto: false, eventosSinCuenta: ['RECIBO_CAJA'] }),
    });
    expect(a).toEqual({
      tipo: 'SIN_ASIENTO',
      total: 5,
      cobros: 3,
      recibos: 2,
      lotes: 0,
      mapeoCompleto: false,
      eventosSinCuenta: ['RECIBO_CAJA'],
    });
    // No se duplica con «mapeo incompleto»: es la misma causa.
    expect(alertasDeContabilidad({ ...NADA, faltantes: faltantes({ total: 5, mapeoCompleto: false, eventosSinCuenta: ['RECIBO_CAJA'] }) })).toHaveLength(1);
  });

  it('mapeo incompleto sin nada pendiente avisa igual: lo próximo no se va a asentar', () => {
    const [a] = alertasDeContabilidad({
      ...NADA,
      faltantes: faltantes({ mapeoCompleto: false, eventosSinCuenta: ['RECIBO_CAJA', 'IVA_GENERADO'] }),
    });
    expect(a).toEqual({ tipo: 'MAPEO_INCOMPLETO', eventosSinCuenta: ['RECIBO_CAJA', 'IVA_GENERADO'] });
  });

  it('el mes anterior con asientos y sin cerrar pide cerrarlo; cerrado o vacío, no', () => {
    const mes = { mes: '2026-08', hasta: '2026-08-31', asientos: 12 };
    expect(alertasDeContabilidad({ ...NADA, cierre: { cerradaHasta: null }, mesAnterior: mes })).toEqual([
      { tipo: 'MES_SIN_CERRAR', mes: '2026-08', hasta: '2026-08-31', asientos: 12 },
    ]);
    expect(alertasDeContabilidad({ ...NADA, cierre: { cerradaHasta: '2026-07-31' }, mesAnterior: mes })).toHaveLength(1);
    expect(alertasDeContabilidad({ ...NADA, cierre: { cerradaHasta: '2026-08-31' }, mesAnterior: mes })).toEqual([]);
    expect(alertasDeContabilidad({ ...NADA, cierre: { cerradaHasta: null }, mesAnterior: { ...mes, asientos: 0 } })).toEqual([]);
    // Sin saber hasta dónde está cerrada no se afirma nada.
    expect(alertasDeContabilidad({ ...NADA, cierre: null, mesAnterior: mes })).toEqual([]);
  });
});

describe('describirAlerta', () => {
  it('no cuadra: peligro, la diferencia en el título, y manda al balance', () => {
    const d = describirAlerta({ tipo: 'NO_CUADRA', diferenciaCop: -300000 }, pesos);
    expect(d.severidad).toBe('danger');
    expect(d.titulo).toContain('$300.000');
    expect(d.accion).toEqual({ tipo: 'ir', label: 'Ver el balance', href: '/panel/inmobiliaria/contabilidad/reportes?informe=balance' });
  });

  it('sin asiento con el mapeo completo → botón Reprocesar; incompleto → Completar el mapeo', () => {
    const base = { tipo: 'SIN_ASIENTO' as const, total: 5, cobros: 3, recibos: 2, lotes: 0, eventosSinCuenta: [] };
    const listo = describirAlerta({ ...base, mapeoCompleto: true }, pesos);
    expect(listo.titulo).toBe('5 movimientos sin asiento: 3 cobros, 2 recibos de caja');
    expect(listo.accion).toEqual({ tipo: 'reprocesar', label: 'Reprocesar' });

    const falta = describirAlerta({ ...base, mapeoCompleto: false, eventosSinCuenta: ['RECIBO_CAJA'] }, pesos);
    expect(falta.detalle).toContain('1 evento');
    expect(falta.accion).toEqual({ tipo: 'ir', label: 'Completar el mapeo', href: '/panel/inmobiliaria/contabilidad/mapeo' });
  });

  it('un solo movimiento va en singular', () => {
    const d = describirAlerta(
      { tipo: 'SIN_ASIENTO', total: 1, cobros: 0, recibos: 1, lotes: 0, mapeoCompleto: true, eventosSinCuenta: [] },
      pesos,
    );
    expect(d.titulo).toBe('1 movimiento sin asiento: 1 recibo de caja');
  });

  it('mes sin cerrar: el mes con mayúscula inicial, cuántos asientos, y la fecha a cerrar', () => {
    const d = describirAlerta({ tipo: 'MES_SIN_CERRAR', mes: '2026-08', hasta: '2026-08-31', asientos: 12 }, pesos);
    expect(d.severidad).toBe('info');
    expect(d.titulo).toBe('Agosto de 2026 tiene 12 asientos y sigue abierto');
    expect(d.accion).toEqual({ tipo: 'cerrar-mes', label: 'Cerrar el mes', hasta: '2026-08-31' });
  });

  it('mapeo incompleto: cuenta los eventos y manda al mapeo', () => {
    const d = describirAlerta({ tipo: 'MAPEO_INCOMPLETO', eventosSinCuenta: ['RECIBO_CAJA', 'IVA_GENERADO'] }, pesos);
    expect(d.titulo).toBe('2 eventos del mapeo sin cuenta');
    expect(d.accion).toEqual({ tipo: 'ir', label: 'Completar el mapeo', href: '/panel/inmobiliaria/contabilidad/mapeo' });
  });
});
