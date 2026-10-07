/**
 * QA-MIGRACION-95 (mig95-contable, 06-10-2026): la fila de TOTALES de un export
 * contable se aparta, pero se DICE.
 *
 * Visto en el navegador con el libro auxiliar de SIIGO (60 movimientos + una
 * fila «TOTALES»): la pantalla decía «60 filas → 24 asientos» y nada más. El
 * lector común (`parseSpreadsheetFile`) ya separa las filas de totales del
 * final y la frase existe (`fraseDeFilasDeTotales`), pero
 * `leerTablaDelArchivo` —el que usan el plan de cuentas, el libro diario y los
 * comprobantes en Excel— la tiraba: la fila salía del conteo en silencio
 * (regla de la migración: filas del archivo = creadas + frenadas + apartadas,
 * cada una dicha).
 */
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import { COLUMNAS_DE_ASIENTO } from '@/lib/migracion/columnas-de-asiento';
import { COLUMNAS_DE_CUENTA } from '@/lib/migracion/columnas-de-cuenta';

import { leerTablaDelArchivo } from './encabezado-del-archivo';

function libro(hojas: Record<string, unknown[][]>): File {
  const wb = XLSX.utils.book_new();
  for (const [n, aoa] of Object.entries(hojas)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), n);
  const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return new File([bytes], 'libro.xlsx');
}

describe('la fila de totales de un export contable (QA-MIGRACION-95)', () => {
  it('libro diario de SIIGO con títulos y TOTALES: los movimientos y la frase que dice qué fila se apartó', async () => {
    const f = libro({
      Movimiento: [
        ['INMOBILIARIA EJEMPLO S.A.S.'], ['MOVIMIENTO CONTABLE'], ['Agosto de 2026'], [],
        ['Comprobante', 'Fecha elaboración', 'Cuenta contable', 'Descripción', 'Débito', 'Crédito'],
        ['RC-1', '2026-08-05', '11100501', 'Recaudo canon', 2350000, 0],
        ['RC-1', '2026-08-05', '13050501', 'Recaudo canon', 0, 2350000],
        ['', '', '', 'TOTALES', 2350000, 2350000],
      ],
    });
    const t = await leerTablaDelArchivo(f, COLUMNAS_DE_ASIENTO);
    expect(t.rows).toHaveLength(2);
    expect(t.frase).toContain('Leímos desde la fila 5'); // dónde están los encabezados, como siempre
    expect(t.frase).toContain('La fila 8, «TOTALES», es la de totales del archivo: no se cuenta como dato.');
  });

  it('plan de cuentas sin títulos y con «Total cuentas»: sólo la frase de los totales', async () => {
    const f = libro({
      PUC: [
        ['Código', 'Nombre'],
        ['1105', 'Caja'],
        ['Total cuentas', '1'],
      ],
    });
    const t = await leerTablaDelArchivo(f, COLUMNAS_DE_CUENTA);
    expect(t.rows).toHaveLength(1);
    expect(t.frase).toBe('La fila 3, «Total cuentas», es la de totales del archivo: no se cuenta como dato.');
  });

  it('un archivo de siempre sin títulos ni totales sigue sin frase', async () => {
    const t = await leerTablaDelArchivo(libro({ PUC: [['Código', 'Nombre'], ['1105', 'Caja']] }), COLUMNAS_DE_CUENTA);
    expect(t.frase).toBeNull();
  });
});
