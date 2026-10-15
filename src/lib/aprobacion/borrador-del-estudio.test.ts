import { beforeEach, describe, expect, it } from 'vitest'

import {
  borrarBorradorDelEstudio,
  guardarBorradorDelEstudio,
  leerBorradorDelEstudio,
} from './borrador-del-estudio'

const CAMPOS = {
  nombres: 'John Jaime',
  apellidos: 'Mesa',
  email: 'john@ejemplo.co',
  cedula: '71395289',
  phone: '3001234567',
  ciudad: 'Medellín',
  canon: '2000000',
  tipoInmueble: 'apartamento',
  consent: true,
}

describe('el borrador del estudio mientras se crea la cuenta (Juan, 15-10)', () => {
  beforeEach(() => window.localStorage.clear())

  it('guarda lo escrito y lo devuelve, pero nunca la autorización', () => {
    guardarBorradorDelEstudio(CAMPOS, 1_000)
    const { consent: _autorizacion, ...sinLaAutorizacion } = CAMPOS
    expect(leerBorradorDelEstudio(2_000)).toEqual(sinLaAutorizacion)
    expect(window.localStorage.getItem('leasefy:borrador-del-estudio')).not.toContain('consent')
  })

  it('vence a las 24 h y entonces se borra', () => {
    guardarBorradorDelEstudio(CAMPOS, 0)
    expect(leerBorradorDelEstudio(24 * 60 * 60 * 1000)).toBeNull()
    expect(window.localStorage.getItem('leasefy:borrador-del-estudio')).toBeNull()
  })

  it('uno dañado no revienta: se ignora y se borra', () => {
    window.localStorage.setItem('leasefy:borrador-del-estudio', '{no es json')
    expect(leerBorradorDelEstudio()).toBeNull()
    window.localStorage.setItem('leasefy:borrador-del-estudio', JSON.stringify({ campos: 'x', guardadoEn: Date.now() }))
    expect(leerBorradorDelEstudio()).toBeNull()
    expect(window.localStorage.getItem('leasefy:borrador-del-estudio')).toBeNull()
  })

  it('se borra al crear el estudio o al salir', () => {
    guardarBorradorDelEstudio(CAMPOS)
    borrarBorradorDelEstudio()
    expect(leerBorradorDelEstudio()).toBeNull()
  })
})
