/**
 * Regresión con el archivo REAL de muestras: `03-inmuebles.csv` pasa entero
 * por el mapeo automático y por el chequeo de completitud, con las MISMAS
 * opciones de lectura que usa `parseFile.ts` (`defval: ''`, `raw: false`).
 *
 * Si alguien toca las keywords del mapeo o el limpiador numérico y este
 * archivo deja de entrar completo, este test lo dice antes que una
 * inmobiliaria.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

import { autoMapColumns } from './columnMapping';
import { mapRowsToProperties } from './gapFiller';
import { faltantesParaElBack } from './requisitosDelBack';
import type { ParsedRow } from './importTypes';

const RUTA = join(
  process.cwd(),
  'claudedocs/erp-financiero/muestras/03-inmuebles.csv',
);

function leerComoParseFile(): { headers: string[]; rows: ParsedRow[] } {
  // El mismo camino que `parseSpreadsheetFile`: texto → XLSX.read → sheet_to_json.
  const texto = readFileSync(RUTA, 'utf-8').replace(/^﻿/, '');
  const workbook = XLSX.read(texto, { type: 'string' });
  const hoja = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, {
    defval: '',
    raw: false,
  });
  const headers = Object.keys(data[0]);
  const rows = data.map((row, i) => ({ _rowIndex: i + 1, ...row }));
  return { headers, rows };
}

describe('03-inmuebles.csv — el archivo de muestra entra entero', () => {
  const { headers, rows } = leerComoParseFile();
  const mapeo = autoMapColumns(headers);

  it('trae las 120 filas', () => {
    expect(rows).toHaveLength(120);
  });

  it('cada columna que tiene campo nuestro queda mapeada a él', () => {
    const porColumna = new Map(mapeo.map((m) => [m.sourceColumn, m.targetField]));
    expect(porColumna.get('Título')).toBe('propertyTitle');
    expect(porColumna.get('Dirección')).toBe('propertyAddress');
    expect(porColumna.get('Ciudad')).toBe('propertyCity');
    expect(porColumna.get('Barrio')).toBe('propertyZone');
    expect(porColumna.get('Departamento')).toBe('propertyDepartment');
    expect(porColumna.get('Tipo Inmueble')).toBe('propertyType');
    expect(porColumna.get('Tipo de Negocio')).toBe('listingType');
    expect(porColumna.get('Canon Mensual')).toBe('monthlyRent');
    expect(porColumna.get('Precio de Venta')).toBe('salePrice');
    expect(porColumna.get('Administración')).toBe('adminFee');
    expect(porColumna.get('Comisión %')).toBe('commissionPercent');
    expect(porColumna.get('Área m2')).toBe('propertyArea');
    expect(porColumna.get('Habitaciones')).toBe('bedrooms');
    expect(porColumna.get('Baños')).toBe('bathrooms');
    expect(porColumna.get('Propietario')).toBe('ownerName');
    expect(porColumna.get('Tel Propietario')).toBe('ownerPhone');
    expect(porColumna.get('Fecha de Consignación')).toBe('consignedAt');
  });

  it('las 120 filas quedan completas para el back: ninguna con faltantes', () => {
    const propiedades = mapRowsToProperties(rows, mapeo);
    const conFaltantes = propiedades
      .map((p) => ({ fila: p._rowIndex, faltan: faltantesParaElBack(p) }))
      .filter((r) => r.faltan.length > 0);
    expect(conFaltantes).toEqual([]);
  });

  it('la plata llega entera: ningún canon menor que el mínimo por un separador mal leído', () => {
    const propiedades = mapRowsToProperties(rows, mapeo);
    for (const p of propiedades) {
      if (p.monthlyRent != null) {
        expect(p.monthlyRent, `fila ${p._rowIndex}`).toBeGreaterThanOrEqual(100_000);
      }
      if (p.salePrice != null) {
        expect(p.salePrice, `fila ${p._rowIndex}`).toBeGreaterThanOrEqual(1_000_000);
      }
    }
  });
});
