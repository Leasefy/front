/**
 * QA-MIGRACION-95 (fork de hallazgos, 06-10-2026) — ER-01: la fila que viaja
 * al back es la de la HOJA (`_rowIndex`, la que la persona ve en su Excel),
 * para que la lista de trabajo diga «Fila 3 · Tomás» y no «Fila 2».
 */
import { describe, expect, it } from 'vitest'

import { armarFila, mapearColumnas } from './columnas-de-tercero'
import type { ColumnaDePlantilla } from '@/lib/api/migracion-terceros.service'

const COLUMNAS = [
  { campo: 'tipoDocumento', titulo: 'Tipo de documento', obligatoria: true, alias: ['tipo documento'] },
  { campo: 'documento', titulo: 'Número de documento', obligatoria: true, alias: ['documento', 'cedula'] },
  { campo: 'nombre', titulo: 'Nombre completo', obligatoria: true, alias: ['nombre', 'nombre completo'] },
] as unknown as ColumnaDePlantilla[]

describe('armarFila manda la fila de la hoja (ER-01)', () => {
  const mapeo = mapearColumnas(COLUMNAS, ['Tipo documento', 'Documento', 'Nombre completo'])

  it('con `_rowIndex` (base 0 de SheetJS: encabezado en A1, Tomás en la fila 3 del Excel = 2) viaja `filaDelArchivo` = 3', () => {
    // El lector de planillas (`parseFile`) numera en base 0: el encabezado en
    // A1 deja la primera fila de datos en 1. La persona ve esa fila como la 2.
    const fila = armarFila({ _rowIndex: 2, 'Tipo documento': 'XX', Documento: '52111002', 'Nombre completo': 'Tomás Dos' }, mapeo)
    expect((fila as { filaDelArchivo?: number }).filaDelArchivo).toBe(3)
    expect(fila.documento).toBe('52111002')
  })

  it('sin `_rowIndex` no inventa una fila', () => {
    const fila = armarFila({ 'Tipo documento': 'CC', Documento: '52111001', 'Nombre completo': 'Rosa Uno' }, mapeo)
    expect('filaDelArchivo' in fila).toBe(false)
  })
})
