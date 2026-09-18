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

/**
 * Las cuatro alertas nuevas del contrato del 18-09 (§8, la portada).
 *
 * Lo que se cuida acá es lo mismo que en las de siempre, más una cosa: las
 * cuatro dependen de migraciones sin aplicar, así que sus consultas pueden
 * responder `disponible: false` o fallar. `undefined` y `null` tienen que
 * comportarse igual —sin alerta— porque la portada las pasa como `null` cuando
 * el pedido falló y como `undefined` si un back viejo no las tiene.
 */
describe('las cuatro alertas del 18-09', () => {
  it('ausentes o nulas no generan nada: el silencio no es «está todo bien»', () => {
    expect(alertasDeContabilidad(NADA)).toEqual([]);
    expect(
      alertasDeContabilidad({ ...NADA, rubros: null, facturas: null, lotes: null, exogena: null }),
    ).toEqual([]);
  });

  it('todo en cero tampoco grita', () => {
    expect(
      alertasDeContabilidad({
        ...NADA,
        rubros: { completo: true, faltantes: [] },
        facturas: { sinCausar: 0, totalCop: 0 },
        lotes: { porAprobar: 0, totalCop: 0 },
        exogena: { anio: 2025, sinVistoBueno: 0, conBloqueos: 0 },
      }),
    ).toEqual([]);
  });

  it('un mapeo incompleto SIN nombres no grita: no habría qué decir', () => {
    expect(
      alertasDeContabilidad({ ...NADA, rubros: { completo: false, faltantes: [] } }),
    ).toEqual([]);
  });

  it('las cuatro salen juntas, y después de las de siempre', () => {
    const alertas = alertasDeContabilidad({
      faltantes: faltantes(),
      balance: { cuadra: false, diferenciaCop: 1000 },
      cierre: null,
      mesAnterior: null,
      rubros: { completo: false, faltantes: ['Nómina'] },
      facturas: { sinCausar: 3, totalCop: 1_200_000 },
      lotes: { porAprobar: 1, totalCop: 12_480_000 },
      exogena: { anio: 2025, sinVistoBueno: 6, conBloqueos: 2 },
    });
    expect(alertas.map((a) => a.tipo)).toEqual([
      'NO_CUADRA',
      'RUBROS_INCOMPLETOS',
      'FACTURAS_SIN_CAUSAR',
      'LOTES_POR_APROBAR',
      'EXOGENA_SIN_VISTO_BUENO',
    ]);
  });
});

describe('describirAlerta — las cuatro nuevas', () => {
  it('rubros: nombra el guion que ya se ve y manda a la parte de rubros del mapeo', () => {
    const d = describirAlerta(
      { tipo: 'RUBROS_INCOMPLETOS', faltantes: ['Nómina', 'Gastos'] },
      pesos,
    );
    expect(d.titulo).toBe('2 rubros del P&G sin cuenta del PUC');
    expect(d.detalle).toContain('«—»');
    expect(d.accion).toEqual({
      tipo: 'ir',
      label: 'Mapear los rubros',
      href: '/panel/inmobiliaria/contabilidad/mapeo?parte=rubros',
    });
  });

  it('rubros: con más de tres nombres recorta y dice «y otros»', () => {
    const d = describirAlerta(
      { tipo: 'RUBROS_INCOMPLETOS', faltantes: ['a', 'b', 'c', 'd'] },
      pesos,
    );
    expect(d.detalle).toContain('a, b, c y otros');
  });

  it('facturas sin causar: la plata en el título y por qué importa en el detalle', () => {
    const d = describirAlerta(
      { tipo: 'FACTURAS_SIN_CAUSAR', sinCausar: 3, totalCop: 1_200_000 },
      pesos,
    );
    expect(d.titulo).toBe('3 facturas de proveedor sin causar por $1.200.000');
    expect(d.detalle).toContain('no está en el libro');
    expect(d.detalle).toContain('exógena');
    expect(d.accion).toEqual({
      tipo: 'ir',
      label: 'Ver las facturas',
      href: '/panel/inmobiliaria/contabilidad/gastos?estado=BORRADOR',
    });
  });

  it('facturas: una sola va en singular', () => {
    const d = describirAlerta(
      { tipo: 'FACTURAS_SIN_CAUSAR', sinCausar: 1, totalCop: 400_000 },
      pesos,
    );
    expect(d.titulo).toBe('1 factura de proveedor sin causar por $400.000');
  });

  it('🔴 lotes por aprobar: el detalle dice que lo aprueba OTRA persona', () => {
    const d = describirAlerta(
      { tipo: 'LOTES_POR_APROBAR', porAprobar: 1, totalCop: 12_480_000 },
      pesos,
    );
    expect(d.titulo).toBe('1 lote de egresos espera aprobación por $12.480.000');
    expect(d.detalle).toContain('distinto de quien lo armó');
    expect(d.accion).toEqual({
      tipo: 'ir',
      label: 'Ver los lotes',
      href: '/panel/inmobiliaria/contabilidad/egresos',
    });
  });

  it('exógena con bloqueos es warning y dice qué los causa', () => {
    const d = describirAlerta(
      { tipo: 'EXOGENA_SIN_VISTO_BUENO', anio: 2025, sinVistoBueno: 6, conBloqueos: 2 },
      pesos,
    );
    expect(d.severidad).toBe('warning');
    expect(d.titulo).toBe('6 formatos de exógena de 2025 sin el visto bueno del contador');
    expect(d.detalle).toContain('sin tercero');
    expect(d.detalle).toContain('sin concepto');
    expect(d.accion).toEqual({
      tipo: 'ir',
      label: 'Ver la exógena',
      href: '/panel/inmobiliaria/contabilidad/exogena?anio=2025',
    });
  });

  it('exógena sin bloqueos es info y dice que ya cuadra contra el libro', () => {
    const d = describirAlerta(
      { tipo: 'EXOGENA_SIN_VISTO_BUENO', anio: 2025, sinVistoBueno: 1, conBloqueos: 0 },
      pesos,
    );
    expect(d.severidad).toBe('info');
    expect(d.detalle).toContain('ya cuadran contra el libro');
  });

  it('las cuatro traen título, detalle y acción: la regla de Nico, sin excepción', () => {
    const nuevas = [
      { tipo: 'RUBROS_INCOMPLETOS' as const, faltantes: ['a'] },
      { tipo: 'FACTURAS_SIN_CAUSAR' as const, sinCausar: 1, totalCop: 1 },
      { tipo: 'LOTES_POR_APROBAR' as const, porAprobar: 1, totalCop: 1 },
      { tipo: 'EXOGENA_SIN_VISTO_BUENO' as const, anio: 2025, sinVistoBueno: 1, conBloqueos: 0 },
    ];
    for (const alerta of nuevas) {
      const d = describirAlerta(alerta, pesos);
      expect(d.clave, alerta.tipo).toBeTruthy();
      expect(d.titulo.length, alerta.tipo).toBeGreaterThan(10);
      expect(d.detalle.length, alerta.tipo).toBeGreaterThan(20);
      expect(d.accion.label, alerta.tipo).toBeTruthy();
    }
  });
});
