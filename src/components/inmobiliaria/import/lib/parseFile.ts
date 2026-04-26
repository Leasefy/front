// src/components/inmobiliaria/import/lib/parseFile.ts
// Client-side SheetJS file parsing for xlsx, xls, csv

import type { ParsedRow } from './importTypes';

export interface ParseResult {
  rows: ParsedRow[];
  headers: string[];
  sheetNames: string[];
}

/**
 * Parse a spreadsheet file (xlsx, xls, csv) client-side using SheetJS.
 * Uses dynamic import so xlsx is not bundled into the main chunk.
 */
export async function parseSpreadsheetFile(
  file: File,
  sheetName?: string
): Promise<ParseResult> {
  const XLSX = await import('xlsx');

  const ext = file.name.split('.').pop()?.toLowerCase();
  let workbook;

  if (ext === 'csv') {
    // Read CSV as UTF-8 text to preserve accents and special characters
    const text = await file.text();
    workbook = XLSX.read(text, { type: 'string' });
  } else {
    const buffer = await file.arrayBuffer();
    workbook = XLSX.read(buffer, { type: 'array', codepage: 65001 });
  }

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
 * Download a Leasefy template .xlsx file with the standard column headers.
 */
export async function downloadTemplate(): Promise<void> {
  const XLSX = await import('xlsx');

  const headers = [
    'Título',
    'Dirección',
    'Ciudad',
    'Barrio',
    'Tipo Inmueble',
    'Canon Mensual',
    'Administración',
    'Comisión %',
    'Área m2',
    'Habitaciones',
    'Baños',
    'Propietario',
    'Tel Propietario',
    'Estado',
    'Observaciones',
  ];

  // Create a worksheet with a header row and two example rows
  const exampleRow = [
    'Apartamento El Prado',
    'Calle 123 # 45-67',
    'Bogotá',
    'El Prado',
    'Apartamento',
    '2500000',
    '350000',
    '10',
    '85',
    '3',
    '2',
    'Juan Pérez',
    '3101234567',
    'Disponible',
    'Parqueadero incluido',
  ];

  const worksheetData = [headers, exampleRow];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Style the header row width
  worksheet['!cols'] = headers.map(() => ({ wch: 20 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Propiedades');

  XLSX.writeFile(workbook, 'plantilla-leasefy.xlsx');
}
