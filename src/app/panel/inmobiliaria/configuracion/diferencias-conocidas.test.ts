/**
 * Las diferencias conocidas sin React: los mismos topes y las mismas frases
 * del DTO del back, y el reparto de lo que dice el back por fila.
 */
import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/client';
import {
  erroresDeLaFila,
  erroresDelServidor,
  filaNueva,
  filasDesde,
  leerPesos,
  leerPorcentaje,
  validar,
  type FilaDeDiferencia,
} from './diferencias-conocidas';

function fila(x: Partial<FilaDeDiferencia> = {}): FilaDeDiferencia {
  return { ...filaNueva(), nombre: 'Retención arrendamientos', valor: '3,5', ...x };
}

describe('leer lo que escribe la persona', () => {
  it.each([
    ['3,5', 3.5, 1],
    ['3.5', 3.5, 1],
    [' 3,50 % ', 3.5, 1],
    ['10', 10, 0],
    ['2,555', 2.555, 3],
  ])('el porcentaje «%s»', (texto, valor, decimales) => {
    expect(leerPorcentaje(texto)).toEqual({ valor, decimales });
  });
  it('«tres» no es un porcentaje', () => {
    expect(leerPorcentaje('tres')).toBeNull();
  });
  it.each([
    ['8.900', 8900],
    ['$ 8900', 8900],
    ['8900', 8900],
  ])('los pesos «%s»', (texto, valor) => {
    expect(leerPesos(texto)).toBe(valor);
  });
  it('los pesos con centavos no son pesos enteros', () => {
    expect(leerPesos('8900,50')).toBeNull();
  });
});

describe('las frases del DTO del back', () => {
  it.each([
    [{ nombre: '' }, 'nombre', 'Ponle un nombre a la diferencia.'],
    [{ nombre: 'x'.repeat(61) }, 'nombre', 'El nombre va hasta 60 caracteres.'],
    [{ valor: '' }, 'valor', 'Escribe el porcentaje de la retención.'],
    [{ valor: '0' }, 'valor', 'El porcentaje tiene que ser mayor que cero.'],
    [{ valor: '101' }, 'valor', 'El porcentaje va hasta 100.'],
    [{ valor: '3,555' }, 'valor', 'El porcentaje va con hasta dos decimales.'],
    [{ tipo: 'COMISION' as const, valor: '' }, 'valor', 'Escribe el valor de la comisión.'],
    [{ tipo: 'COMISION' as const, valor: '10.000.001' }, 'valor', 'La comisión va hasta $10.000.000.'],
    [{ tipo: 'COMISION' as const, valor: '0' }, 'valor', 'La comisión tiene que ser de al menos $1.'],
  ])('%j', (cambio, campo, frase) => {
    expect(erroresDeLaFila(fila(cambio))).toMatchObject({ [campo]: frase });
  });

  it('una fila bien armada no tiene errores', () => {
    expect(erroresDeLaFila(fila())).toEqual({});
    expect(erroresDeLaFila(fila({ tipo: 'COMISION', valor: '8.900' }))).toEqual({});
  });
});

describe('validar: lo que viaja al back', () => {
  it('cada tipo con SU campo, el nombre limpio', () => {
    const v = validar([fila({ nombre: '  Retención ' }), fila({ nombre: 'ACH', tipo: 'COMISION', valor: '8.900', aQuien: 'todos' })]);
    expect(v.errores).toEqual({});
    expect(v.diferencias).toEqual([
      { nombre: 'Retención', tipo: 'RETENCION', porcentaje: 3.5, aQuien: 'empresas' },
      { nombre: 'ACH', tipo: 'COMISION', valorCop: 8900, aQuien: 'todos' },
    ]);
  });
  it('con un error no se manda nada', () => {
    const f = fila({ valor: '' });
    expect(validar([f])).toEqual({ errores: { [f.clave]: { valor: 'Escribe el porcentaje de la retención.' } }, diferencias: null });
  });
  it('lo guardado vuelve como filas («3,5», no «3.5»)', () => {
    const [r, c] = filasDesde([
      { nombre: 'R', tipo: 'RETENCION', porcentaje: 3.5, aQuien: 'aseguradoras' },
      { nombre: 'C', tipo: 'COMISION', valorCop: 8900, aQuien: 'todos' },
    ]);
    expect(r).toMatchObject({ valor: '3,5', tipo: 'RETENCION' });
    expect(c).toMatchObject({ valor: '8900', tipo: 'COMISION' });
    expect(r.clave).not.toBe(c.clave);
  });
});

describe('lo que dice el back, por fila', () => {
  const filas = [fila(), fila({ nombre: 'C', tipo: 'COMISION', valor: '5' })];

  it('400 DATOS_INVALIDOS: cada campo va a SU fila', () => {
    const e = new ApiError(400, ['x'], 'DATOS_INVALIDOS', {
      statusCode: 400,
      code: 'DATOS_INVALIDOS',
      campos: [
        { campo: 'diferencias.1.valorCop', regla: 'max', mensaje: 'La comisión va hasta $10.000.000.' },
        { campo: 'diferencias.0.nombre', regla: 'minLength', mensaje: 'Ponle un nombre a la diferencia.' },
      ],
    });
    const r = erroresDelServidor(e, filas);
    expect(r.porFila).toEqual({
      [filas[1].clave]: { valor: 'La comisión va hasta $10.000.000.' },
      [filas[0].clave]: { nombre: 'Ponle un nombre a la diferencia.' },
    });
    expect(r.general).toBeNull();
  });

  it('400 DIFERENCIA_MAL_ARMADA: con su índice', () => {
    const e = new ApiError(400, '«C» es una comisión: va con un valor fijo en pesos y sin porcentaje.', 'DIFERENCIA_MAL_ARMADA', {
      statusCode: 400,
      code: 'DIFERENCIA_MAL_ARMADA',
      message: '«C» es una comisión: va con un valor fijo en pesos y sin porcentaje.',
      indice: 1,
    });
    expect(erroresDelServidor(e, filas).porFila).toEqual({
      [filas[1].clave]: { valor: '«C» es una comisión: va con un valor fijo en pesos y sin porcentaje.' },
    });
  });

  it('503 FALTA_UNA_MIGRACION: no se puede guardar todavía (sin el nombre de la migración)', () => {
    const r = erroresDelServidor(new ApiError(503, 'x', 'FALTA_UNA_MIGRACION'), filas);
    expect(r).toEqual({ porFila: {}, general: null, sinLaMigracion: true });
  });

  it('un 500: «de nuestro lado», nunca «conexión»', () => {
    const r = erroresDelServidor(new ApiError(500, 'boom', 'ERROR_INTERNO', { referencia: 'a1b2c3d4' }), filas);
    expect(r.general).not.toMatch(/conexi/i);
    expect(r.general).toBeTruthy();
  });
});
