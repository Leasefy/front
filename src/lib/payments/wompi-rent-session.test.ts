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
  it('is rent-namespaced with a zero-padded 2-digit month', () => {
    expect(buildRentReference('L1', 2026, 7)).toBe('rent-L1-2026-07')
  })

  it('does not pad an already 2-digit month', () => {
    expect(buildRentReference('L1', 2026, 12)).toBe('rent-L1-2026-12')
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
