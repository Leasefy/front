import { describe, expect, it } from 'vitest'
import { esIdDeInmueble, mesDeHoyEnColombia, moverElMes, nombreDelMesDeLaGestion, porcentajeDeLaGestion } from './gestiones-de-leasefy'

describe('Las gestiones de Leasefy en el admin', () => {
  it('el porcentaje y el mes en palabras', () => {
    expect(porcentajeDeLaGestion(500)).toBe('5 %')
    expect(porcentajeDeLaGestion(750)).toBe('7,5 %')
    expect(nombreDelMesDeLaGestion('2026-10')).toBe('octubre de 2026')
  })
  it('moverse de mes cruza el año', () => {
    expect(moverElMes('2026-01', -1)).toBe('2025-12')
    expect(moverElMes('2026-12', 1)).toBe('2027-01')
  })
  it('el mes de hoy es el de Colombia (a las 2 a. m. UTC del 1.º todavía es el mes anterior)', () => {
    expect(mesDeHoyEnColombia(new Date('2026-11-01T02:00:00Z'))).toBe('2026-10')
  })
  it('el inmueble se pide por su id', () => {
    expect(esIdDeInmueble('0f8fad5b-d9cb-469f-a165-70867728950e')).toBe(true)
    expect(esIdDeInmueble('Cra 43A # 1-50')).toBe(false)
  })
})
