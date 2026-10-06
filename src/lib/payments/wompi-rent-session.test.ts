import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import { computeWompiIntegrity } from './wompi-integrity'
import {
  buildRentReference,
  buildWompiCheckoutUrl,
  isPeriodPayable,
} from './wompi-rent-session'

describe('computeWompiIntegrity', () => {
  it('hashes ref + amountInCents + currency + secret with no separators (sha256 hex)', () => {
    const reference = 'rent-L1-2026-07'
    const amountInCents = 1_500_000
    const currency = 'COP'
    const secret = 'test_secret'

    // Recompute the digest independently so a reorder / separator change fails.
    const expected = createHash('sha256')
      .update(`${reference}${amountInCents}${currency}${secret}`)
      .digest('hex')

    expect(computeWompiIntegrity(reference, amountInCents, currency, secret)).toBe(
      expected
    )
  })

  it('is sensitive to field order (reorder produces a different hash)', () => {
    const reference = 'rent-L1-2026-07'
    const amountInCents = 1_500_000
    const currency = 'COP'
    const secret = 'test_secret'

    const correct = computeWompiIntegrity(reference, amountInCents, currency, secret)
    const reordered = createHash('sha256')
      .update(`${amountInCents}${reference}${currency}${secret}`)
      .digest('hex')

    expect(correct).not.toBe(reordered)
  })
})

describe('isPeriodPayable', () => {
  it('allows NONE and REJECTED (payable / retryable)', () => {
    expect(isPeriodPayable('NONE')).toBe(true)
    expect(isPeriodPayable('REJECTED')).toBe(true)
  })

  it('blocks APPROVED and PENDING_VALIDATION (no double-pay)', () => {
    expect(isPeriodPayable('APPROVED')).toBe(false)
    expect(isPeriodPayable('PENDING_VALIDATION')).toBe(false)
  })
})

describe('buildRentReference', () => {
  const INTENTO = 1_759_449_600_123

  it('is rent-namespaced with a zero-padded 2-digit month and the attempt', () => {
    expect(buildRentReference('L1', 2026, 7, INTENTO)).toBe('rent-L1-2026-07-1759449600123')
  })

  it('does not pad an already 2-digit month', () => {
    expect(buildRentReference('L1', 2026, 12, INTENTO)).toBe('rent-L1-2026-12-1759449600123')
  })

  it('una referencia por intento (Nico, 02-10-2026): dos intentos del mismo período no se repiten', () => {
    expect(buildRentReference('L1', 2026, 7, INTENTO)).not.toBe(
      buildRentReference('L1', 2026, 7, INTENTO + 1)
    )
  })

  it('sin intento explícito usa la hora (13 dígitos: lo que acepta el back, 10 a 16)', () => {
    const ref = buildRentReference('2b1f6a7e-4c2d-4e8f-9a1b-3c5d7e9f1a2b', 2026, 10)
    // El mismo patrón que `back/src/tenant-payments/wompi/referencia-del-arriendo.ts`.
    expect(ref).toMatch(
      /^rent-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-\d{4}-\d{2}-\d{10,16}$/
    )
  })
})

describe('buildWompiCheckoutUrl', () => {
  it('builds the hosted-checkout URL with signature:integrity + encoded redirect', () => {
    const redirectUrl = 'https://app/inquilino/pagos'
    const url = buildWompiCheckoutUrl({
      publicKey: 'pub_x',
      currency: 'COP',
      amountInCents: 1_500_000,
      reference: 'rent-L1-2026-07',
      integrity: 'abc',
      redirectUrl,
    })

    expect(url).toContain('signature:integrity=abc')
    expect(url).toContain('amount-in-cents=1500000')
    expect(url).toContain('public-key=pub_x')
    expect(url).toContain('reference=rent-L1-2026-07')
    expect(url).toContain('currency=COP')
    expect(url).toContain('redirect-url=' + encodeURIComponent(redirectUrl))
    expect(url.startsWith('https://checkout.wompi.co/p/?')).toBe(true)
  })
})
