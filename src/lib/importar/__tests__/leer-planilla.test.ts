import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import { armarFilasDeCartera, CAMPOS_DE_CARTERA } from '@/lib/cobranza/cartera-del-archivo';
import { leerPlanilla } from '../leer-planilla';

function archivo(nombre: string, contenido: Uint8Array | string): File {
  const bytes = typeof contenido === 'string' ? new TextEncoder().encode(contenido) : contenido;
  return new File([bytes.slice().buffer as ArrayBuffer], nombre);
}

function libro(hojas: Array<[string, unknown[][]]>, nombre = 'cartera.xlsx'): File {
  const wb = XLSX.utils.book_new();
  for (const [hoja, filas] of hojas) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(filas), hoja);
  const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return archivo(nombre, new Uint8Array(bytes));
}

describe('leer una planilla como venga', () => {
  it('el archivo del cliente (Excel, números como número) se lee entero', async () => {
    const r = await leerPlanilla(
      libro([
        [
          'Hoja1',
          [
            ['Contrato', 'Documento Inquilino', 'Inquilino', 'Valor adeudado a la fecha', 'Contacto'],
            [101, 71234567, 'ANA MARIA RESTREPO', 2227182, 3001234567],
            [202, 1020304050, 'CARLOS PEREZ', 4270260, 3109876543],
          ],
        ],
      ]),
      CAMPOS_DE_CARTERA,
    );
    expect(r.mapeo).toMatchObject({ documento: 'Documento Inquilino', nombre: 'Inquilino', telefono: 'Contacto' });
    const filas = armarFilasDeCartera(r.filas, r.mapeo);
    expect(filas.map((f) => f.problemas)).toEqual([[], []]);
    expect(filas[0]).toMatchObject({ fila: 2, documento: '71234567', telefono: '3001234567', deuda: 2227182 });
  });

  it('la hoja buena aunque no sea la primera, y el encabezado debajo del título', async () => {
    const r = await leerPlanilla(
      libro([
        ['Instrucciones', [['No modificar.'], ['Llene la hoja Cartera']]],
        [
          'Cartera',
          [
            ['INMOBILIARIA EJEMPLO'],
            ['Corte 20/10/2026'],
            [],
            ['Cédula', 'Nombre del inquilino', 'Celular', 'Saldo'],
            ['71234567', 'Ana Gómez', '300 123 4567', '$ 1.000.000'],
            ['TOTAL', '', '', '$ 1.000.000'],
          ],
        ],
      ]),
      CAMPOS_DE_CARTERA,
    );
    expect(r.hoja).toBe('Cartera');
    expect(r.mapeo).toMatchObject({ documento: 'Cédula', nombre: 'Nombre del inquilino', telefono: 'Celular', deuda: 'Saldo' });
    const filas = armarFilasDeCartera(r.filas, r.mapeo);
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ documento: '71234567', nombre: 'Ana Gómez', deuda: 1000000 });
  });

  it('un CSV con punto y coma y tildes', async () => {
    const r = await leerPlanilla(
      archivo('cartera.csv', 'Identificación;Arrendatario;Teléfono;Deuda total\n71234567;María Peña;3001234567;850.000\n'),
      CAMPOS_DE_CARTERA,
    );
    const [f] = armarFilasDeCartera(r.filas, r.mapeo);
    expect(f).toMatchObject({ documento: '71234567', nombre: 'María Peña', telefono: '3001234567', deuda: 850000 });
  });

  it('un CSV sin títulos', async () => {
    const r = await leerPlanilla(
      archivo('sin-titulos.csv', 'Ana María Gómez,3001234567,ana@correo.co\nLuz Elena Zapata,3157778899,luz@correo.co\n'),
      CAMPOS_DE_CARTERA,
    );
    expect(r.sinEncabezados).toBe(true);
    expect(r.filas).toHaveLength(2);
    expect(r.mapeo).toMatchObject({ nombre: 'Columna A', telefono: 'Columna B', correo: 'Columna C' });
  });
});
