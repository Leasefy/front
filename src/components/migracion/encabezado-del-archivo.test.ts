/**
 * encabezado-del-archivo — QA-MIG-B (04-10). Los exports de SIIGO, World
 * Office y Helisa traen títulos arriba; un libro de Excel puede traer
 * «Instrucciones» o «Resumen» de primera hoja. Leído desde la fila 1 de la
 * hoja 1, el archivo bueno salía con CERO cuentas o asientos.
 */
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import { COLUMNAS_DE_ASIENTO } from '@/lib/migracion/columnas-de-asiento';
import { COLUMNAS_DE_CUENTA } from '@/lib/migracion/columnas-de-cuenta';

import { elegirHojaYEncabezado, fraseDeDondeSeLeyo, mejorHojaYEncabezado } from './encabezado-del-archivo';

function libro(hojas: Record<string, unknown[][]>): File {
  const wb = XLSX.utils.book_new();
  for (const [n, aoa] of Object.entries(hojas)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), n);
  const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return new File([bytes], 'libro.xlsx');
}

describe('dónde empieza la tabla', () => {
  it('🔴 SIIGO con cinco filas de título: los encabezados están en la fila 6', async () => {
    const f = libro({
      Catálogo: [
        ['INMOBILIARIA EJEMPLO S.A.S.'], ['NIT 900.555.444-1'], ['Catálogo de cuentas'], ['Generado el 03/10/2026'], [],
        ['Código', 'Nombre', 'Nivel', 'Naturaleza', 'Estado'],
        ['1', 'ACTIVO', 1, 'Débito', 'Activo'],
      ],
    });
    const h = await elegirHojaYEncabezado(f, COLUMNAS_DE_CUENTA);
    expect(h).toMatchObject({ hoja: 'Catálogo', filaDeEncabezado: 5, obligatorias: 2 });
    expect(fraseDeDondeSeLeyo(h)).toContain('desde la fila 6');
  });

  it('🔴 la primera hoja es «Instrucciones»: se lee la que trae la tabla', async () => {
    const f = libro({
      Instrucciones: [['Cómo usar este archivo'], ['1. La hoja «Cuentas» trae el plan.']],
      Cuentas: [['Cuenta', 'Nombre de la cuenta'], ['1105', 'Caja']],
    });
    const h = await elegirHojaYEncabezado(f, COLUMNAS_DE_CUENTA);
    expect(h).toMatchObject({ hoja: 'Cuentas', filaDeEncabezado: 0, hojas: ['Instrucciones', 'Cuentas'] });
    expect(fraseDeDondeSeLeyo(h)).toContain('«Cuentas»');
  });

  it('un libro diario con títulos y la fila de totales', async () => {
    const f = libro({
      Movimiento: [
        ['EMPRESA'], ['MOVIMIENTO CONTABLE'], [],
        ['Comprobante', 'Fecha', 'Cuenta contable', 'Descripción', 'Débito', 'Crédito'],
        ['RC-1', '2026-08-05', '110505', 'Recaudo', 100, 0],
      ],
    });
    expect(await elegirHojaYEncabezado(f, COLUMNAS_DE_ASIENTO)).toMatchObject({ filaDeEncabezado: 3 });
  });

  it('un archivo de siempre (encabezados en la fila 1) no cambia nada y no dice nada', async () => {
    const f = new File(['Código;Nombre\r\n1105;Caja\r\n'], 'puc.csv');
    const h = await elegirHojaYEncabezado(f, COLUMNAS_DE_CUENTA);
    expect(h).toMatchObject({ filaDeEncabezado: 0 });
    expect(fraseDeDondeSeLeyo(h)).toBeNull();
  });

  it('sin ninguna fila reconocible se queda en la hoja 1, fila 1: no se adivina una tabla', () => {
    const h = mejorHojaYEncabezado([{ hoja: 'H', filas: [['hola'], ['a', 'b']] }], COLUMNAS_DE_CUENTA);
    expect(h).toMatchObject({ hoja: 'H', filaDeEncabezado: 0, obligatorias: 0 });
  });
});
