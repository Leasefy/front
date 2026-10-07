/**
 * 🔴 N-14 (QA-PAGOS-95, 05-10-2026): «Resumen Octubre De 2026» (Dispersiones),
 * «Octubre De 2026» (Cobros emitidos) y «Oct De 2026» (tabla de dispersiones).
 * La clase `capitalize` de CSS sube CADA palabra; en español sólo va la inicial
 * (`mesEnTitulo`). Guardián estático: estos tres no vuelven a usarla.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ARCHIVOS = ['DispersionResumen.tsx', 'CobroResumen.tsx', 'DispersionTable.tsx']

describe('N-14 · los meses de Dispersiones y Cobros sin `capitalize`', () => {
  it.each(ARCHIVOS)('%s no sube cada palabra del mes', (archivo) => {
    const fuente = readFileSync(join(process.cwd(), 'src/components/inmobiliaria', archivo), 'utf8')
    expect(fuente).not.toMatch(/className="[^"]*\bcapitalize\b/)
  })
})
