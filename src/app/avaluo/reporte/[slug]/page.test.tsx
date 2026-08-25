/**
 * page.test.tsx — `/avaluo/reporte/[slug]` is retired in `front`: it only
 * redirects to the same slug on the avaluo micro (T-0003 WU-4). This route
 * used to render the report itself; that behaviour moved to `avaluo` and is
 * NOT under test here — see `ReporteAvaluoShell.test.tsx` in `avaluo` for it.
 *
 * What matters for THIS route: the capability token in an old delivery
 * e-mail link survives, a 307 is used (never the browser-cached 308), and an
 * unconfigured micro base degrades to `notFound()` instead of a malformed or
 * self-looping redirect.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const { redirectMock, notFoundMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
  notFoundMock: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
  notFound: notFoundMock,
}))

vi.mock('@/lib/avaluo/report-redirect', () => ({
  avaluoReportRedirectTarget: vi.fn(),
}))

import { avaluoReportRedirectTarget } from '@/lib/avaluo/report-redirect'
import ReporteAvaluoRedirectPage from './page'

beforeEach(() => {
  redirectMock.mockClear()
  notFoundMock.mockClear()
  vi.mocked(avaluoReportRedirectTarget).mockReset()
})

describe('ReporteAvaluoRedirectPage', () => {
  it('redirects (307, via next/navigation redirect) to the target the pure builder returns, token intact', () => {
    vi.mocked(avaluoReportRedirectTarget).mockReturnValue(
      'https://avaluos.leasefy.co/avaluo/reporte/slug-1?token=cap-token',
    )

    expect(() =>
      ReporteAvaluoRedirectPage({
        params: { slug: 'slug-1' },
        searchParams: { token: 'cap-token' },
      }),
    ).toThrow('NEXT_REDIRECT:https://avaluos.leasefy.co/avaluo/reporte/slug-1?token=cap-token')

    expect(avaluoReportRedirectTarget).toHaveBeenCalledWith('slug-1', 'cap-token')
    expect(redirectMock).toHaveBeenCalledWith(
      'https://avaluos.leasefy.co/avaluo/reporte/slug-1?token=cap-token',
    )
    expect(notFoundMock).not.toHaveBeenCalled()
  })

  it('passes null when no ?token= is present, rather than the string "undefined"', () => {
    vi.mocked(avaluoReportRedirectTarget).mockReturnValue(
      'https://avaluos.leasefy.co/avaluo/reporte/slug-1',
    )

    expect(() =>
      ReporteAvaluoRedirectPage({ params: { slug: 'slug-1' }, searchParams: {} }),
    ).toThrow('NEXT_REDIRECT:')

    expect(avaluoReportRedirectTarget).toHaveBeenCalledWith('slug-1', null)
  })

  it('takes the first value when ?token= is duplicated', () => {
    vi.mocked(avaluoReportRedirectTarget).mockReturnValue('https://avaluos.leasefy.co/x')

    expect(() =>
      ReporteAvaluoRedirectPage({
        params: { slug: 'slug-1' },
        searchParams: { token: ['first', 'second'] },
      }),
    ).toThrow()

    expect(avaluoReportRedirectTarget).toHaveBeenCalledWith('slug-1', 'first')
  })

  it('answers notFound(), never a malformed redirect, when the micro base is unset', () => {
    vi.mocked(avaluoReportRedirectTarget).mockReturnValue(null)

    expect(() =>
      ReporteAvaluoRedirectPage({
        params: { slug: 'slug-1' },
        searchParams: { token: 'cap-token' },
      }),
    ).toThrow('NEXT_NOT_FOUND')

    expect(notFoundMock).toHaveBeenCalledTimes(1)
    expect(redirectMock).not.toHaveBeenCalled()
  })
})
