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

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

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

  // Map rows to add _rowIndex (1-based)
  const rows: ParsedRow[] = rawData.map((row, index) => ({
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
    'Titulo',
    'Direccion',
    'Ciudad',
    'Barrio',
    'Tipo',
    'Canon mensual',
    'Cuota admin',
    'Comision %',
  ];

  // Create a worksheet with a header row and one example row
  const exampleRow = [
    'Apartamento El Prado',
    'Calle 123 # 45-67',
    'Bogotá',
    'El Prado',
    'Apartamento',
    '1500000',
    '150000',
    '10',
  ];

  const worksheetData = [headers, exampleRow];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Style the header row width
  worksheet['!cols'] = headers.map(() => ({ wch: 20 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Propiedades');

  XLSX.writeFile(workbook, 'plantilla-leasefy.xlsx');
}
