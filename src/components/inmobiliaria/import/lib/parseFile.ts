// src/components/inmobiliaria/import/lib/parseFile.ts
// Lectura de planillas en el cliente con SheetJS: xlsx, xls, csv, tsv, txt,
// ods y fods. El separador (`,`, `;`, tab) lo detecta SheetJS solo.

import type { ParsedRow } from './importTypes';

export interface ParseResult {
  rows: ParsedRow[];
  headers: string[];
  sheetNames: string[];
}

/**
 * Formatos que llegan como TEXTO plano. SheetJS adivina el separador solo, así
 * que `;` —lo que exporta Excel en español—, tab y coma funcionan sin
 * configurar nada. Verificado con los tres.
 */
const EXTENSIONES_DE_TEXTO = ['csv', 'txt', 'tsv'];

/**
 * Decodifica un archivo de texto AVERIGUANDO su codificación, en vez de
 * asumirla.
 *
 * Antes era `await file.text()` —UTF-8 a ciegas— con el comentario «para
 * preservar los acentos». Hace justo lo contrario con el archivo más común
 * acá: Excel en español exporta CSV en **Windows-1252**, y leído como UTF-8
 * «Bogotá» queda `Bogot?`. Eso entraba tal cual al inmueble, sin un error.
 *
 * UTF-8 es autoverificable: una secuencia inválida no es UTF-8. Probamos en
 * estricto y, si el archivo no lo es, cae a Windows-1252 — que acepta
 * cualquier byte, por eso va último y nunca al revés.
 */
function decodificarTexto(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);

  // BOM UTF-8: el archivo declara su codificación, no hay nada que adivinar.
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

/**
 * Lee la planilla que sea. Import dinámico para que xlsx no entre al chunk
 * principal.
 */
export async function parseSpreadsheetFile(
  file: File,
  sheetName?: string
): Promise<ParseResult> {
  const XLSX = await import('xlsx');

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const buffer = await file.arrayBuffer();

  // Los binarios (xlsx/xls/ods) traen su codificación adentro; los de texto
  // no, y por eso hay que deducirla.
  const workbook = EXTENSIONES_DE_TEXTO.includes(ext)
    ? XLSX.read(decodificarTexto(buffer), { type: 'string' })
    : XLSX.read(buffer, { type: 'array', codepage: 65001 });

  const sheetNames = workbook.SheetNames;
  const targetSheet = sheetName && sheetNames.includes(sheetName)
    ? sheetName
    : sheetNames[0];

  const worksheet = workbook.Sheets[targetSheet];

  // Convert sheet to JSON — defval ensures empty cells produce '' instead of undefined
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    raw: false,
  });

  if (rawData.length === 0) {
    return {
      rows: [],
      headers: [],
      sheetNames,
    };
  }

  // Extract headers from first row keys
  const headers = Object.keys(rawData[0]);

  // Filter out empty rows and add _rowIndex (1-based)
  const rows: ParsedRow[] = rawData
    .filter((row) => Object.values(row).some((v) => v !== '' && v !== null && v !== undefined))
    .map((row, index) => ({
      _rowIndex: index + 1,
      ...row,
    }));

  return { rows, headers, sheetNames };
}

/**
 * Baja la plantilla .xlsx con los encabezados que esperamos.
 *
 * ⚠️ NO usar `XLSX.writeFile()` acá. Esa función es de Node: escribe con `fs`.
 * Importada como módulo en el navegador **no tira ningún error y tampoco baja
 * nada** — el clic se sentía muerto, sin consola, sin toast, sin archivo. Fue
 * exactamente así como llegó reportada.
 *
 * En el navegador hay que armar los bytes con `XLSX.write({type:'array'})` y
 * disparar la descarga a mano con un Blob y un <a download>.
 */
export async function downloadTemplate(): Promise<void> {
  const XLSX = await import('xlsx');

  // T-0038 §3.8 — Departamento/Tipo de Negocio/Precio de Venta/Fecha de
  // Consignación added. Headers are positionally aligned with exampleRow —
  // '!cols' below derives its width array from `headers.length`.
  const headers = [
    'Título',
    'Dirección',
    'Ciudad',
    'Barrio',
    'Departamento',
    'Tipo Inmueble',
    'Tipo de Negocio',
    'Canon Mensual',
    'Precio de Venta',
    'Administración',
    'Comisión %',
    'Área m2',
    'Habitaciones',
    'Baños',
    'Propietario',
    'Tel Propietario',
    'Estado',
    'Observaciones',
    'Fecha de Consignación',
  ];

  // Create a worksheet with a header row and two example rows
  const exampleRow = [
    'Apartamento El Prado',
    'Calle 123 # 45-67',
    'Bogotá',
    'El Prado',
    'Cundinamarca',
    'Apartamento',
    'Arriendo',
    '2500000',
    '',
    '350000',
    '10',
    '85',
    '3',
    '2',
    'Juan Pérez',
    '3101234567',
    'Disponible',
    'Parqueadero incluido',
    '',
  ];

  const worksheetData = [headers, exampleRow];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Style the header row width
  worksheet['!cols'] = headers.map(() => ({ wch: 20 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Propiedades');

  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  descargar(
    new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    'plantilla-leasefy.xlsx',
  );
}

/** Dispara la descarga de un Blob con el nombre pedido. */
function descargar(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revocar en el siguiente tick: hacerlo de inmediato cancela la descarga en
  // algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
