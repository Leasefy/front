/**
 * El extracto como lo mande el banco (Nico, 20-10-2026: «crea un parser muy
 * potente… igual para conciliación»). Mismo lector que la cartera
 * (`lib/importar/leer-planilla.ts`) con los campos del extracto.
 */
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import { leerPlanilla } from '@/lib/importar/leer-planilla';
import {
  CAMPOS_DE_EXTRACTO,
  ajustarMapeoDeExtracto,
  armarFilasDeExtracto,
  signoDeLaNaturaleza,
} from '../extracto-bancario';

function archivo(nombre: string, contenido: Uint8Array | string): File {
  const bytes = typeof contenido === 'string' ? new TextEncoder().encode(contenido) : contenido;
  return new File([bytes.slice().buffer as ArrayBuffer], nombre);
}

function xlsx(filas: unknown[][]): File {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(filas), 'Movimientos');
  return archivo('extracto.xlsx', new Uint8Array(XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer));
}

async function leer(f: File) {
  const r = await leerPlanilla(f, CAMPOS_DE_EXTRACTO);
  const mapeo = ajustarMapeoDeExtracto(r.mapeo);
  return { r, mapeo, armadas: armarFilasDeExtracto(r.filas, mapeo) };
}

describe('el extracto como lo mande el banco', () => {
  it('con la cuenta y el rango arriba: encuentra los títulos y numera las filas como Excel', async () => {
    const { r, mapeo, armadas } = await leer(
      xlsx([
        ['BANCO EJEMPLO S.A.'],
        ['Cuenta de ahorros 123-456789-01'],
        ['Desde 01/09/2026 hasta 30/09/2026'],
        [],
        ['FECHA', 'DESCRIPCIÓN', 'SUCURSAL', 'DCTO.', 'VALOR', 'SALDO'],
        ['2026-09-03', 'PAGO PSE ANA GOMEZ', 'VIRTUAL', '123', '1.350.000', '5.350.000'],
        ['2026-09-04', 'COMISION', 'VIRTUAL', '', '-12.000', '5.338.000'],
      ]),
    );
    expect(r.filaDeEncabezado).toBe(4);
    expect(mapeo).toMatchObject({ fecha: 'FECHA', descripcion: 'DESCRIPCIÓN', valor: 'VALOR', saldo: 'SALDO' });
    expect(armadas.filas.map((f) => f.valorCop)).toEqual([1350000, -12000]);
    expect(armadas.descartadas).toEqual([]);
  });

  it('valor sin signo y «Naturaleza» D/C aparte', async () => {
    const { mapeo, armadas } = await leer(
      archivo(
        'davivienda.csv',
        'Fecha;Descripción;Referencia;Naturaleza;Valor\n03/09/2026;Abono transferencia;APTO 301;C;1.350.000\n04/09/2026;Cuota de manejo;;D;12.000\n',
      ),
    );
    expect(mapeo).toMatchObject({ naturaleza: 'Naturaleza', valor: 'Valor', referencia: 'Referencia' });
    expect(armadas.filas.map((f) => f.valorCop)).toEqual([1350000, -12000]);
  });

  it('débitos y créditos en columnas separadas', async () => {
    const { mapeo, armadas } = await leer(
      archivo('banco.csv', 'Fecha,Concepto,Débitos,Créditos,Saldo\n2026-09-03,Consignación,,"1,350,000","5,350,000"\n2026-09-04,Retiro,"200,000",,"5,150,000"\n'),
    );
    expect(mapeo).toMatchObject({ fecha: 'Fecha', descripcion: 'Concepto', debito: 'Débitos', credito: 'Créditos' });
    expect(armadas.filas.map((f) => f.valorCop)).toEqual([1350000, -200000]);
  });

  it('sin títulos: la fecha, el texto y la plata se reconocen por los valores', async () => {
    const { r, mapeo } = await leer(archivo('sin-titulos.csv', '2026-09-03,PAGO PSE ANA GOMEZ,1350000\n2026-09-04,PAGO PSE LUZ ZAPATA,900000\n'));
    expect(r.sinEncabezados).toBe(true);
    expect(mapeo.fecha).toBe('Columna A');
    expect(mapeo.valor).toBe('Columna C');
  });

  it.each([
    ['D', -1],
    ['DB', -1],
    ['Débito', -1],
    ['Cargo', -1],
    ['-', -1],
    ['C', 1],
    ['CR', 1],
    ['Crédito', 1],
    ['Abono', 1],
    ['+', 1],
    ['', null],
    ['otra cosa', null],
  ])('el signo de «%s»', (celda, signo) => {
    expect(signoDeLaNaturaleza(celda)).toBe(signo);
  });
});
