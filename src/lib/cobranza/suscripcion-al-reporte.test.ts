import { describe, expect, it } from 'vitest'
import { cuantosDelEquipo, fraseDelGuardado } from './suscripcion-al-reporte'

/**
 * MORI-24 (QA-AGENTES 16-10): al tocar la suscripción no se decía nada, y
 * prender el WhatsApp con el de la inmobiliaria apagado no mandaba nada sin
 * avisarlo.
 */
describe('fraseDelGuardado', () => {
  it('el correo, prendido y apagado', () => {
    expect(fraseDelGuardado({ email_enabled: true }, null)).toBe('Listo: el reporte diario te llega por correo cada mañana.')
    expect(fraseDelGuardado({ email_enabled: false }, true)).toBe('Ya no recibes el reporte diario por correo.')
  })

  it('el WhatsApp con el de la inmobiliaria apagado dice que todavía no llega', () => {
    expect(fraseDelGuardado({ whatsapp_enabled: true }, false)).toMatch(/cuando tu inmobiliaria prenda ese envío/)
    expect(fraseDelGuardado({ whatsapp_enabled: true }, true)).toBe('Listo: el reporte diario te llega por WhatsApp.')
    expect(fraseDelGuardado({ whatsapp_enabled: false }, true)).toBe('Ya no recibes el reporte diario por WhatsApp.')
  })
})

describe('cuantosDelEquipo', () => {
  it('el sustantivo sigue al total', () => {
    expect(cuantosDelEquipo(0, 1)).toBe('0 de 1 persona')
    expect(cuantosDelEquipo(1, 1)).toBe('1 de 1 persona')
    expect(cuantosDelEquipo(2, 5)).toBe('2 de 5 personas')
  })
})
