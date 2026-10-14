import { describe, it, expect } from 'vitest';

import { filasDelArchivoDeConceptos } from './leer-archivo-de-conceptos';

/** Los encabezados REALES del Conceptos.xlsx de Portofino (hoja «Productos»). */
const ENCABEZADOS = ['Nombre', 'Descripción', '% IVA', '% Retención', '% ReteIva', '% ReteIca', 'Fecha Creación', 'Creado por'];

describe('filasDelArchivoDeConceptos', () => {
  it('lee el nombre y los % con los encabezados del archivo de Portofino', () => {
    const r = filasDelArchivoDeConceptos(
      [
        { Nombre: 'Canon De Arrendamiento con IVA, RF, y Reteica - Con Iva, Retención En La Fuente Y Reteica', '% IVA': '19', '% Retención': '3.5', '% ReteIva': '', '% ReteIca': '0,8' },
        { Nombre: 'Asesoría Jurídica', '% IVA': '', '% Retención': '', '% ReteIva': '', '% ReteIca': '' },
        { Nombre: '   ', '% IVA': '19' },
      ],
      ENCABEZADOS,
    );
    expect(r.sinColumnaDeNombre).toBe(false);
    expect(r.filas).toEqual([
      {
        nombre: 'Canon De Arrendamiento con IVA, RF, y Reteica - Con Iva, Retención En La Fuente Y Reteica',
        iva: 19,
        retencion: 3.5,
        reteIva: null,
        reteIca: 0.8,
      },
      { nombre: 'Asesoría Jurídica', iva: null, retencion: null, reteIva: null, reteIca: null },
    ]);
  });

  it('sin una columna de nombre lo dice (no inventa conceptos)', () => {
    expect(filasDelArchivoDeConceptos([{ Valor: 'x' }], ['Valor']).sinColumnaDeNombre).toBe(true);
  });

  it('acepta «Concepto» como columna del nombre y no confunde «ReteIva» con el IVA', () => {
    const r = filasDelArchivoDeConceptos([{ Concepto: 'Papelería', ReteIva: '15' }], ['Concepto', 'ReteIva']);
    expect(r.filas).toEqual([{ nombre: 'Papelería', iva: null, retencion: null, reteIva: 15, reteIca: null }]);
  });
});
