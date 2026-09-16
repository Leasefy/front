/**
 * ¿Causado o recaudado? La base del canon que se le muestra al propietario.
 *
 * 🔴 El extracto decía «Canon recaudado» y Liquidaciones «Canon recibido» sobre
 * el canon de las cuotas del mes, pagado o no. El rótulo sigue a la base; estas
 * funciones deciden cuál es, también con un back que todavía no la manda.
 */

import { describe, it, expect } from 'vitest';

import { baseDeLaLinea, baseDeLaLiquidacion, baseDelExtracto } from './base-del-canon';

describe('baseDeLaLinea', () => {
  it('si el back la manda, ésa', () => {
    expect(baseDeLaLinea({ baseDelCanon: 'RECAUDADO', cuotaId: 'q-1' })).toBe('RECAUDADO');
    expect(baseDeLaLinea({ baseDelCanon: 'CAUSADO', cuotaId: null, cobroId: 'c-1' })).toBe('CAUSADO');
  });

  it('sin el campo: la línea de una cuota es CAUSADO, la de un cobro viejo (sin cuota) RECAUDADO', () => {
    expect(baseDeLaLinea({ cuotaId: 'q-1', cobroId: null })).toBe('CAUSADO');
    expect(baseDeLaLinea({ cuotaId: 'q-1', cobroId: 'c-1' })).toBe('CAUSADO');
    expect(baseDeLaLinea({ cuotaId: null, cobroId: 'c-1' })).toBe('RECAUDADO');
    expect(baseDeLaLinea({})).toBe('CAUSADO');
  });
});

describe('baseDelExtracto', () => {
  it('la del back gana', () => {
    expect(baseDelExtracto({ baseDelCanon: 'MIXTA', lineItems: [] })).toBe('MIXTA');
  });

  it('sin la del back, sale de las líneas: sólo cuotas → CAUSADO, sólo cobros → RECAUDADO, las dos → MIXTA', () => {
    const cuota = { cuotaId: 'q-1', cobroId: null };
    const cobro = { cuotaId: null, cobroId: 'c-1' };
    expect(baseDelExtracto({ lineItems: [cuota, cuota] })).toBe('CAUSADO');
    expect(baseDelExtracto({ lineItems: [cobro] })).toBe('RECAUDADO');
    expect(baseDelExtracto({ lineItems: [cuota, cobro] })).toBe('MIXTA');
  });

  it('un extracto sin líneas es CAUSADO: lo que aparezca saldrá de las cuotas', () => {
    expect(baseDelExtracto({ lineItems: [] })).toBe('CAUSADO');
  });
});

describe('baseDeLaLiquidacion', () => {
  it('la que devuelve la vista previa; sin ella, el default del endpoint (CAUSADO)', () => {
    expect(baseDeLaLiquidacion({ base: 'RECAUDADO' })).toBe('RECAUDADO');
    expect(baseDeLaLiquidacion({ base: 'CAUSADO' })).toBe('CAUSADO');
    expect(baseDeLaLiquidacion({})).toBe('CAUSADO');
    expect(baseDeLaLiquidacion(null)).toBe('CAUSADO');
  });
});
