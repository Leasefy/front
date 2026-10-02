import { describe, expect, it } from 'vitest'
import {
  MENSAJES_DEL_PERFIL,
  PRESUPUESTO_MAXIMO_COP,
  esDiaDelCalendario,
  revisarPreferenciasDelInquilino,
} from './preferencias-del-inquilino'

/**
 * 02-10-2026 · El paso 2 del inquilino ataja ANTES lo que el back rechazaría,
 * con las MISMAS frases (espejo de `back/src/users/dto/limites-del-perfil.ts`).
 */
const base = { budgetMin: 1_000_000, budgetMax: 2_500_000 }

describe('revisarPreferenciasDelInquilino', () => {
  it('un paso completo y razonable no tiene errores', () => {
    expect(
      revisarPreferenciasDelInquilino({
        ...base,
        preferredZones: ['Bogotá'],
        preferredAmenities: ['parking'],
        moveInDate: '2026-11-01',
        hasPets: true,
        petDetails: 'Un gato',
      }),
    ).toEqual({})
  })

  it('🔴 el caso de QA: 30.000.000.000 es un error en el máximo, con la frase del back', () => {
    expect(revisarPreferenciasDelInquilino({ ...base, budgetMax: 30_000_000_000 })).toEqual({
      budgetMax: MENSAJES_DEL_PERFIL.presupuestoMaximo,
    })
  })

  it('el tope cabe en la columna int4', () => {
    expect(PRESUPUESTO_MAXIMO_COP).toBeLessThanOrEqual(2_147_483_647)
  })

  /*
   * 02-10-2026 · Nico: el tope es $100.000.000 al mes, el mismo número y la
   * misma frase que `back/src/users/dto/limites-del-perfil.ts`.
   */
  it('🔴 el tope de Nico: $100.000.000 pasa; un peso más es el error con la frase del back', () => {
    expect(revisarPreferenciasDelInquilino({ budgetMin: 100_000_000, budgetMax: 100_000_000 })).toEqual({})
    expect(revisarPreferenciasDelInquilino({ ...base, budgetMax: 100_000_001 })).toEqual({
      budgetMax: 'El presupuesto no puede pasar de $100.000.000 al mes. Revisa que no sobren ceros.',
    })
    expect(revisarPreferenciasDelInquilino({ budgetMin: 150_000_000, budgetMax: 150_000_000 })).toMatchObject({
      budgetMin: 'El presupuesto no puede pasar de $100.000.000 al mes. Revisa que no sobren ceros.',
    })
  })

  it('falta el presupuesto: la frase de siempre del paso', () => {
    expect(revisarPreferenciasDelInquilino({})).toEqual({
      budgetMin: MENSAJES_DEL_PERFIL.faltaPresupuesto,
      budgetMax: MENSAJES_DEL_PERFIL.faltaPresupuesto,
    })
  })

  it('el máximo menor que el mínimo, en el máximo', () => {
    expect(revisarPreferenciasDelInquilino({ budgetMin: 3_000_000, budgetMax: 1_000_000 })).toEqual({
      budgetMax: MENSAJES_DEL_PERFIL.maximoMenorQueMinimo,
    })
  })

  it('fecha que no es un día real, o fuera de 2000–2100', () => {
    expect(revisarPreferenciasDelInquilino({ ...base, moveInDate: '2026-02-31' }).moveInDate).toBe(
      MENSAJES_DEL_PERFIL.fechaDeMudanza,
    )
    expect(revisarPreferenciasDelInquilino({ ...base, moveInDate: '20255-01-01' }).moveInDate).toBe(
      MENSAJES_DEL_PERFIL.fechaDeMudanza,
    )
    expect(revisarPreferenciasDelInquilino({ ...base, moveInDate: '1999-12-31' }).moveInDate).toBe(
      MENSAJES_DEL_PERFIL.fechaDeMudanzaFueraDeRango,
    )
  })

  it('topes de zonas, amenidades y mascotas', () => {
    const r = revisarPreferenciasDelInquilino({
      ...base,
      preferredZones: Array.from({ length: 11 }, (_, i) => `Zona ${i}`),
      preferredAmenities: ['x'.repeat(41)],
      hasPets: true,
      petDetails: 'g'.repeat(501),
    })
    expect(r).toEqual({
      preferredZones: MENSAJES_DEL_PERFIL.zonasMaximas,
      preferredAmenities: MENSAJES_DEL_PERFIL.amenidadLarga,
      petDetails: MENSAJES_DEL_PERFIL.mascotasLargo,
    })
  })

  it('sin mascotas, la descripción no cuenta (no viaja al back)', () => {
    expect(revisarPreferenciasDelInquilino({ ...base, hasPets: false, petDetails: 'g'.repeat(501) })).toEqual({})
  })
})

describe('esDiaDelCalendario (lo mismo que EsDiaDelCalendario del back)', () => {
  it.each([
    ['2026-11-01', true],
    ['2026-11-01T00:00:00.000Z', true],
    ['2026-02-31', false],
    ['2024-W05', false],
    ['20240101', false],
    ['mañana', false],
  ])('%s → %s', (valor, esperado) => {
    expect(esDiaDelCalendario(valor)).toBe(esperado)
  })
})
