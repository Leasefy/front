/**
 * Producción, 30-10-2026: una sesión recién abierta se cerraba al segundo y
 * nada decía QUIÉN llamó a `signOut`. `trazarCierre` deja en la consola el
 * origen y la pila, y lo último queda en sessionStorage para leerlo después de
 * la navegación a /auth.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { trazarCierre, ultimaTrazaDeCierre } from './traza-del-cierre'

beforeEach(() => {
  sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('trazarCierre', () => {
  it('avisa por consola con el origen y la pila', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    trazarCierre('signOut')
    expect(aviso).toHaveBeenCalledTimes(1)
    expect(String(aviso.mock.calls[0][0])).toContain('[auth] cierre')
    expect(String(aviso.mock.calls[0][0])).toContain('signOut')
    expect(String(aviso.mock.calls[0][1])).toContain('trazarCierre')
  })

  it('guarda la última traza para leerla tras la navegación', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    trazarCierre('terminarSesion:expirada')
    expect(ultimaTrazaDeCierre()?.origen).toBe('terminarSesion:expirada')
  })

  it('nunca tira si el almacenamiento falla', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cuota')
    })
    expect(() => trazarCierre('signOut')).not.toThrow()
  })
})
