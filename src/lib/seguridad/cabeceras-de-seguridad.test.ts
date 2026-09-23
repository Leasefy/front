/**
 * Las cabeceras de seguridad que arma `next.config.mjs`, leídas del config de
 * verdad (auditoría de seguridad 23-09).
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

type Cabecera = { key: string; value: string }

async function cabecerasEn(entorno: string): Promise<Cabecera[]> {
  vi.stubEnv('NODE_ENV', entorno)
  vi.resetModules()
  const config = (await import('../../../next.config.mjs')).default as {
    headers: () => Promise<{ source: string; headers: Cabecera[] }[]>
  }
  const reglas = await config.headers()
  return reglas.find((r) => r.source === '/:path*')?.headers ?? []
}

const valor = (cs: Cabecera[], k: string) => cs.find((c) => c.key.toLowerCase() === k.toLowerCase())?.value

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('cabeceras de seguridad', () => {
  it('en producción manda HSTS, sin comprometer a todos los subdominios', async () => {
    const cs = await cabecerasEn('production')
    const hsts = valor(cs, 'Strict-Transport-Security')
    expect(hsts).toBeDefined()
    expect(Number(/max-age=(\d+)/.exec(hsts!)?.[1])).toBeGreaterThanOrEqual(31536000)
    expect(hsts).not.toMatch(/includeSubDomains|preload/i)
  })

  it('ninguna página se deja enmarcar (clickjacking en pantallas que mueven plata)', async () => {
    const cs = await cabecerasEn('production')
    expect(valor(cs, 'X-Frame-Options')).toBe('DENY')
    expect(valor(cs, 'Content-Security-Policy-Report-Only')).toContain("frame-ancestors 'none'")
  })

  it('el Referer que sale a otro sitio no lleva la ruta (tokens de enlaces públicos)', async () => {
    const cs = await cabecerasEn('production')
    expect(valor(cs, 'Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(valor(cs, 'X-Content-Type-Options')).toBe('nosniff')
  })
})
