/**
 * 🔴 ARREGLOS-4 (03-10-2026) · «Completa tu perfil» de la barra y la tarjeta
 * del perfil cuentan lo MISMO.
 *
 * PRUEBAS-RESTO vio «Completa tu cuenta 0/4» en la barra de la propietaria y
 * «3 de 5» en su perfil: la barra leía el `localStorage` del asistente de
 * bienvenida; el perfil, lo guardado. Ahora las dos leen
 * `pasosDelPerfilDelPropietario`.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { pasosDelPerfilDelPropietario } from './pasos-del-perfil-del-propietario'

describe('pasosDelPerfilDelPropietario', () => {
  it('sin usuario: los cinco pasos, ninguno completo', () => {
    const pasos = pasosDelPerfilDelPropietario(null)
    expect(pasos.map((p) => p.id)).toEqual(['basic-info', 'phone', 'id-number', 'address', 'emergency-contact'])
    expect(pasos.every((p) => !p.completo)).toBe(true)
  })

  it('cuenta lo guardado: nombre + teléfono + cédula = 3 de 5', () => {
    const pasos = pasosDelPerfilDelPropietario({
      firstName: 'Paula',
      lastName: 'Restrepo',
      phone: '3001234567',
      rut: '43123456',
      address: '',
      emergencyContactName: 'Jorge',
      emergencyContactPhone: null,
    })
    expect(pasos.filter((p) => p.completo).map((p) => p.id)).toEqual(['basic-info', 'phone', 'id-number'])
  })

  it('el nombre exige nombre Y apellido; el contacto de emergencia, nombre Y teléfono', () => {
    const pasos = pasosDelPerfilDelPropietario({ firstName: 'Paula', emergencyContactPhone: '3001234567' })
    expect(pasos.find((p) => p.id === 'basic-info')!.completo).toBe(false)
    expect(pasos.find((p) => p.id === 'emergency-contact')!.completo).toBe(false)
  })
})

describe('🔴 una sola fuente', () => {
  const layout = readFileSync('src/app/panel/(landlord)/layout.tsx', 'utf8')
  const perfil = readFileSync('src/app/panel/(landlord)/perfil/page.tsx', 'utf8')

  it('la barra del propietario cuenta los pasos del perfil, no el localStorage del asistente', () => {
    expect(layout).toContain('pasosDelPerfilDelPropietario(user)')
    expect(layout).not.toContain('plan_onboarding_landlord')
    expect(layout).toContain("href: '/panel/perfil'")
  })

  it('la tarjeta del perfil cuenta con la misma función', () => {
    expect(perfil).toContain('pasosDelPerfilDelPropietario(user)')
  })
})
