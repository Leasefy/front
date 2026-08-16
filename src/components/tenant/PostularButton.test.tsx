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

/**
 * La puerta de sesión.
 *
 * Sin sesión, «sin_estudio» NO prueba que la persona no se haya estudiado —
 * prueba que no sabemos quién es. Puede tener cuenta y aprobación vigente y
 * estar simplemente deslogueada; mandarla a pagar otra vez un estudio que ya
 * pagó es el peor error que puede cometer esta pantalla.
 */
describe('motivoDeBloqueo — invitado sin sesión', () => {
  const SIN_ESTUDIO: Aprobacion = { ...APROBADA, estado: 'sin_estudio', topeAprobadoCop: null }

  it('sin sesión y sin estudio pregunta si ya tiene cuenta, no manda a pagar', () => {
    expect(motivoDeBloqueo({ aprobacion: SIN_ESTUDIO, vigente: false, haySesion: false })).toBe(
      'sin_sesion',
    )
  })

  it('CON sesión y sin estudio sí manda a estudiarse', () => {
    expect(motivoDeBloqueo({ aprobacion: SIN_ESTUDIO, vigente: false, haySesion: true })).toBe(
      'sin_aprobacion',
    )
  })

  it('por defecto asume que hay sesión: no le cambia el resultado a quien no manda el dato', () => {
    expect(motivoDeBloqueo({ aprobacion: SIN_ESTUDIO, vigente: false })).toBe('sin_aprobacion')
  })

  it('un respaldo local aprobado pasa de largo aunque no haya sesión', () => {
    // Quien se aprobó por un link de WhatsApp todavía no tiene cuenta, y su
    // aprobación es real: no se le pide entrar para usar lo que ya se ganó.
    expect(
      motivoDeBloqueo({
        aprobacion: APROBADA,
        vigente: true,
        canonCop: 1_500_000,
        haySesion: false,
      }),
    ).toBeNull()
  })

  it('sin sesión, un rechazo sigue siendo un rechazo', () => {
    expect(
      motivoDeBloqueo({
        aprobacion: { ...APROBADA, estado: 'rechazado' },
        vigente: false,
        haySesion: false,
      }),
    ).toBe('rechazado')
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
