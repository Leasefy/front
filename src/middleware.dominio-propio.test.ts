/**
 * El dominio propio de la inmobiliaria en el middleware (Nico, 31-10-2026): en su dominio, el inicio es su página
 * (`/i/<slug>`), las fichas pasan tal cual y lo demás va a leasefy.co. En un host de Leasefy no se pregunta nada.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const slugDelDominio = vi.fn<(host: string) => Promise<string | null>>()
vi.mock('@/lib/dominio-propio/slug-del-dominio', () => ({ slugDelDominio: (h: string) => slugDelDominio(h) }))

import { COOKIE_DEL_DOMINIO_PROPIO, middleware } from './middleware'

beforeEach(() => {
  slugDelDominio.mockReset().mockResolvedValue('inmobiliaria-loza')
})

const pedir = (url: string) => Promise.resolve(middleware(new NextRequest(url)))

describe('middleware — el dominio propio de la inmobiliaria', () => {
  it('su inicio sirve su página, sin cambiar la dirección, y recuerda el dominio para compartir', async () => {
    const r = await pedir('https://inmuebles.loza.co/')
    expect(slugDelDominio).toHaveBeenCalledWith('inmuebles.loza.co')
    expect(r.headers.get('x-middleware-rewrite')).toContain('/i/inmobiliaria-loza')
    expect(r.headers.get('location')).toBeNull()
    expect(r.cookies.get(COOKIE_DEL_DOMINIO_PROPIO)?.value).toBe('inmuebles.loza.co')
    // La página lleva su política de contenido como cualquier otra.
    expect(r.headers.get('Content-Security-Policy') ?? r.headers.get('Content-Security-Policy-Report-Only')).toBeTruthy()
  })

  it('las fichas de sus inmuebles se sirven en su dominio, sin el salto a /es', async () => {
    const r = await pedir('https://inmuebles.loza.co/propiedades/p-1')
    expect(r.headers.get('x-middleware-rewrite')).toContain('/propiedades/p-1')
    expect(r.headers.get('location')).toBeNull()
  })

  it('lo demás (el panel, entrar) va a leasefy.co', async () => {
    const r = await pedir('https://inmuebles.loza.co/panel/inmobiliaria?x=1')
    expect(r.status).toBe(307)
    expect(r.headers.get('location')).toBe('https://leasefy.co/panel/inmobiliaria?x=1')
  })

  it('un host que no es de nadie sigue como siempre', async () => {
    slugDelDominio.mockResolvedValue(null)
    const r = await pedir('https://otra-copia.example.com/panel/inmobiliaria')
    expect(r.headers.get('location')).toBeNull()
    expect(r.cookies.get(COOKIE_DEL_DOMINIO_PROPIO)).toBeUndefined()
  })

  it('en leasefy.co no se le pregunta nada al back', async () => {
    await pedir('https://leasefy.co/es/i/inmobiliaria-loza')
    expect(slugDelDominio).not.toHaveBeenCalled()
  })
})
