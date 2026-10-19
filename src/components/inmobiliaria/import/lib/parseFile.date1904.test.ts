import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'

import { parseSpreadsheetFile } from './parseFile'

/** T-0168: a date-formatted cell of a 1904-system workbook is read with THAT system. */
function libro(date1904: boolean): File {
  const ws = XLSX.utils.aoa_to_sheet([['Vence'], [new Date(Date.UTC(2026, 0, 5))]], { cellDates: false })
  // Serial for 2026-01-05 in each system, with a date number format.
  const serial = date1904 ? 44565 : 46027
  ws['A2'] = { t: 'n', v: serial, z: 'yyyy-mm-dd' }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Hoja1')
  wb.Workbook = { WBProps: { date1904 } }
  const bytes = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return new File([bytes], 'informe.xlsx')
}

describe('parseSpreadsheetFile: sistema de fechas del libro (T-0168)', () => {
  it('un libro 1900 y uno 1904 con la misma fecha salen con el mismo día', async () => {
    const a = await parseSpreadsheetFile(libro(false))
    const b = await parseSpreadsheetFile(libro(true))
    expect(a.rows[0]['Vence']).toBe('2026-01-05')
    expect(b.rows[0]['Vence']).toBe('2026-01-05')
  })
})
