/**
 * 🔴 02-10-2026 · El canon del contrato y del estudio va sólo en pesos
 * enteros (Nico), con la frase EXACTA del inmueble: «Escribe el canon en
 * pesos enteros, sin centavos.». La frase va escrita a mano (no la constante)
 * para que cambiarla por error haga fallar la prueba. Es la misma que el back
 * responde en el campo si algo llegara con centavos.
 */
import { describe, expect, it } from 'vitest'
import { MENSAJES_DEL_CONTRATO, revisarTerminosDelContrato } from './limites-del-contrato'
import { MENSAJES_DEL_CONTRATO_VIGENTE } from './limites-del-contrato-vigente'
import { MENSAJES_DE_LA_MIGRACION, errorDelCanon } from '@/components/migracion/limites-de-la-migracion'
import { MENSAJES_DEL_ESTUDIO } from '@/lib/estudio/limites-del-estudio'
import { MENSAJES_DEL_INMUEBLE } from '@/lib/inmuebles/limites-del-inmueble'

const SIN_CENTAVOS = 'Escribe el canon en pesos enteros, sin centavos.'

describe('el canon, sin centavos — la misma frase que el inmueble', () => {
  it('contrato, canon nuevo del incremento, migración y estudio dicen lo mismo que el inmueble', () => {
    expect(MENSAJES_DEL_CONTRATO.canonEntero).toBe(SIN_CENTAVOS)
    expect(MENSAJES_DEL_CONTRATO_VIGENTE.canonNuevoEntero).toBe(SIN_CENTAVOS)
    expect(MENSAJES_DE_LA_MIGRACION.canonEntero).toBe(SIN_CENTAVOS)
    expect(MENSAJES_DEL_ESTUDIO.canonEntero).toBe(SIN_CENTAVOS)
    expect(MENSAJES_DEL_INMUEBLE.canonEntero).toBe(SIN_CENTAVOS)
  })

  it('🔴 los términos del contrato (crear y editar) con centavos dicen la frase en monthlyRent', () => {
    expect(revisarTerminosDelContrato({ monthlyRent: '2500000.5' }).monthlyRent).toBe(SIN_CENTAVOS)
    expect(revisarTerminosDelContrato({ monthlyRent: '2500000' }).monthlyRent).toBeUndefined()
  })

  it('🔴 la corrección a mano de una fila de la migración, también', () => {
    expect(errorDelCanon('1850000.5')).toBe(SIN_CENTAVOS)
    expect(errorDelCanon('1850000')).toBeNull()
  })
})
