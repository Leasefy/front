import { describe, expect, it } from 'vitest'

import { traducir } from '@/lib/i18n/use-tr'
import { FRASES_EN } from '@/lib/i18n/frases-en'
import { fraseDelBack } from './TarjetaDeCalificacion'

const en = (es: string, vars?: Record<string, string | number>) => traducir(es, 'en', vars)
const es = (t: string, vars?: Record<string, string | number>) => traducir(t, 'es', vars)

describe('las frases de la Calificación Leasefy que vienen del back', () => {
  it('la de los meses se vuelve a armar con sus cifras', () => {
    const frase = '18 meses de historial en Leasefy: el historial pesa 55 % y los documentos 45 %.'
    expect(fraseDelBack(en, frase)).toBe('18 months of history on Leasefy: history weighs 55% and documents 45%.')
    expect(fraseDelBack(es, frase)).toBe(frase)
    expect(fraseDelBack(en, '1 mes de historial en Leasefy: el historial pesa 20 % y los documentos 80 %.')).toBe(
      '1 month of history on Leasefy: history weighs 20% and documents 80%.',
    )
  })

  it('las fijas del back (frenos, condiciones, preguntas) tienen su inglés', () => {
    for (const f of [
      'Tiene arriendo vencido sin pagar hace más de 30 días.',
      'Codeudor, fiador o póliza de arrendamiento (una de las tres)',
      'Sin historial en Leasefy todavía: la calificación sale de sus documentos.',
      '¿Le volvería a arrendar?',
      'Como lo recibió (salvo el desgaste normal)',
    ]) {
      expect(FRASES_EN[f], f).toBeTruthy()
      expect(fraseDelBack(en, f)).not.toBe(f)
    }
  })
})
