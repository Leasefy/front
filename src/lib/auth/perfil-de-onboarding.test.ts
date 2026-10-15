import { describe, expect, it } from 'vitest'

import {
  esPerfilDeOnboarding,
  leerPerfilElegido,
  rutaDeOnboarding,
  rutaDeOnboardingConRegreso,
  RUTA_DEL_SELECTOR_DE_PERFIL,
} from './perfil-de-onboarding'

describe('perfil de onboarding', () => {
  it('reconoce sólo los tres perfiles', () => {
    expect(esPerfilDeOnboarding('tenant')).toBe(true)
    expect(esPerfilDeOnboarding('landlord')).toBe(true)
    expect(esPerfilDeOnboarding('agency')).toBe(true)
    expect(esPerfilDeOnboarding('inmobiliaria')).toBe(false)
    expect(esPerfilDeOnboarding('ADMIN')).toBe(false)
    expect(esPerfilDeOnboarding(null)).toBe(false)
  })

  it('lee la elección de los metadatos del usuario, y nada más', () => {
    expect(leerPerfilElegido({ intended_role: 'agency' })).toBe('agency')
    expect(leerPerfilElegido({ intended_role: 'superadmin' })).toBeNull()
    expect(leerPerfilElegido({ email_verified: true })).toBeNull()
    expect(leerPerfilElegido(undefined)).toBeNull()
    expect(leerPerfilElegido('agency')).toBeNull()
  })

  it('manda al onboarding del perfil elegido, o al selector si no eligió', () => {
    expect(rutaDeOnboarding('tenant')).toBe('/onboarding/inquilino')
    expect(rutaDeOnboarding('landlord')).toBe('/onboarding/propietario')
    expect(rutaDeOnboarding('agency')).toBe('/onboarding/inmobiliaria')
    expect(rutaDeOnboarding(null)).toBe(RUTA_DEL_SELECTOR_DE_PERFIL)
    expect(rutaDeOnboarding(undefined)).toBe('/onboarding/seleccionar-rol')
  })

  it('lleva el destino al onboarding del inquilino y del propietario, que saben volver (Juan, 15-10)', () => {
    expect(rutaDeOnboardingConRegreso('tenant', '/aprobacion?canon=2000000')).toBe(
      '/onboarding/inquilino?returnUrl=%2Faprobacion%3Fcanon%3D2000000',
    )
    expect(rutaDeOnboardingConRegreso('landlord', '/publicar')).toBe('/onboarding/propietario?returnUrl=%2Fpublicar')
  })

  it('sin destino, con el inicio, en el selector o en la inmobiliaria, la ruta de siempre', () => {
    expect(rutaDeOnboardingConRegreso('tenant', null)).toBe('/onboarding/inquilino')
    expect(rutaDeOnboardingConRegreso('tenant', '/')).toBe('/onboarding/inquilino')
    expect(rutaDeOnboardingConRegreso(null, '/aprobacion')).toBe(RUTA_DEL_SELECTOR_DE_PERFIL)
    expect(rutaDeOnboardingConRegreso('agency', '/aprobacion')).toBe('/onboarding/inmobiliaria')
  })
})
