import { beforeEach, describe, expect, it } from 'vitest'

import { getDeviceId } from './device-id'

describe('getDeviceId', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('genera uno la primera vez y lo guarda en localStorage', () => {
    const id = getDeviceId()
    expect(id).toMatch(/^[A-Za-z0-9_-]{8,64}$/)
    expect(localStorage.getItem('leasefy:device-id')).toBe(id)
  })

  it('devuelve SIEMPRE el mismo: es lo que hace que un re-login no sea «otro dispositivo»', () => {
    const primero = getDeviceId()
    expect(getDeviceId()).toBe(primero)
    expect(getDeviceId()).toBe(primero)
  })

  it('un valor guardado con forma inválida se reemplaza en vez de mandarse', () => {
    localStorage.setItem('leasefy:device-id', 'no vale; tiene espacios')
    const id = getDeviceId()
    expect(id).toMatch(/^[A-Za-z0-9_-]{8,64}$/)
    expect(localStorage.getItem('leasefy:device-id')).toBe(id)
  })

  it('sobrevive a la purga del cierre de sesión (sólo se borran las claves de Supabase)', async () => {
    const { purgarSesionLocal } = await import('./session-terminal')
    const id = getDeviceId()
    localStorage.setItem('sb-proj-auth-token', 'x')
    purgarSesionLocal()
    expect(localStorage.getItem('sb-proj-auth-token')).toBeNull()
    expect(getDeviceId()).toBe(id)
  })
})
