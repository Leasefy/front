import { describe, expect, it } from 'vitest'

import { traducir } from '@/lib/i18n/use-tr'
import { FRASES_EN } from '@/lib/i18n/frases-en'
import { fraseDelBack, paraLaPersona } from './TarjetaDeCalificacion'

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

  // QA del 19-10-2026: en «Mi calificación» la persona se lee a sí misma; el
  // back escribe para la inmobiliaria («Tiene…», «sus documentos»).
  it('a la persona se le dicen de tú, en español y en inglés', () => {
    const frenos = [
      'Tiene arriendo vencido sin pagar hace más de 30 días.',
      'Quedó debiendo arriendo de un contrato que ya terminó.',
      'Tiene un cobro jurídico abierto por un arriendo.',
      'Una inmobiliaria dio por perdida una deuda suya de arriendo en los últimos 4 años.',
      'El nombre o el número de la cédula no coincide con el de los otros documentos: que lo revise una persona.',
      'Un documento muestra señales de haber sido editado: que lo revise una persona antes de decidir.',
      'Sólo con su historial en Leasefy: no hay un estudio de documentos de los últimos 6 meses, así que no se sabe hasta qué canon.',
      'Sin historial en Leasefy todavía: la calificación sale de sus documentos.',
      'Cómo terminaron sus contratos',
      'Con menos de 6 meses de historial y sin estudio de documentos, la calificación llega hasta B.',
    ]
    for (const f of frenos) {
      const deTu = paraLaPersona(f)
      expect(deTu, f).not.toBe(f)
      expect(deTu, f).not.toMatch(/\b(su|sus|suya)\b|^Tiene |^Quedó /)
      expect(FRASES_EN[deTu], deTu).toBeTruthy()
      expect(FRASES_EN[deTu], deTu).not.toMatch(/\b(their|theirs)\b|^Has |^Still owes/)
      expect(fraseDelBack(es, f, true)).toBe(deTu)
    }
    // La inmobiliaria sigue leyendo la del back.
    expect(fraseDelBack(es, frenos[0])).toBe(frenos[0])
    // La de los meses no habla de nadie: igual para los dos.
    const meses = '3 meses de historial en Leasefy: el historial pesa 20 % y los documentos 80 %.'
    expect(fraseDelBack(es, meses, true)).toBe(meses)
  })
})
