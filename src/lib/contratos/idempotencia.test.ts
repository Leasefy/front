import { describe, it, expect } from 'vitest'

import { generarIdempotencyKey } from './idempotencia'

describe('generarIdempotencyKey', () => {
  it('cumple el formato que exige el contrato: hasta 64 chars, [A-Za-z0-9_-]+', () => {
    const clave = generarIdempotencyKey()
    expect(clave.length).toBeGreaterThan(0)
    expect(clave.length).toBeLessThanOrEqual(64)
    expect(clave).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('dos llamadas dan claves distintas — cada archivo leído es un intento nuevo', () => {
    expect(generarIdempotencyKey()).not.toBe(generarIdempotencyKey())
  })
})
