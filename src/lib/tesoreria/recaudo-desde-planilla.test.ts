import { describe, it, expect } from 'vitest';
import { armarFilasDelRecaudo, esPlanilla } from './recaudo-desde-planilla';
import { reconocerColumnas } from '@/lib/importar/reconocer-columnas';
import { CAMPOS_DEL_RECAUDO } from './recaudo-desde-planilla';

/** El recaudo desde un Excel o CSV (Nico, 20-10-2026). Datos SINTÉTICOS. */
describe('el recaudo desde una planilla', () => {
  const encabezados = ['Fecha Pago', 'Cédula', 'Nombre', 'Vlr Recaudado', 'No. Transacción'];
  const filas = [
    { _rowIndex: 1, 'Fecha Pago': '02/11/2026', Cédula: '1.046.667.907', Nombre: 'Persona Uno', 'Vlr Recaudado': '$ 1.845.151', 'No. Transacción': 'T-1' },
    { _rowIndex: 2, 'Fecha Pago': '02/11/2026', Cédula: '', Nombre: 'Sin cédula', 'Vlr Recaudado': '500000', 'No. Transacción': 'T-2' },
    { _rowIndex: 3, 'Fecha Pago': '', Cédula: '', Nombre: '', 'Vlr Recaudado': '', 'No. Transacción': '' },
  ];

  it('reconoce las columnas por su título y arma las filas', () => {
    const { mapeo } = reconocerColumnas(encabezados, filas, CAMPOS_DEL_RECAUDO);
    expect(mapeo).toMatchObject({ referencia: 'Cédula', valor: 'Vlr Recaudado', fecha: 'Fecha Pago', secuencia: 'No. Transacción', pagador: 'Nombre' });
    const r = armarFilasDelRecaudo(filas, mapeo, 0);
    expect(r.filas).toEqual([
      { linea: 2, referencia: '1.046.667.907', valorCop: 1845151, fecha: '2026-11-02', secuencia: 'T-1', oficina: null, pagador: 'Persona Uno' },
    ]);
    expect(r.sinArmar).toEqual([{ linea: 3, motivo: 'No trae referencia ni cédula.' }]);
  });

  it('un Excel siempre es planilla; un CSV sólo si el convenio no es delimitado', () => {
    expect(esPlanilla('recaudo.xlsx', true)).toBe(true);
    expect(esPlanilla('recaudo.csv', false)).toBe(true);
    expect(esPlanilla('recaudo.csv', true)).toBe(false);
    expect(esPlanilla('recaudo.txt', false)).toBe(false);
  });
});
