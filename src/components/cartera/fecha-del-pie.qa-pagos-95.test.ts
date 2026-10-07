/**
 * PG-13 (QA-PAGOS-95, 05-10-2026): el pie de Cartera por concepto decía
 * «Leído contra el 2026-10-05» (la fecha cruda del back). Deuda del mes ya la
 * escribía en palabras con `fechaLarga`; Cartera por concepto, también.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fechaLarga } from '@/lib/fechas/fecha-de-la-casa'

const leer = (ruta: string) => readFileSync(join(process.cwd(), 'src', ruta), 'utf8')

describe('PG-13 · «Leído contra el …» en palabras', () => {
  it.each(['components/cartera/CarteraPorConcepto.tsx', 'components/inmobiliaria/pagos/DeudaDelMesPanel.tsx'])(
    '🔴 %s no pinta la fecha cruda',
    (ruta) => {
      const s = leer(ruta)
      expect(s).not.toMatch(/Leído contra el \{datos\.hoy\}/)
      expect(s).toMatch(/Leído contra el \{fechaLarga\(datos\.hoy\)\}/)
    },
  )

  it('la fecha en palabras', () => {
    expect(fechaLarga('2026-10-05')).toBe('5 de octubre de 2026')
  })
})
