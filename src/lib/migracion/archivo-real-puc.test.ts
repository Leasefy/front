/**
 * El archivo REAL del plan de cuentas entra con sus seis columnas reconocidas.
 *
 * 🔴 Los ENCABEZADOS son los reales; las FILAS son inventadas con la misma
 * forma (códigos y nombres del Decreto 2650, que es público).
 */

import { describe, expect, it } from 'vitest';
import { armarCuentas, COLUMNAS_DE_CUENTA } from './columnas-de-cuenta';
import { mapearColumnas, obligatoriasSinMapear } from './columnas-de-tercero';

/** El encabezado de «WhatsApp Cuentas PUC.csv», en su orden. */
export const ENCABEZADO_PUC = [
  'Nombre',
  'Código',
  'Control de Terceros',
  'Caja o Banco',
  'Último Nivel',
  'Habilitado',
];

describe('el PUC real: el encabezado', () => {
  const mapeo = mapearColumnas(COLUMNAS_DE_CUENTA, ENCABEZADO_PUC);
  const porColumna = Object.fromEntries(mapeo.map((m) => [m.columna, m.campo]));

  it('no deja NINGUNA de las 6 columnas sin mapear', () => {
    expect(mapeo.filter((m) => !m.campo).map((m) => m.columna)).toEqual([]);
  });

  it('cada columna cae en su campo', () => {
    expect(porColumna).toEqual({
      Nombre: 'nombre',
      'Código': 'codigo',
      'Control de Terceros': 'controlDeTerceros',
      'Caja o Banco': 'cajaOBanco',
      'Último Nivel': 'ultimoNivel',
      Habilitado: 'habilitado',
    });
  });

  it('no falta ninguna obligatoria', () => {
    expect(obligatoriasSinMapear(COLUMNAS_DE_CUENTA, mapeo)).toEqual([]);
  });
});

describe('el PUC real: los valores', () => {
  const mapeo = mapearColumnas(COLUMNAS_DE_CUENTA, ENCABEZADO_PUC);

  it('convierte SI/NO a banderas y manda las cuatro', () => {
    const [cuenta] = armarCuentas(
      [
        {
          Nombre: 'CAJA GENERAL',
          'Código': '110505',
          'Control de Terceros': 'NO',
          'Caja o Banco': 'SI',
          'Último Nivel': 'SI',
          Habilitado: 'SI',
        },
      ],
      mapeo,
    );
    expect(cuenta).toEqual({
      codigo: '110505',
      nombre: 'CAJA GENERAL',
      ultimoNivel: true,
      habilitado: true,
      controlDeTerceros: false,
      cajaOBanco: true,
    });
  });

  it('una cuenta mayor deshabilitada llega como tal, no como habilitada', () => {
    const [cuenta] = armarCuentas(
      [
        {
          Nombre: 'ACTIVO',
          'Código': '1',
          'Control de Terceros': 'NO',
          'Caja o Banco': 'NO',
          'Último Nivel': 'NO',
          Habilitado: 'NO',
        },
      ],
      mapeo,
    );
    expect(cuenta.ultimoNivel).toBe(false);
    expect(cuenta.habilitado).toBe(false);
  });

  /*
   * El DTO del back declara estas banderas `@IsBoolean()`. Una celda que no
   * dice ni SI ni NO no puede viajar como `undefined` disfrazado de `false`:
   * la clave simplemente no va, y el back deduce (o deja el valor de antes).
   */
  it('una celda que no dice ni SI ni NO no manda la bandera', () => {
    const [cuenta] = armarCuentas(
      [
        {
          Nombre: 'CAJA',
          'Código': '1105',
          'Control de Terceros': '',
          'Caja o Banco': 'tal vez',
          'Último Nivel': 'SI',
          Habilitado: '',
        },
      ],
      mapeo,
    );
    expect(cuenta).toEqual({ codigo: '1105', nombre: 'CAJA', ultimoNivel: true });
  });
});
