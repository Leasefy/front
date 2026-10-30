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
    // Ronda 30 (Nico): la home es la landing 2 (estática, con su propia política); el nonce se mira en una
    // página pública de React.
    const req = new NextRequest('https://leasefy.co/es/propiedades', {
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
    // `/` ya no es un documento: manda a `/es` o `/en` (idioma, 16-10-2026).
    // Ronda 30 (Nico): la home es la landing 2, con su propia política; la de nonce se mira en /es/propiedades.
    const r = middleware(new NextRequest('https://leasefy.co/es/propiedades'))
    expect(r.headers.get('Content-Security-Policy')).toContain("'strict-dynamic'")
    expect(r.headers.get('Content-Security-Policy-Report-Only')).toBeNull()
  })

  it('el service worker de las notificaciones no lleva la CSP de documento', () => {
    const r = middleware(new NextRequest('https://leasefy.co/firebase-messaging-sw.js'))
    expect(r.headers.get('Content-Security-Policy-Report-Only')).toBeNull()
    expect(r.headers.get('Content-Security-Policy')).toBeNull()
  })
})

describe('middleware — el idioma de la parte pública (Nico, 16-10-2026)', () => {
  it('lo público sin prefijo va al idioma del navegador la primera vez', () => {
    const r = middleware(new NextRequest('https://leasefy.co/propiedades?q=laureles', { headers: { 'accept-language': 'en-US,en;q=0.9' } }))
    expect(r.status).toBe(307)
    expect(r.headers.get('location')).toBe('https://leasefy.co/en/propiedades?q=laureles')
  })

  it('el enlace de un inmueble que se comparte: a WhatsApp y compañía se le sirve sin redirigir (Nico 28-10)', () => {
    const id = 'd418773f-1079-4e35-9235-1f05f55f4cb4'
    for (const ua of ['WhatsApp/2.24.21.80 i', 'facebookexternalhit/1.1', 'TelegramBot (like TwitterBot)']) {
      const r = middleware(new NextRequest(`https://leasefy.co/propiedades/${id}`, { headers: { 'user-agent': ua } }))
      expect(r.status).toBe(200)
      expect(r.headers.get('location')).toBeNull()
    }
    // Una persona sigue yendo a su idioma.
    const persona = middleware(
      new NextRequest(`https://leasefy.co/propiedades/${id}`, { headers: { 'user-agent': 'Mozilla/5.0 (iPhone) Safari', 'accept-language': 'es-CO' } }),
    )
    expect(persona.status).toBe(307)
    expect(persona.headers.get('location')).toContain(`/es/propiedades/${id}`)
  })

  it('lo que eligió antes manda sobre el navegador', () => {
    const req = new NextRequest('https://leasefy.co/', { headers: { 'accept-language': 'en-US' } })
    // `cookie` es una cabecera prohibida en el constructor de Request: se pone aparte.
    req.cookies.set('leasefy-idioma', 'es')
    const r = middleware(req)
    expect(r.headers.get('location')).toBe('https://leasefy.co/es')
  })

  it('/en/... se reescribe a la ruta de siempre, con el idioma para la página, y queda recordado', () => {
    const r = middleware(new NextRequest('https://leasefy.co/en/propiedades/abc'))
    expect(r.headers.get('x-middleware-rewrite')).toBe('https://leasefy.co/propiedades/abc')
    expect(r.headers.get('x-middleware-request-x-idioma')).toBe('en')
    expect(r.cookies.get('leasefy-idioma')?.value).toBe('en')
    expect(r.headers.get('Content-Security-Policy-Report-Only') ?? r.headers.get('Content-Security-Policy')).toBeTruthy()
  })

  it('el panel no cambia y nadie de afuera le dice el idioma', () => {
    const r = middleware(new NextRequest('https://leasefy.co/panel/inmobiliaria', { headers: { 'x-idioma': 'en' } }))
    expect(r.status).toBe(200)
    expect(r.headers.get('x-middleware-rewrite')).toBeNull()
    expect(r.headers.get('x-middleware-request-x-idioma')).toBeNull()
  })
})

describe('middleware — una sola landing (Nico, 27-10-2026: «solo debe haber una landing y es la nueva»)', () => {
  it('/pricing, la página de precios de la landing vieja, lleva a los planes de la home en su idioma', () => {
    for (const [desde, hasta] of [
      ['https://leasefy.co/es/pricing', 'https://leasefy.co/es#planes'],
      ['https://leasefy.co/en/pricing', 'https://leasefy.co/en#planes'],
      ['https://leasefy.co/es/pricing/empresas?x=1', 'https://leasefy.co/es#planes'],
    ]) {
      const r = middleware(new NextRequest(desde))
      expect(r.status, desde).toBe(307)
      expect(r.headers.get('location'), desde).toBe(hasta)
    }
  })

  it('sin prefijo, al idioma de la persona y a los planes de una vez (un solo salto)', () => {
    const r = middleware(new NextRequest('https://leasefy.co/pricing', { headers: { 'accept-language': 'en-US,en;q=0.9' } }))
    expect(r.headers.get('location')).toBe('https://leasefy.co/en#planes')
  })

  it('las demás páginas públicas siguen igual', () => {
    const r = middleware(new NextRequest('https://leasefy.co/es/pricingx'))
    expect(r.headers.get('location')).toBeNull()
  })
})
