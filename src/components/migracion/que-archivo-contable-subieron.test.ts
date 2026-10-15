/**
 * 🔴 8.ª tanda (14-10-2026): «Sube tu archivo contable» mira las primeras
 * filas (los exports traen títulos arriba) y dice qué archivo es.
 */
import { describe, it, expect } from 'vitest';
import { queArchivoContableTraen } from './que-archivo-contable-subieron';

const TITULOS = [['INMOBILIARIA PORTOFINO S.A.S.'], ['NIT 900.123.456-7'], ['Balance de prueba por tercero'], []];

describe('queArchivoContableTraen', () => {
  it('un balance de Siigo con títulos arriba', () => {
    expect(
      queArchivoContableTraen([
        {
          hoja: 'Balance',
          filas: [
            ...TITULOS,
            ['Código cuenta contable', 'Nombre cuenta contable', 'Identificación', 'Nombre tercero', 'Saldo final'],
            ['130505', 'Clientes', '1017000222', 'Luisa', '2000000'],
          ],
        },
      ]),
    ).toBe('balance');
  });

  it('un libro diario', () => {
    expect(
      queArchivoContableTraen([
        { hoja: 'Hoja1', filas: [['Comprobante', 'Fecha', 'Descripcion', 'Cuenta', 'Debito', 'Credito']] },
      ]),
    ).toBe('libro-diario');
  });

  it('el export de comprobantes de Portofino', () => {
    expect(
      queArchivoContableTraen([
        {
          hoja: 'Documentos',
          filas: [
            ['Prefijo', 'Consecutivo', 'Tipo Doc.', 'Fecha', 'Concepto', 'Débitos', 'Créditos', 'Balance', 'Descuadrado', 'Anulado', 'Creado por'],
          ],
        },
      ]),
    ).toBe('comprobantes');
  });

  it('una hoja de instrucciones primero no confunde: se mira cada hoja', () => {
    expect(
      queArchivoContableTraen([
        { hoja: 'Instrucciones', filas: [['Lea esto primero'], ['Paso 1', 'Paso 2']] },
        { hoja: 'Datos', filas: [['Cuenta', 'Nombre', 'Saldo Anterior', 'Debitos', 'Creditos', 'Nuevo Saldo']] },
      ]),
    ).toBe('balance');
  });

  it('lo que no se reconoce: null', () => {
    expect(queArchivoContableTraen([{ hoja: 'Hoja1', filas: [['Nombre', 'Teléfono', 'Correo']] }])).toBeNull();
    expect(queArchivoContableTraen([])).toBeNull();
  });
});
