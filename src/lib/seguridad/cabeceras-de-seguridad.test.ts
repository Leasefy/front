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

  it('ninguna página se deja enmarcar desde AFUERA (clickjacking), coherente con la CSP', async () => {
    const cs = await cabecerasEn('production')
    // SAMEORIGIN = `frame-ancestors 'self'` de la CSP del middleware.
    expect(valor(cs, 'X-Frame-Options')).toBe('SAMEORIGIN')
  })

  it('la CSP ya no es una cabecera fija: la pone el middleware con nonce', async () => {
    const cs = await cabecerasEn('production')
    expect(valor(cs, 'Content-Security-Policy-Report-Only')).toBeUndefined()
    expect(valor(cs, 'Content-Security-Policy')).toBeUndefined()
  })

  it('el micrófono queda para nosotros: el dictado del chat y la captura por voz lo usan', async () => {
    // Antes `microphone=()`: el navegador negaba el permiso sin preguntar y el
    // botón de dictado de `ChatInput` / `PropertyIACapture` fallaba mudo.
    const pp = valor(await cabecerasEn('production'), 'Permissions-Policy')!
    expect(pp).toContain('microphone=(self)')
    expect(pp).toContain('camera=()')
    expect(pp).toContain('geolocation=()')
    expect(pp).toContain('payment=()')
  })

  it('aísla la ventana de las que abre otro sitio sin cortar nuestros popups (Wompi)', async () => {
    const cs = await cabecerasEn('production')
    expect(valor(cs, 'Cross-Origin-Opener-Policy')).toBe('same-origin-allow-popups')
  })

  it('las rutas propias de /api no se dejan incrustar desde otro origen', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.resetModules()
    const config = (await import('../../../next.config.mjs')).default as {
      headers: () => Promise<{ source: string; headers: Cabecera[] }[]>
    }
    const api = (await config.headers()).find((r) => r.source === '/api/:path*')?.headers ?? []
    expect(valor(api, 'Cross-Origin-Resource-Policy')).toBe('same-origin')
  })

  it('el Referer que sale a otro sitio no lleva la ruta (tokens de enlaces públicos)', async () => {
    const cs = await cabecerasEn('production')
    expect(valor(cs, 'Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(valor(cs, 'X-Content-Type-Options')).toBe('nosniff')
  })
})
