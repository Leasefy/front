import { describe, expect, it } from 'vitest';

import { diaLargo, elPeriodoEnUnaFrase, estadoDelPeriodo } from './el-periodo-en-una-frase';

describe('el período en una frase', () => {
  it('🔴 nada cerrado: «Todo está abierto», sin segunda línea que lo repita', () => {
    const f = elPeriodoEnUnaFrase(estadoDelPeriodo({ cerradaHasta: null }, false, false))!;
    expect(f.frase).toBe('Todo está abierto: cualquier fecha admite asientos.');
    expect(f.detalle).toBeNull();
    expect(f.candado).toBe('abierto');
  });

  it('cerrado: la fecha larga, en una frase', () => {
    const f = elPeriodoEnUnaFrase(estadoDelPeriodo({ cerradaHasta: '2026-08-31' }, false, false))!;
    expect(f.frase).toBe('Cerrado hasta el 31 de agosto de 2026.');
    expect(f.detalle).toMatch(/anterior/);
    expect(f.candado).toBe('cerrado');
  });

  it('la fecha que llega con hora no se corre de día', () => {
    expect(diaLargo('2025-12-31T00:00:00.000Z')).toBe('31 de diciembre de 2025');
  });

  it('🔴 un fallo NO se dice como «todo abierto»', () => {
    const f = elPeriodoEnUnaFrase(estadoDelPeriodo(null, false, true))!;
    expect(f.frase).not.toMatch(/abierto/i);
    expect(f.frase).toMatch(/No pude consultar/);
    expect(f.candado).toBe('desconocido');
  });

  it('mientras carga no afirma nada: la pantalla pone el esqueleto', () => {
    expect(elPeriodoEnUnaFrase(estadoDelPeriodo(null, true, false))).toBeNull();
    // Cargando manda aunque haya un cierre viejo en la mano.
    expect(estadoDelPeriodo({ cerradaHasta: '2026-08-31' }, true, false)).toEqual({
      tipo: 'cargando',
    });
  });
});
