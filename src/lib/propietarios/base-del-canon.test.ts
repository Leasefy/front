/**
 * ¿Causado o recaudado? La base del canon que se le muestra al propietario.
 *
 * 🔴 El extracto decía «Canon recaudado» y Liquidaciones «Canon recibido» sobre
 * el canon de las cuotas del mes, pagado o no. El rótulo sigue a la base; estas
 * funciones deciden cuál es, también con un back que todavía no la manda.
 */

import { describe, it, expect } from 'vitest';

import {
  QUE_ES_EL_CANON_CAUSADO,
  ROTULO_DEL_CANON,
  baseDeLaDispersion,
  baseDeLaLinea,
  baseDeLaLiquidacion,
  baseDeLasDispersiones,
  baseDelExtracto,
} from './base-del-canon';

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

describe('baseDeLaDispersion', () => {
  const cuota = { cuotaId: 'q-1', cobroId: null };
  const cobro = { cuotaId: null, cobroId: 'c-1' };

  it('la del back gana; si no, la columna `baseDeCalculo`', () => {
    expect(baseDeLaDispersion({ baseDelCanon: 'RECAUDADO', items: [cuota] })).toBe('RECAUDADO');
    expect(baseDeLaDispersion({ baseDeCalculo: 'CAUSADO', items: [cobro] })).toBe('CAUSADO');
    expect(baseDeLaDispersion({ baseDelCanon: null, baseDeCalculo: 'RECAUDADO', items: [] })).toBe('RECAUDADO');
  });

  it('🔴 sin nada escrito, la que sale de las cuotas es CAUSADO — también sin líneas', () => {
    expect(baseDeLaDispersion({ items: [cuota] })).toBe('CAUSADO');
    expect(baseDeLaDispersion({ baseDeCalculo: null, items: [] })).toBe('CAUSADO');
    expect(baseDeLaDispersion({})).toBe('CAUSADO');
    // Una palabra rara en la columna no se lee como RECAUDADO.
    expect(baseDeLaDispersion({ baseDeCalculo: 'OTRA', items: [] })).toBe('CAUSADO');
  });

  it('la vieja por cobros (todas sus líneas con cobro y sin cuota) es RECAUDADO', () => {
    expect(baseDeLaDispersion({ baseDeCalculo: null, items: [cobro, cobro] })).toBe('RECAUDADO');
  });
});

describe('baseDeLasDispersiones', () => {
  it('todas iguales → ésa; mezcladas → MIXTA; ninguna → CAUSADO', () => {
    expect(baseDeLasDispersiones([{ baseDelCanon: 'CAUSADO' }, { baseDelCanon: 'CAUSADO' }])).toBe('CAUSADO');
    expect(baseDeLasDispersiones([{ baseDelCanon: 'RECAUDADO' }])).toBe('RECAUDADO');
    expect(baseDeLasDispersiones([{ baseDelCanon: 'CAUSADO' }, { baseDelCanon: 'RECAUDADO' }])).toBe('MIXTA');
    expect(baseDeLasDispersiones([])).toBe('CAUSADO');
  });
});

describe('los rótulos en español', () => {
  it('son los mismos del back, y el causado no dice «recaudado» ni «recibido»', () => {
    expect(ROTULO_DEL_CANON).toEqual({
      CAUSADO: 'Canon causado',
      RECAUDADO: 'Canon recaudado',
      MIXTA: 'Canon causado y recaudado',
    });
    expect(ROTULO_DEL_CANON.CAUSADO).not.toMatch(/recaud|recibid/i);
    expect(QUE_ES_EL_CANON_CAUSADO).not.toMatch(/recaud|recibid/i);
  });
});
