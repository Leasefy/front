/**
 * El middleware pone la CSP con un nonce nuevo por petición y se lo pasa a
 * Next por la PETICIÓN (de ahí lo lee para marcar sus `<script>`). Sin eso la
 * política bloquearía la hidratación entera.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from './middleware'

afterEach(() => vi.unstubAllEnvs())

function nonceDe(politica: string | null): string | null {
  return /'nonce-([^']+)'/.exec(politica ?? '')?.[1] ?? null
}

describe('middleware — CSP con nonce', () => {
  it('cada documento lleva su propio nonce, y el mismo va en la petición para Next', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const r1 = middleware(new NextRequest('https://leasefy.co/panel/inmobiliaria'))
    const r2 = middleware(new NextRequest('https://leasefy.co/panel/inmobiliaria'))
    const p1 = r1.headers.get('Content-Security-Policy-Report-Only')
    const n1 = nonceDe(p1)
    expect(n1).toBeTruthy()
    expect(n1).not.toBe(nonceDe(r2.headers.get('Content-Security-Policy-Report-Only')))
    // Next reenvía las cabeceras de petición sobrescritas como x-middleware-request-*.
    expect(r1.headers.get('x-middleware-request-x-nonce')).toBe(n1)
    expect(r1.headers.get('x-middleware-request-content-security-policy-report-only')).toBe(p1)
    expect(r1.headers.get('Reporting-Endpoints')).toBe('csp="/api/csp-reporte"')
  })

  it('una CSP que manda el cliente en la petición no se respeta: se pisa', () => {
    const req = new NextRequest('https://leasefy.co/', {
      headers: { 'content-security-policy': "script-src 'nonce-elegidoPorElAtacante'" },
    })
    const r = middleware(req)
    expect(r.headers.get('x-middleware-request-content-security-policy')).toBeNull()
    expect(nonceDe(r.headers.get('x-middleware-request-content-security-policy-report-only'))).not.toBe(
      'elegidoPorElAtacante',
    )
  })

  it('con CSP_MODO=obligatoria la cabecera es la que bloquea', () => {
    vi.stubEnv('CSP_MODO', 'obligatoria')
    const r = middleware(new NextRequest('https://leasefy.co/'))
    expect(r.headers.get('Content-Security-Policy')).toContain("'strict-dynamic'")
    expect(r.headers.get('Content-Security-Policy-Report-Only')).toBeNull()
  })

  it('el service worker de las notificaciones no lleva la CSP de documento', () => {
    const r = middleware(new NextRequest('https://leasefy.co/firebase-messaging-sw.js'))
    expect(r.headers.get('Content-Security-Policy-Report-Only')).toBeNull()
    expect(r.headers.get('Content-Security-Policy')).toBeNull()
  })
})
