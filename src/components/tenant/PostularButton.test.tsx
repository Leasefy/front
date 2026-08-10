/**
 * La decisión del gate de postulación.
 *
 * Reglas que se protegen acá:
 *  · aprobado y dentro del tope → NO se estorba (motivo null)
 *  · sin tope conocido → tampoco se estorba: no se le niega algo a alguien
 *    por un dato que todavía no tenemos
 *  · cada bloqueo tiene su motivo propio, porque cada uno se explica distinto
 */

import { describe, it, expect } from 'vitest'
import { motivoDeBloqueo } from './PostularButton'
import { cabeEnTope, estaVigente, type Aprobacion } from '@/lib/api/aprobacion.service'

const APROBADA: Aprobacion = {
  estado: 'aprobado',
  topeAprobadoCop: 2_000_000,
  aseguradoras: [],
  vigenteHasta: '2099-01-01T00:00:00.000Z',
  resueltoEn: null,
  condicionada: false,
  canonConsultadoCop: null,
}

describe('motivoDeBloqueo', () => {
  it('aprobado y dentro del tope no estorba', () => {
    expect(motivoDeBloqueo({ aprobacion: APROBADA, vigente: true, canonCop: 1_500_000 })).toBeNull()
  })

  it('el canon exactamente igual al tope entra', () => {
    expect(motivoDeBloqueo({ aprobacion: APROBADA, vigente: true, canonCop: 2_000_000 })).toBeNull()
  })

  it('por encima del tope bloquea con su motivo', () => {
    expect(motivoDeBloqueo({ aprobacion: APROBADA, vigente: true, canonCop: 2_000_001 })).toBe(
      'sobre_tope',
    )
  })

  it('sin tope conocido NO bloquea — no se niega por un dato que falta', () => {
    const sinTope = { ...APROBADA, topeAprobadoCop: null }
    expect(motivoDeBloqueo({ aprobacion: sinTope, vigente: true, canonCop: 99_000_000 })).toBeNull()
  })

  it('sin canon (no sabemos el precio) no bloquea', () => {
    expect(motivoDeBloqueo({ aprobacion: APROBADA, vigente: true })).toBeNull()
  })

  it('vencida bloquea aunque el canon entre', () => {
    expect(motivoDeBloqueo({ aprobacion: APROBADA, vigente: false, canonCop: 100_000 })).toBe(
      'vencida',
    )
  })

  it.each([
    ['sin_estudio', 'sin_aprobacion'],
    ['en_proceso', 'en_proceso'],
    ['rechazado', 'rechazado'],
  ])('estado %s → motivo %s', (estado, esperado) => {
    expect(
      motivoDeBloqueo({ aprobacion: { ...APROBADA, estado }, vigente: false, canonCop: 100_000 }),
    ).toBe(esperado)
  })

  it('mientras no se sabe nada (null) se deja pasar, no se castiga la duda', () => {
    expect(motivoDeBloqueo({ aprobacion: null, vigente: false, canonCop: 100_000 })).toBeNull()
  })
})

describe('cabeEnTope', () => {
  it('null cuando no hay tope: es "no sabemos", ni sí ni no', () => {
    expect(cabeEnTope(1_000_000, null)).toBeNull()
  })

  it('compara contra el tope', () => {
    expect(cabeEnTope(1_000_000, 2_000_000)).toBe(true)
    expect(cabeEnTope(3_000_000, 2_000_000)).toBe(false)
  })

  it('un canon no numérico no se cuela como válido', () => {
    expect(cabeEnTope(Number.NaN, 2_000_000)).toBeNull()
  })
})

describe('estaVigente', () => {
  const ahora = new Date('2026-08-10T00:00:00.000Z')

  it('aprobada y con fecha futura, vigente', () => {
    expect(estaVigente({ ...APROBADA, vigenteHasta: '2026-08-20T00:00:00.000Z' }, ahora)).toBe(true)
  })

  it('aprobada pero con fecha pasada, no', () => {
    expect(estaVigente({ ...APROBADA, vigenteHasta: '2026-08-01T00:00:00.000Z' }, ahora)).toBe(false)
  })

  it('sin fecha se asume vigente: la caducidad es del backend', () => {
    expect(estaVigente({ ...APROBADA, vigenteHasta: null }, ahora)).toBe(true)
  })

  it('un rechazo nunca está vigente', () => {
    expect(estaVigente({ ...APROBADA, estado: 'rechazado' }, ahora)).toBe(false)
  })

  it('null no revienta', () => {
    expect(estaVigente(null, ahora)).toBe(false)
  })
})
