/**
 * 🔴 02-10-2026 · La plata de cada dueño de «Valor Canon»
 * (`canonPorPropietario`) va en pesos enteros (Nico, hueco 2 de S2-B2). El
 * back (`MigrarContratoDto`) ahora la topa con `@IsInt` y la frase del canon;
 * como es el camino del ARCHIVO, un 400 ahí tumba el archivo entero. Esto
 * prueba el espejo (`errorDeLaPlataPorPropietario`) y que el lector del panel
 * nunca manda algo que el back tumbaría.
 *
 * Las frases van escritas a mano para que cambiarlas por error haga fallar
 * esto.
 */
import { describe, expect, it } from 'vitest'
import { errorDeLaPlataPorPropietario } from '@/components/migracion/limites-de-la-migracion'
import { leerFilaDelArchivo } from './armar-fila'
import { mapearColumnas } from './columnas-de-contrato'

const SIN_CENTAVOS = 'Escribe el canon en pesos enteros, sin centavos.'
const NEGATIVA = 'La parte del canon de cada propietario no puede ser negativa.'

describe('errorDeLaPlataPorPropietario — la regla del back, a este lado', () => {
  it('pesos enteros (o sin lista) no opina', () => {
    expect(errorDeLaPlataPorPropietario([451_000, 649_000])).toBeNull()
    expect(errorDeLaPlataPorPropietario([0, 1_100_000])).toBeNull()
    expect(errorDeLaPlataPorPropietario(undefined)).toBeNull()
  })

  it('🔴 una parte con centavos dice la frase del canon', () => {
    expect(errorDeLaPlataPorPropietario([451_000.5, 649_000])).toBe(SIN_CENTAVOS)
  })

  it('🔴 una parte negativa dice la suya', () => {
    expect(errorDeLaPlataPorPropietario([-1, 649_000])).toBe(NEGATIVA)
  })
})

describe('el lector del archivo nunca manda centavos en `canonPorPropietario`', () => {
  const mapeo = mapearColumnas(['Propietario de Propiedad', 'Valor Canon', 'Canon Total'])
  const dos = '[1] 43090971 - LUZ ADRIANA, [2] 42979803 - MARIA VICTORIA'

  it.each([
    ['$451,000.00, $649,000.00'],
    ['$451,000.50, $649,000.49'],
    ['451000,5; 649000,25'],
  ])('🔴 «%s» viaja en pesos enteros: el back no tumba el archivo', (celda) => {
    const { fila } = leerFilaDelArchivo(
      { 'Propietario de Propiedad': dos, 'Valor Canon': celda, 'Canon Total': '$1,100,000.00' },
      mapeo,
    )
    expect(fila.canonPorPropietario).toBeDefined()
    expect(errorDeLaPlataPorPropietario(fila.canonPorPropietario)).toBeNull()
  })
})
