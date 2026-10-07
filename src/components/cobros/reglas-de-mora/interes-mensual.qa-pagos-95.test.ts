/**
 * PPF-05 (QA-PAGOS-95 ronda 2; Nico, 05-10-2026): la regla sugerida de interés
 * es el 2 % MENSUAL (exactamente 2 % en 30 días), no la diaria 0,0667 %.
 */
import { describe, it, expect } from 'vitest'
import { PLANTILLAS, esquemaDeRegla, VALORES_INICIALES } from './esquema'
import { describirFormula, NOMBRE_DE_LA_FORMULA } from './legible'
import { plantillasQueFaltan } from './ReglasDeMora'
import type { ReglaDeMora } from '@/lib/api/reglas-de-mora.types'

describe('PPF-05 · interés mensual', () => {
  it('🔴 la sugerida es INTERES_MENSUAL de 2', () => {
    const interes = PLANTILLAS.find((p) => p.valores.concepto === 'INTERES_DE_MORA')!
    expect(interes.valores).toMatchObject({ formula: 'INTERES_MENSUAL', valor: 2 })
  })

  it('se dice en palabras', () => {
    expect(NOMBRE_DE_LA_FORMULA.INTERES_MENSUAL).toBe('Interés mensual')
    expect(describirFormula({ formula: 'INTERES_MENSUAL', valor: 2, base: 'CANON' })).toBe(
      '2 % mensual sobre el canon, por días de mora',
    )
  })

  it('una regla de interés diaria ya guardada cubre la sugerida (no se ofrecen dos intereses)', () => {
    const diaria = {
      id: 'r1',
      concepto: 'INTERES_DE_MORA',
      disparador: 'DIAS_DE_MORA',
      formula: 'INTERES_DIARIO',
    } as ReglaDeMora
    expect(plantillasQueFaltan([diaria]).map((p) => p.id)).toEqual(['gasto-administrativo'])
  })

  it('coherencia: por días de mora y no más de 30 % al mes (los textos del back)', () => {
    const r = esquemaDeRegla.safeParse({
      ...VALORES_INICIALES,
      nombre: 'Interés',
      formula: 'INTERES_MENSUAL',
      valor: 45,
    })
    expect(r.success).toBe(false)
    expect(JSON.stringify(r.error?.issues)).toContain('MENSUAL')
  })
})
