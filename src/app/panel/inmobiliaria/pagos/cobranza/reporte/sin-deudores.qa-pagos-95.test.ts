/**
 * CB-12 (QA-PAGOS-95 ronda 2): el reporte diario sin deudores dice «—» en
 * «% recuperado», no «100 %» (una cifra que no sale de nada).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { sinDeudores } from '@/lib/cobranza/reporte-sin-deudores'

describe('CB-12 · reporte diario sin deudores', () => {
  it('🔴 sin deudores y sin morosidad no hay de qué recuperar', () => {
    expect(sinDeudores({ top_debtors: [], summary: { indice_morosidad_pct: 0 } })).toBe(true)
    expect(sinDeudores({ top_debtors: [{}], summary: { indice_morosidad_pct: 0 } })).toBe(false)
    expect(sinDeudores({ top_debtors: [], summary: { indice_morosidad_pct: 4.5 } })).toBe(false)
  })
  it('el «% recuperado» se calla sin deudores', () => {
    const p = readFileSync(join(process.cwd(), 'src/app/panel/inmobiliaria/pagos/cobranza/reporte/page.tsx'), 'utf8')
    expect(p).toMatch(/if \(sinDeudores\(data\)\) return null/)
  })
})
