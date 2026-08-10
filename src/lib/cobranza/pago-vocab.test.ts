/**
 * Una obligación importada no es un pago pendiente.
 *
 * Estos tests fijan la regla que estaba rota en pantalla: los 45 registros de
 * la agencia demo son `payment_method = 'cartera_import'` en `status =
 * 'pending'` — deuda que nadie intentó pagar — y se pintaban «Pendiente» en
 * ámbar, iguales a un pago esperando confirmación de la pasarela.
 */

import { describe, it, expect } from 'vitest'

import {
  ESTADOS_VISIBLES,
  ESTADO_A_FILTRO,
  estadoBadgeVariant,
  estadoVisible,
  type EstadoVisible,
} from './pago-vocab'

type Fila = Parameters<typeof estadoVisible>[0]
const fila = (status: Fila['status'], kind: Fila['kind']): Fila => ({ status, kind })

describe('estadoVisible', () => {
  it('una obligación pendiente es «por cobrar», no «pendiente»', () => {
    expect(estadoVisible(fila('pending', 'obligacion'))).toBe('porCobrar')
  })

  it('un pago pendiente es «en proceso»', () => {
    expect(estadoVisible(fila('pending', 'pago'))).toBe('enProceso')
  })

  it('los demás estados pasan tal cual, sin mirar el kind', () => {
    expect(estadoVisible(fila('approved', 'pago'))).toBe('approved')
    expect(estadoVisible(fila('declined', 'pago'))).toBe('declined')
    expect(estadoVisible(fila('disbursed', 'pago'))).toBe('disbursed')
    // Defensivo: si algún día una obligación llega aprobada, manda el status.
    expect(estadoVisible(fila('approved', 'obligacion'))).toBe('approved')
  })
})

describe('estadoBadgeVariant', () => {
  it('una deuda NO se pinta como advertencia', () => {
    // El defecto original: las 45 obligaciones de la demo en ámbar, como si
    // cada una pidiera atención. Una cartera con deuda es lo normal.
    expect(estadoBadgeVariant('porCobrar')).not.toBe('warning')
  })

  it('«por cobrar» usa una variante tokenizada, no el neutral en hex', () => {
    // `secondary` cae en el `neutral` de Cadence, que está en hex crudo y no
    // sigue el modo oscuro: 45 pastillas beige sobre la tabla negra.
    expect(estadoBadgeVariant('porCobrar')).not.toBe('secondary')
    expect(estadoBadgeVariant('porCobrar')).toBe('outline')
  })

  it('el ámbar queda para el pago que la pasarela no confirma', () => {
    expect(estadoBadgeVariant('enProceso')).toBe('warning')
  })

  it('aprobado en verde, rechazado en rojo', () => {
    expect(estadoBadgeVariant('approved')).toBe('success')
    expect(estadoBadgeVariant('declined')).toBe('destructive')
  })

  it('cubre todos los estados visibles', () => {
    for (const e of ESTADOS_VISIBLES) {
      expect(estadoBadgeVariant(e)).toBeTruthy()
    }
  })
})

describe('ESTADO_A_FILTRO', () => {
  it('traduce los dos estados que el endpoint no tiene como `status`', () => {
    expect(ESTADO_A_FILTRO.porCobrar).toBe('por_cobrar')
    expect(ESTADO_A_FILTRO.enProceso).toBe('en_proceso')
  })

  it('nunca manda `pending`: eso traería las dos cosas mezcladas', () => {
    expect(Object.values(ESTADO_A_FILTRO)).not.toContain('pending')
  })

  it('tiene una traducción por cada estado visible', () => {
    const cubiertos = ESTADOS_VISIBLES.every((e: EstadoVisible) => ESTADO_A_FILTRO[e])
    expect(cubiertos).toBe(true)
    expect(Object.keys(ESTADO_A_FILTRO)).toHaveLength(ESTADOS_VISIBLES.length)
  })
})
