import { describe, expect, it } from 'vitest';

import { CAMPOS_DE_CARTERA } from '@/lib/cobranza/cartera-del-archivo';
import {
  detectarFilaDeEncabezado,
  documentoDeLaCelda,
  normalizarEncabezado,
  primeraFilaSonDatos,
  reconocerColumnas,
  telefonosDeLaCelda,
} from '../reconocer-columnas';

/** Filas de mentira con la forma del archivo del cliente (20-10-2026). */
function filas(encabezados: string[], datos: unknown[][]): Record<string, unknown>[] {
  return datos.map((d) => Object.fromEntries(encabezados.map((e, i) => [e, d[i]])));
}

const DEL_CLIENTE = ['Contrato', 'Documento Inquilino', 'Inquilino', 'Valor adeudado a la fecha', 'Contacto'];
const DATOS_DEL_CLIENTE = [
  [101, 71234567, 'ANA MARIA RESTREPO GOMEZ', 2227182, 3001234567],
  [202, 1020304050, 'CARLOS ANDRES PEREZ RUIZ', 4270260, 3109876543],
  [303, 43111222, 'LUZ ELENA ZAPATA', 2101808, 3157778899],
];

describe('el archivo de cartera del cliente (20-10): «Documento Inquilino», «Inquilino», «Contacto»', () => {
  it('encuentra el documento, el nombre, el teléfono, la deuda y el contrato', () => {
    const { mapeo } = reconocerColumnas(DEL_CLIENTE, filas(DEL_CLIENTE, DATOS_DEL_CLIENTE), CAMPOS_DE_CARTERA);
    expect(mapeo).toMatchObject({
      contrato: 'Contrato',
      documento: 'Documento Inquilino',
      nombre: 'Inquilino',
      deuda: 'Valor adeudado a la fecha',
      telefono: 'Contacto',
    });
    // «a la fecha» no la vuelve la columna del vencimiento.
    expect(mapeo.vencimiento).toBeUndefined();
  });

  it('«Contacto» con correos adentro es el correo, no el teléfono', () => {
    const enc = ['Cédula', 'Nombre', 'Contacto', 'Celular'];
    const { mapeo } = reconocerColumnas(
      enc,
      filas(enc, [
        ['71234567', 'Ana Gómez', 'ana@correo.co', '300 123 4567'],
        ['43111222', 'Luz Zapata', 'luz@correo.co', '315-777-8899'],
      ]),
      CAMPOS_DE_CARTERA,
    );
    expect(mapeo).toMatchObject({ documento: 'Cédula', nombre: 'Nombre', telefono: 'Celular', correo: 'Contacto' });
  });
});

describe('como venga: otras formas de escribir lo mismo', () => {
  it.each([
    [['C.C.', 'Nombre del arrendatario', 'Cel.', 'Saldo en mora', 'Fecha de vencimiento', 'No. Contrato']],
    [['NIT / CC', 'NOMBRES Y APELLIDOS', 'TELÉFONO.', 'SALDO', 'VENCE', 'Número de contrato']],
    [['identificacion', 'cliente', 'whatsapp', 'deuda total', 'fecha limite de pago', 'cod contrato']],
  ])('%j', (enc) => {
    const datos = filas(enc, [
      ['71.234.567', 'Ana María Restrepo', '+57 300 123 4567', '$ 2.227.182', '05/10/2026', '101'],
      ['1020304050', 'Carlos Pérez Ruiz', '3109876543', '4,270,260', '2026-09-05', '202'],
    ]);
    const { mapeo } = reconocerColumnas(enc, datos, CAMPOS_DE_CARTERA);
    expect(mapeo.documento).toBe(enc[0]);
    expect(mapeo.nombre).toBe(enc[1]);
    expect(mapeo.telefono).toBe(enc[2]);
    expect(mapeo.deuda).toBe(enc[3]);
    expect(mapeo.vencimiento).toBe(enc[4]);
    expect(mapeo.contrato).toBe(enc[5]);
  });

  it('no toma el documento ni el teléfono del PROPIETARIO o del CODEUDOR', () => {
    const enc = ['Cédula propietario', 'Cédula', 'Nombre propietario', 'Inquilino', 'Teléfono codeudor', 'Teléfono'];
    const { mapeo } = reconocerColumnas(
      enc,
      filas(enc, [['8000000', '71234567', 'Pedro Dueño', 'Ana Gómez', '3001112233', '3001234567']]),
      CAMPOS_DE_CARTERA,
    );
    expect(mapeo).toMatchObject({ documento: 'Cédula', nombre: 'Inquilino', telefono: 'Teléfono' });
  });

  it('nombres y apellidos en dos columnas', () => {
    const enc = ['Documento', 'Nombres', 'Apellidos', 'Celular'];
    const { mapeo } = reconocerColumnas(
      enc,
      filas(enc, [['71234567', 'Ana María', 'Restrepo Gómez', '3001234567']]),
      CAMPOS_DE_CARTERA,
    );
    expect(mapeo).toMatchObject({ nombres: 'Nombres', apellidos: 'Apellidos' });
    expect(mapeo.nombre).toBeUndefined();
  });

  it('una columna sin nombre conocido pero llena de celulares se toma como teléfono', () => {
    const enc = ['Documento', 'Nombre', 'Dato 3'];
    const { mapeo } = reconocerColumnas(
      enc,
      filas(enc, [
        ['71234567', 'Ana Gómez', '3001234567'],
        ['43111222', 'Luz Zapata', '3157778899'],
      ]),
      CAMPOS_DE_CARTERA,
    );
    expect(mapeo.telefono).toBe('Dato 3');
  });
});

describe('dónde empieza la tabla', () => {
  it('con título, inmobiliaria y fecha de corte arriba, el encabezado está en la fila 4', () => {
    const matriz = [
      ['INMOBILIARIA EJEMPLO S.A.S.', '', ''],
      ['Reporte de cartera', '', ''],
      ['Corte: 20/10/2026', '', ''],
      ['Cédula', 'Nombre', 'Celular', 'Saldo'],
      ['71234567', 'Ana Gómez', '3001234567', '1.000.000'],
    ];
    expect(detectarFilaDeEncabezado(matriz, CAMPOS_DE_CARTERA)).toBe(3);
  });

  it('un archivo sin títulos: la primera fila son datos', () => {
    expect(primeraFilaSonDatos(['71234567', 'Ana Gómez', '3001234567', '1.000.000'], CAMPOS_DE_CARTERA)).toBe(true);
    expect(primeraFilaSonDatos(['Cédula', 'Nombre', 'Celular'], CAMPOS_DE_CARTERA)).toBe(false);
  });

  it('sin títulos, reconoce por los valores (y lo confirma la persona)', () => {
    const enc = ['Columna A', 'Columna B', 'Columna C'];
    const { mapeo } = reconocerColumnas(
      enc,
      filas(enc, [
        ['Ana María Gómez', '3001234567', 'ana@correo.co'],
        ['Luz Elena Zapata', '3157778899', 'luz@correo.co'],
      ]),
      CAMPOS_DE_CARTERA,
      { sinEncabezados: true },
    );
    expect(mapeo).toMatchObject({ nombre: 'Columna A', telefono: 'Columna B', correo: 'Columna C' });
  });
});

describe('los valores de una celda', () => {
  it.each([
    ['3001110001', ['3001110001']],
    ['+57 300 111 0001', ['3001110001']],
    ['573001110001', ['3001110001']],
    ['300-111-0001 / 300 111 0002', ['3001110001', '3001110002']],
    ['3001110001-3001110002', ['3001110001', '3001110002']],
    ['604 444 1234', ['6044441234']],
    ['3.001110001E9', ['3001110001']],
    ['sin teléfono', []],
    ['123', []],
  ])('teléfonos de %j', (celda, esperado) => {
    expect(telefonosDeLaCelda(celda)).toEqual(esperado);
  });

  it('un teléfono que Excel guardó como número', () => {
    expect(telefonosDeLaCelda(3001110001)).toEqual(['3001110001']);
  });

  it.each([
    ['8.070.550', '8070550'],
    ['C.C. 8070550', '8070550'],
    ['CC 1.000.135.316', '1000135316'],
    ['NIT 900.123.456-7', '900123456-7'],
    [8070550, '8070550'],
    ['8070550.0', '8070550'],
  ])('documento de %j', (celda, esperado) => {
    expect(documentoDeLaCelda(celda)).toBe(esperado);
  });

  it('normaliza los encabezados sin romper «Teléfono.»', () => {
    expect(normalizarEncabezado('Teléfono.')).toBe('telefono');
    expect(normalizarEncabezado('No. Contrato')).toBe('numero contrato');
    expect(normalizarEncabezado('Contrato #')).toBe('contrato numero');
  });
});
