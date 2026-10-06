/**
 * El espejo de los topes de la migración (02-10-2026): los MISMOS números y
 * las MISMAS frases que el back
 * (`back/src/contracts/dto/limites-de-la-migracion-de-contratos.ts` y
 * `back/src/contracts/migracion/fecha-de-corte.service.ts`), para atajar en
 * el cliente lo que el back rechazaría.
 */
import { describe, expect, it } from 'vitest';
import {
  CANON_MAXIMO_AL_CORREGIR,
  MAX_CONTRATOS_POR_ARCHIVO,
  MENSAJES_DE_LA_MIGRACION as M,
  errorDeLaComision,
  errorDeLaFechaDeCorte,
  errorDelCanon,
  errorDelDiaDePago,
  erroresDeLasFechas,
} from './limites-de-la-migracion';
import { MAX_FILAS_POR_LOTE } from '@/lib/api/migracion-terceros.service';

describe('los números son los del back', () => {
  it('el canon al corregir: $2.000.000.000, debajo del int4 de la columna', () => {
    expect(CANON_MAXIMO_AL_CORREGIR).toBe(2_000_000_000);
    expect(CANON_MAXIMO_AL_CORREGIR).toBeLessThanOrEqual(2_147_483_647);
  });

  it('un archivo de contratos y uno de terceros: 5.000 filas, el mismo tope', () => {
    expect(MAX_CONTRATOS_POR_ARCHIVO).toBe(5_000);
    expect(MAX_FILAS_POR_LOTE).toBe(MAX_CONTRATOS_POR_ARCHIVO);
  });

  it('las frases son las del back, palabra por palabra', () => {
    expect(M.canonMaximoAlCorregir).toBe(
      'El canon no puede pasar de $2.000.000.000 al mes. Revisa que no sobren ceros.',
    );
    expect(M.demasiadosContratos).toBe(
      'Un archivo puede traer hasta 5.000 contratos. Pártelo en dos archivos y súbelos por separado.',
    );
    expect(M.fechaDeCorteFueraDeRango).toBe(
      'La fecha de corte tiene que estar entre el año 2000 y un año hacia adelante.',
    );
  });
});

describe('errorDelCanon', () => {
  it('un canon real sirve, y el tope exacto también', () => {
    expect(errorDelCanon('1850000')).toBeNull();
    expect(errorDelCanon(String(CANON_MAXIMO_AL_CORREGIR))).toBeNull();
  });

  it('🔴 once cifras: la frase del tope, antes de mandar nada', () => {
    expect(errorDelCanon('30000000000')).toBe(M.canonMaximoAlCorregir);
    expect(errorDelCanon(String(CANON_MAXIMO_AL_CORREGIR + 1))).toBe(M.canonMaximoAlCorregir);
  });

  it('cero, negativo o con decimales dice cuál es el problema', () => {
    expect(errorDelCanon('0')).toBe(M.canonMinimo);
    expect(errorDelCanon('-5')).toBe(M.canonMinimo);
    expect(errorDelCanon('1500000.5')).toBe(M.canonEntero);
    expect(errorDelCanon('abc')).toBe(M.canonEntero);
  });
});

describe('errorDelDiaDePago', () => {
  it('del 1 al 28 sirve; lo demás dice el rango', () => {
    expect(errorDelDiaDePago('1')).toBeNull();
    expect(errorDelDiaDePago('28')).toBeNull();
    expect(errorDelDiaDePago('30')).toBe(M.diaDePago);
    expect(errorDelDiaDePago('0')).toBe(M.diaDePago);
    expect(errorDelDiaDePago('5.5')).toBe(M.diaDePago);
  });
});

describe('errorDeLaComision', () => {
  it('vacía no se manda; de 0 a 100 sirve (el 0 % es real); fuera, la frase', () => {
    expect(errorDeLaComision('')).toBeNull();
    expect(errorDeLaComision('0')).toBeNull();
    expect(errorDeLaComision('100')).toBeNull();
    expect(errorDeLaComision('150')).toBe(M.comision);
    expect(errorDeLaComision('-1')).toBe(M.comision);
  });
});

describe('erroresDeLasFechas', () => {
  it('dos fechas en orden: nada que decir', () => {
    expect(erroresDeLasFechas('2025-03-01', '2026-02-28')).toEqual({});
  });

  it('un contrato viejo (1998) también sirve: hay migrados de hace años', () => {
    expect(erroresDeLasFechas('1998-03-01', '1999-02-28')).toEqual({});
  });

  it('el fin antes del inicio se dice en el fin', () => {
    expect(erroresDeLasFechas('2026-03-01', '2026-02-28')).toEqual({ endDate: M.finAntesDelInicio });
  });

  it('un año de cinco cifras (lo deja escribir el <input type="date">) es fuera de rango', () => {
    expect(erroresDeLasFechas('20255-01-01', '2026-02-28')).toEqual({
      startDate: M.fechaFueraDeRango,
    });
  });
});

describe('errorDeLaFechaDeCorte', () => {
  const hoy = new Date('2026-10-02T12:00:00.000Z');

  it('un día real entre el 2000 y un año adelante sirve', () => {
    expect(errorDeLaFechaDeCorte('2026-09-01', hoy)).toBeNull();
    expect(errorDeLaFechaDeCorte('2000-01-01', hoy)).toBeNull();
  });

  it('un día que no existe dice que no es del calendario', () => {
    expect(errorDeLaFechaDeCorte('2026-02-30', hoy)).toBe(M.fechaDeCorteInvalida);
  });

  it('antes del 2000 o a más de un año: la frase del rango del back', () => {
    expect(errorDeLaFechaDeCorte('1999-12-31', hoy)).toBe(M.fechaDeCorteFueraDeRango);
    expect(errorDeLaFechaDeCorte('2028-01-01', hoy)).toBe(M.fechaDeCorteFueraDeRango);
  });
});
