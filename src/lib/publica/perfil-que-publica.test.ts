import { afterEach, describe, expect, it } from 'vitest'

import {
  perfilQuePublicaDeLaCuenta,
  perfilQuePublicaDelDestino,
  perfilQuePublicaRecordado,
  recordarPerfilQuePublica,
} from './perfil-que-publica'

describe('el perfil con que vino a publicar no se pierde al entrar con la clave', () => {
  afterEach(() => window.localStorage.clear())

  it('sale del destino del publicador', () => {
    expect(perfilQuePublicaDelDestino('/publica?perfil=agente')).toBe('agente')
    expect(perfilQuePublicaDelDestino('/publica?aliado=fianly&perfil=landlord')).toBe('landlord')
    expect(perfilQuePublicaDelDestino('/publica')).toBeNull()
    expect(perfilQuePublicaDelDestino('/panel?perfil=agente')).toBeNull()
  })

  it('de los datos de la cuenta, y sólo los tres perfiles', () => {
    expect(perfilQuePublicaDeLaCuenta({ perfil_que_publica: 'agente', intended_role: 'agency' })).toBe('agente')
    expect(perfilQuePublicaDeLaCuenta({ perfil_que_publica: 'admin' })).toBeNull()
    expect(perfilQuePublicaDeLaCuenta(null)).toBeNull()
  })

  it('y en este navegador', () => {
    expect(perfilQuePublicaRecordado()).toBeNull()
    recordarPerfilQuePublica('agente')
    expect(perfilQuePublicaRecordado()).toBe('agente')
  })
})
