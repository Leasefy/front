/**
 * `/auth/callback` — el regreso de los enlaces de Supabase (bug de QA, 28-09:
 * el enlace de confirmar correo decía «vencido» con la cuenta confirmada).
 *
 *  · `token_hash` (plantilla nueva): NO se gasta en el GET. Los escáneres de
 *    enlaces del correo abren el enlace antes que la persona; si el GET lo
 *    gastara, a la persona le llegaría quemado. Se pasa a `/auth/confirmar`,
 *    que pide el clic.
 *  · `code` que no se puede canjear en un enlace del REGISTRO: Supabase sólo
 *    emite el código después de confirmar la cuenta, así que la pantalla tiene
 *    que decir «Tu correo quedó confirmado», no «vencido».
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const sb = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
  setAll: null as null | ((c: { name: string; value: string; options: object }[]) => void),
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: (_u: string, _k: string, opts: { cookies: { setAll: typeof sb.setAll } }) => {
    sb.setAll = opts.cookies.setAll
    return { auth: { exchangeCodeForSession: sb.exchangeCodeForSession, verifyOtp: sb.verifyOtp } }
  },
}))

import { GET } from './route'
import { COOKIE_DE_RECUPERACION } from '@/lib/auth/sesion-de-recuperacion'

const ORIGEN = 'http://localhost:3011'
const pedir = (qs: string) => GET(new NextRequest(`${ORIGEN}/auth/callback?${qs}`))
const destinoDe = (res: Response) => {
  const u = new URL(res.headers.get('location')!)
  return `${u.pathname}${u.search}`
}

beforeEach(() => {
  sb.exchangeCodeForSession.mockReset()
  sb.verifyOtp.mockReset()
  sb.setAll = null
})

describe('/auth/callback — token_hash (plantilla nueva)', () => {
  it('manda a la pantalla que pide el clic, SIN gastar el token', async () => {
    const res = await pedir('returnUrl=%2Fonboarding%2Finmobiliaria&tipo=registro&token_hash=pkce_abc&type=email')
    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)
    const u = new URL(res.headers.get('location')!)
    expect(u.origin).toBe(ORIGEN)
    expect(u.pathname).toBe('/auth/confirmar')
    expect(u.searchParams.get('token_hash')).toBe('pkce_abc')
    expect(u.searchParams.get('type')).toBe('email')
    expect(u.searchParams.get('returnUrl')).toBe('/onboarding/inmobiliaria')
    expect(sb.verifyOtp).not.toHaveBeenCalled()
    expect(sb.exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('con la plantilla nueva y RedirectTo = SiteURL (sin destino) cae al resolvedor de siempre', async () => {
    const res = await pedir('token_hash=abc&type=email')
    expect(new URL(res.headers.get('location')!).searchParams.get('returnUrl')).toBe('/auth/post-login')
  })
})

describe('/auth/callback — code (plantilla vieja, PKCE)', () => {
  it('canjeado: va al destino con las cookies de la sesión', async () => {
    sb.exchangeCodeForSession.mockImplementation(async () => {
      sb.setAll?.([{ name: 'sb-x-auth-token', value: 'v', options: { path: '/' } }])
      return { data: {}, error: null }
    })
    const res = await pedir('code=c0de&returnUrl=%2Fonboarding%2Finmobiliaria&tipo=registro')
    expect(destinoDe(res)).toBe('/onboarding/inmobiliaria')
    expect(res.headers.get('set-cookie')).toContain('sb-x-auth-token=v')
  })

  it('del registro y sin code_verifier (otro navegador): «tu correo quedó confirmado», no «vencido»', async () => {
    sb.exchangeCodeForSession.mockResolvedValue({
      data: {},
      error: Object.assign(new Error('PKCE code verifier not found in storage.'), { code: 'pkce_code_verifier_not_found' }),
    })
    const res = await pedir('code=c0de&returnUrl=%2Fonboarding%2Finmobiliaria&tipo=registro')
    expect(destinoDe(res)).toBe('/auth/enlace?returnUrl=%2Fonboarding%2Finmobiliaria&estado=confirmado')
  })

  it('del registro y el canje explota (red): la cuenta igual quedó confirmada', async () => {
    sb.exchangeCodeForSession.mockRejectedValue(new Error('fetch failed'))
    const res = await pedir('code=c0de&returnUrl=%2Fonboarding%2Finmobiliaria&tipo=registro')
    expect(destinoDe(res)).toBe('/auth/enlace?returnUrl=%2Fonboarding%2Finmobiliaria&estado=confirmado')
  })

  it('sin la marca del registro (Google, enlaces viejos): /auth/enlace como antes', async () => {
    sb.exchangeCodeForSession.mockResolvedValue({ data: {}, error: new Error('invalid flow state') })
    const res = await pedir('code=c0de&returnUrl=%2Fauth%2Fupdate-password')
    expect(destinoDe(res)).toBe('/auth/enlace?returnUrl=%2Fauth%2Fupdate-password')
  })
})

describe('/auth/callback — sin code ni token_hash', () => {
  it('error de Supabase en la query (otp_expired): /auth/enlace, que lee el fragmento', async () => {
    const res = await pedir(
      'error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired&returnUrl=%2Fonboarding%2Finmobiliaria&tipo=registro',
    )
    expect(destinoDe(res)).toBe('/auth/enlace?returnUrl=%2Fonboarding%2Finmobiliaria')
    expect(sb.exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('un destino que sale del sitio no se sigue', async () => {
    const res = await pedir('returnUrl=https%3A%2F%2Fevil.example')
    expect(destinoDe(res)).toBe('/auth/enlace?returnUrl=%2Fauth%2Fpost-login')
  })
})

describe('/auth/callback — enlace de «¿Olvidaste tu contraseña?»', () => {
  const canjeOk = () =>
    sb.exchangeCodeForSession.mockImplementation(async () => {
      sb.setAll?.([{ name: 'sb-x-auth-token', value: 'v', options: { path: '/' } }])
      return { data: {}, error: null }
    })

  it('deja la marca de la sesión de recuperación (la cierra el guard si se va sin terminar)', async () => {
    canjeOk()
    const res = await pedir('code=c0de&returnUrl=%2Fauth%2Fupdate-password')
    expect(destinoDe(res)).toBe('/auth/update-password')
    expect(res.headers.get('set-cookie')).toContain(`${COOKIE_DE_RECUPERACION}=1`)
  })

  it('la invitación del inquilino migrado (?nuevo=1) no la deja', async () => {
    canjeOk()
    const res = await pedir(`code=c0de&returnUrl=${encodeURIComponent('/auth/update-password?nuevo=1')}`)
    expect(res.headers.get('set-cookie') ?? '').not.toContain(COOKIE_DE_RECUPERACION)
  })
})
