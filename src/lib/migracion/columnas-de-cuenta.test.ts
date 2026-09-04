/**
 * El archivo del plan de cuentas → lo que se manda a revisar.
 *
 * Lo que se congela: que el auto-mapeo reconozca los encabezados con que
 * exportan los programas de contabilidad, que un archivo de dos columnas
 * (código y nombre) alcance, y que nada se interprete acá — el back decide
 * qué significa «D» o «Sí», así que las celdas viajan como vienen.
 */

import { describe, expect, it } from 'vitest';

import { mapearColumnas, obligatoriasSinMapear } from './columnas-de-tercero';
import { armarCuentas, COLUMNAS_DE_CUENTA } from './columnas-de-cuenta';

describe('el auto-mapeo del plan de cuentas', () => {
  it('reconoce el export de Siigo/World Office: Código, Nombre, Naturaleza', () => {
    const mapeo = mapearColumnas(COLUMNAS_DE_CUENTA, ['Código', 'Nombre', 'Naturaleza']);
    expect(mapeo.map((m) => m.campo)).toEqual(['codigo', 'nombre', 'naturaleza']);
  });

  it('con «Cuenta» y «Descripción» también se entiende', () => {
    const mapeo = mapearColumnas(COLUMNAS_DE_CUENTA, ['Cuenta', 'Descripción']);
    expect(mapeo.map((m) => m.campo)).toEqual(['codigo', 'nombre']);
    expect(obligatoriasSinMapear(COLUMNAS_DE_CUENTA, mapeo)).toEqual([]);
  });

  it('sólo código y nombre son obligatorias: un archivo de dos columnas alcanza', () => {
    const obligatorias = COLUMNAS_DE_CUENTA.filter((c) => c.obligatoria).map((c) => c.campo);
    expect(obligatorias).toEqual(['codigo', 'nombre']);
  });
});

describe('armarCuentas', () => {
  const mapeo = mapearColumnas(COLUMNAS_DE_CUENTA, ['Código', 'Nombre', 'Naturaleza', 'Imputable']);

  it('manda cada celda como viene: el back es quien la interpreta', () => {
    const [c] = armarCuentas(
      [{ Código: '1105-05', Nombre: ' Caja general ', Naturaleza: 'D', Imputable: 'Sí' }],
      mapeo,
    );
    expect(c).toEqual({
      codigo: '1105-05',
      nombre: 'Caja general',
      naturaleza: 'D',
      imputable: 'Sí',
    });
  });

  it('omite las claves opcionales vacías en vez de mandar «»', () => {
    // Con `forbidNonWhitelisted` una clave de más es 400; una clave vacía no,
    // pero «naturaleza: ""» obligaría al back a distinguir vacío de ausente.
    const [c] = armarCuentas([{ Código: '1105', Nombre: 'Caja', Naturaleza: '', Imputable: '' }], mapeo);
    expect(c).toEqual({ codigo: '1105', nombre: 'Caja' });
  });

  it('un número de Excel llega como texto', () => {
    const [c] = armarCuentas([{ Código: 110505, Nombre: 'Caja general' }], mapeo);
    expect(c.codigo).toBe('110505');
  });

  it('un booleano real de Excel se conserva como booleano', () => {
    const [c] = armarCuentas([{ Código: '1105', Nombre: 'Caja', Imputable: false }], mapeo);
    expect(c.imputable).toBe(false);
  });

  it('salta las filas totalmente vacías (las que Excel deja al final)', () => {
    const cuentas = armarCuentas(
      [{ Código: '1105', Nombre: 'Caja' }, { Código: '', Nombre: '' }, {}],
      mapeo,
    );
    expect(cuentas).toHaveLength(1);
  });

  it('una fila con código y sin nombre SÍ viaja: el back la marca, no se pierde en silencio', () => {
    const cuentas = armarCuentas([{ Código: '1105', Nombre: '' }], mapeo);
    expect(cuentas).toEqual([{ codigo: '1105', nombre: '' }]);
  });

  it('recorta lo que rompería el @MaxLength del DTO, para que el archivo llegue entero', () => {
    const [c] = armarCuentas([{ Código: '1'.repeat(80), Nombre: 'x'.repeat(400) }], mapeo);
    expect(c.codigo).toHaveLength(40);
    expect(c.nombre).toHaveLength(300);
  });
});
