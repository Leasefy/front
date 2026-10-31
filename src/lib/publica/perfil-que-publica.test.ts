import { afterEach, describe, expect, it } from 'vitest'

import {
  perfilQuePublicaDeLaCuenta,
  perfilQuePublicaDelDestino,
  perfilQuePublicaRecordado,
  recordarPerfilQuePublica,
  vieneACrearSuInmobiliaria,
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

describe('el propietario que vuelve a publicar como inmobiliaria (Nico 31-10)', () => {
  it('🔴 con cuenta de propietario y «Soy inmobiliaria» o «Soy agente»: primero crea la suya', () => {
    expect(vieneACrearSuInmobiliaria({ rol: 'landlord', conInmobiliaria: false, perfilElegido: 'agency' })).toBe(true)
    expect(vieneACrearSuInmobiliaria({ rol: 'landlord', conInmobiliaria: false, perfilElegido: 'agente' })).toBe(true)
  })

  it('como propietario, o sin elegir, publica como siempre', () => {
    expect(vieneACrearSuInmobiliaria({ rol: 'landlord', conInmobiliaria: false, perfilElegido: 'landlord' })).toBe(false)
    expect(vieneACrearSuInmobiliaria({ rol: 'landlord', conInmobiliaria: false, perfilElegido: null })).toBe(false)
  })

  it('si ya tiene inmobiliaria, o no es propietario, no hay nada que crear', () => {
    expect(vieneACrearSuInmobiliaria({ rol: 'landlord', conInmobiliaria: true, perfilElegido: 'agency' })).toBe(false)
    expect(vieneACrearSuInmobiliaria({ rol: 'agency', conInmobiliaria: false, perfilElegido: 'agency' })).toBe(false)
    expect(vieneACrearSuInmobiliaria({ rol: 'tenant', conInmobiliaria: false, perfilElegido: 'agency' })).toBe(false)
  })
})
