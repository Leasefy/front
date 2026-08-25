/**
 * report-redirect.test.ts — the redirect target for the retired
 * `/avaluo/reporte/[slug]` route (T-0003 WU-4).
 *
 * Covers exactly what the contract calls out as load-bearing: the capability
 * token in the query string must survive verbatim (it's the tenant's only
 * way back into a document sent before this route became a redirect), and an
 * unset micro base must degrade to "cannot redirect" rather than a malformed
 * or self-looping Location.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'

const ORIGINAL_ENV = process.env.NEXT_PUBLIC_AVALUO_API_URL

/**
 * `AVALUO_WIZARD_ORIGIN` (and this module's use of it) is a top-level const,
 * computed once at import time — `vi.stubEnv` alone would not change it for
 * an already-loaded module. Reset the module registry and re-import so each
 * case gets a fresh evaluation of the env var.
 */
async function loadWithEnv(value: string | undefined) {
  vi.resetModules()
  if (value === undefined) {
    delete process.env.NEXT_PUBLIC_AVALUO_API_URL
  } else {
    process.env.NEXT_PUBLIC_AVALUO_API_URL = value
  }
  return import('./report-redirect')
}

afterEach(() => {
  if (ORIGINAL_ENV === undefined) {
    delete process.env.NEXT_PUBLIC_AVALUO_API_URL
  } else {
    process.env.NEXT_PUBLIC_AVALUO_API_URL = ORIGINAL_ENV
  }
  vi.resetModules()
})

describe('avaluoReportRedirectTarget — micro base configured', () => {
  it('preserves the capability token in the target query string', async () => {
    const { avaluoReportRedirectTarget } = await loadWithEnv('https://avaluos.leasefy.co')
    expect(avaluoReportRedirectTarget('slug-1', 'cap-token')).toBe(
      'https://avaluos.leasefy.co/avaluo/reporte/slug-1?token=cap-token',
    )
  })

  it('escapes a slug and a token that need encoding', async () => {
    const { avaluoReportRedirectTarget } = await loadWithEnv('https://avaluos.leasefy.co')
    expect(avaluoReportRedirectTarget('slug con espacio', 'tok/en=x')).toBe(
      `https://avaluos.leasefy.co/avaluo/reporte/${encodeURIComponent('slug con espacio')}` +
        `?token=${encodeURIComponent('tok/en=x')}`,
    )
  })

  it('strips a trailing slash on the configured origin', async () => {
    const { avaluoReportRedirectTarget } = await loadWithEnv('https://avaluos.leasefy.co/')
    expect(avaluoReportRedirectTarget('slug-1', 'cap-token')).toBe(
      'https://avaluos.leasefy.co/avaluo/reporte/slug-1?token=cap-token',
    )
  })

  it('omits the query string entirely when no token is present, rather than emitting an empty one', async () => {
    const { avaluoReportRedirectTarget } = await loadWithEnv('https://avaluos.leasefy.co')
    expect(avaluoReportRedirectTarget('slug-1', null)).toBe(
      'https://avaluos.leasefy.co/avaluo/reporte/slug-1',
    )
    expect(avaluoReportRedirectTarget('slug-1', undefined)).toBe(
      'https://avaluos.leasefy.co/avaluo/reporte/slug-1',
    )
  })
})

describe('avaluoReportRedirectTarget — micro base NOT configured', () => {
  it('returns null instead of a malformed or self-looping Location', async () => {
    const { avaluoReportRedirectTarget } = await loadWithEnv(undefined)
    expect(avaluoReportRedirectTarget('slug-1', 'cap-token')).toBeNull()
  })

  it('returns null even when the caller has a token to preserve', async () => {
    const { avaluoReportRedirectTarget } = await loadWithEnv('')
    expect(avaluoReportRedirectTarget('slug-1', 'cap-token')).toBeNull()
  })
})
