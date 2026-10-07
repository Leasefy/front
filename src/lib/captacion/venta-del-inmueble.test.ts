/**
 * La venta del inmueble en el cliente (Nico, 02-10-2026): los mismos topes y
 * frases que el back (`limites-de-la-captacion.ts` y los DTO de la venta), y
 * cómo se dicen las fechas y el porcentaje.
 */
import { describe, expect, it } from 'vitest'

import { ApiError } from '@/lib/api/client'
import {
  MENSAJES_DE_LA_VENTA,
  MOTIVO_DE_ANULACION_MAXIMO,
  PRECIO_DE_LA_ESCRITURA_MAXIMO_COP,
  diaEnColombia,
  diaLegible,
  errorDeLaFechaDeLaEscritura,
  errorDelMotivoDeAnulacion,
  errorDelPrecioDeLaEscritura,
  esComisionSinMigracion,
  porcentajeLegible,
} from './venta-del-inmueble'

describe('los topes de la venta (espejo del back)', () => {
  it('la fecha de la escritura: un día real, entre 1950 y 2100', () => {
    expect(errorDeLaFechaDeLaEscritura('2026-10-15')).toBeNull()
    expect(errorDeLaFechaDeLaEscritura('')).toBe(MENSAJES_DE_LA_VENTA.escrituraNoEsUnDia)
    expect(errorDeLaFechaDeLaEscritura('2026-02-30')).toBe(MENSAJES_DE_LA_VENTA.escrituraNoEsUnDia)
    expect(errorDeLaFechaDeLaEscritura('1800-01-01')).toBe(MENSAJES_DE_LA_VENTA.escrituraFueraDeRango)
  })

  it('el precio escriturado: entero, mayor que cero y hasta $100.000.000.000', () => {
    expect(errorDelPrecioDeLaEscritura('850000000')).toBeNull()
    expect(errorDelPrecioDeLaEscritura(String(PRECIO_DE_LA_ESCRITURA_MAXIMO_COP))).toBeNull()
    expect(errorDelPrecioDeLaEscritura('')).toBe(MENSAJES_DE_LA_VENTA.precioFalta)
    expect(errorDelPrecioDeLaEscritura('0')).toBe(MENSAJES_DE_LA_VENTA.precioMinimo)
    expect(errorDelPrecioDeLaEscritura(String(PRECIO_DE_LA_ESCRITURA_MAXIMO_COP + 1))).toBe(
      MENSAJES_DE_LA_VENTA.precioMaximo,
    )
  })

  it('el motivo de anular: cinco espacios no son un motivo; 500 caracteres sí, 501 no', () => {
    expect(errorDelMotivoDeAnulacion('     ')).toBe(MENSAJES_DE_LA_VENTA.motivoDeAnulacionCorto)
    expect(errorDelMotivoDeAnulacion('  Precio mal digitado  ')).toBeNull()
    expect(errorDelMotivoDeAnulacion('x'.repeat(MOTIVO_DE_ANULACION_MAXIMO))).toBeNull()
    expect(errorDelMotivoDeAnulacion('x'.repeat(MOTIVO_DE_ANULACION_MAXIMO + 1))).toBe(
      MENSAJES_DE_LA_VENTA.motivoDeAnulacionLargo,
    )
  })
})

describe('sin la tabla de las comisiones', () => {
  it('se reconoce por el código del 503, no por el texto', () => {
    const sinTabla = new ApiError(503, 'Todavía no se puede…', 'COMISION_DE_VENTA_SIN_MIGRACION', {
      statusCode: 503,
      code: 'COMISION_DE_VENTA_SIN_MIGRACION',
      message: 'Todavía no se puede registrar la comisión de venta: a esta base le falta la migración 20261002200000_comisiones_de_venta.',
    })
    expect(esComisionSinMigracion(sinTabla)).toBe(true)
    expect(esComisionSinMigracion(new ApiError(503, 'x', 'SERVICIO_NO_DISPONIBLE'))).toBe(false)
  })

  it('la frase de la pantalla no habla de migraciones', () => {
    expect(MENSAJES_DE_LA_VENTA.sinMigracion).toMatch(/^Todavía no se puede registrar la comisión de venta/)
    expect(MENSAJES_DE_LA_VENTA.sinMigracion).not.toMatch(/migraci|\d{14}/i)
  })
})

describe('cómo se dicen las cosas', () => {
  it('el día de la escritura, sin correrlo por la zona', () => {
    expect(diaLegible('2026-10-15')).toBe('15 de octubre de 2026')
    expect(diaLegible('2026-01-01T00:00:00.000Z')).toBe('1 de enero de 2026')
  })

  it('el día de un registro, en Colombia: a las 10 p. m. del 14 en Bogotá sigue siendo el 14', () => {
    expect(diaEnColombia('2026-10-15T03:00:00.000Z')).toBe('14 de octubre de 2026')
  })

  it('el porcentaje con coma decimal', () => {
    expect(porcentajeLegible(3)).toBe('3 %')
    expect(porcentajeLegible(2.5)).toBe('2,5 %')
  })
})
