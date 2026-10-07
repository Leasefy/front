/**
 * `/auth/enlace` — lo que ve quien vuelve de un enlace de Supabase que no trajo
 * `?code=` ni `?token_hash=` (bug de QA, 28-09).
 *
 * El caso real: primer clic en el correo de confirmación → cuenta confirmada y
 * sesión abierta; la pestaña tardó ~37 s (servidor de desarrollo) y la persona
 * volvió a tocar el enlace dos veces → Supabase `#error_code=otp_expired` →
 * «El enlace ya venció» CON la sesión abierta en ese mismo navegador.
 *
 * createRoot + act (convención del repo, sin RTL).
 */
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type AuthCb = (event: string, session: unknown) => void

const st = vi.hoisted(() => ({
  search: '',
  authCb: null as AuthCb | null,
  setSession: null as unknown as Mock<(...a: unknown[]) => unknown>,
  getSessionCalls: 0,
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(st.search),
}))

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({
    auth: {
      onAuthStateChange: (cb: AuthCb) => {
        st.authCb = cb
        return { data: { subscription: { unsubscribe: () => {} } } }
      },
      setSession: (...a: unknown[]) => st.setSession(...a),
      getSession: () => {
        st.getSessionCalls++
        return new Promise(() => {})
      },
    },
  }),
}))

import EnlacePage from './page'

let container: HTMLDivElement
let root: Root
const realLocation = window.location
const SESION_CONFIRMADA = { access_token: 't', user: { email: 'qa@example.com', email_confirmed_at: '2026-09-28T22:52:11Z' } }

function ubicar(hash: string) {
  Object.defineProperty(window, 'location', {
    value: { href: '', hash, pathname: '/auth/enlace', search: `?${st.search}` },
    writable: true,
    configurable: true,
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  st.search = 'returnUrl=%2Fonboarding%2Finmobiliaria'
  st.authCb = null
  st.getSessionCalls = 0
  st.setSession = vi.fn().mockResolvedValue({ error: null })
  ubicar('')
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(() => {
  act(() => root?.unmount())
  container.remove()
  vi.useRealTimers()
  Object.defineProperty(window, 'location', { value: realLocation, writable: true, configurable: true })
})

async function montar() {
  await act(async () => {
    root = createRoot(container)
    root.render(React.createElement(EnlacePage))
  })
}
async function emitir(evento: string, sesion: unknown) {
  await act(async () => {
    st.authCb?.(evento, sesion)
  })
}

describe('/auth/enlace', () => {
  it('?estado=confirmado (code del registro abierto en otro navegador): «Tu correo quedó confirmado: inicia sesión»', async () => {
    st.search = 'returnUrl=%2Fonboarding%2Finmobiliaria&estado=confirmado'
    await montar()
    expect(container.querySelector('h1')?.textContent).toBe('Tu correo quedó confirmado')
    expect(container.textContent).toContain('Inicia sesión con tu correo y contraseña')
    expect(container.textContent).not.toMatch(/venci|No pudimos/i)
    const entrar = container.querySelector('a') as HTMLAnchorElement
    expect(entrar.getAttribute('href')).toBe('/auth?returnUrl=%2Fonboarding%2Finmobiliaria')
    expect(entrar.textContent).toContain('Iniciar sesión')
    // No se queda esperando 8 s ni cambia de mensaje.
    await act(async () => {
      vi.advanceTimersByTime(10000)
    })
    expect(container.querySelector('h1')?.textContent).toBe('Tu correo quedó confirmado')
  })

  it('otp_expired con la sesión abierta en este navegador (el segundo clic): sigue, sin decir «vencido»', async () => {
    ubicar('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired')
    await montar()
    await emitir('INITIAL_SESSION', SESION_CONFIRMADA)
    expect(container.textContent).toContain('Tu correo ya quedó confirmado')
    expect(container.textContent).not.toMatch(/venci/i)
    expect(window.location.href).toBe('/onboarding/inmobiliaria')
  })

  it('otp_expired sin sesión: no afirma que venció; si ya lo confirmó, que entre', async () => {
    ubicar('#error=access_denied&error_code=otp_expired')
    await montar()
    await emitir('INITIAL_SESSION', null)
    expect(container.querySelector('h1')?.textContent).toBe('Este enlace ya no sirve')
    expect(container.textContent).toContain('Si era el de confirmar tu correo y ya lo confirmaste, inicia sesión con tu contraseña')
    expect(window.location.href).toBe('')
  })

  it('otp_expired y el INITIAL_SESSION no llega: igual contesta', async () => {
    ubicar('#error_code=otp_expired')
    await montar()
    await act(async () => {
      vi.advanceTimersByTime(4000)
    })
    expect(container.querySelector('h1')?.textContent).toBe('Este enlace ya no sirve')
  })

  it('tokens del flujo implícito en el fragmento: abre la sesión y va al destino (como antes)', async () => {
    ubicar('#access_token=eyJ.a.b&refresh_token=r3fr35h&type=invite')
    window.history.replaceState = vi.fn()
    await montar()
    expect(st.setSession).toHaveBeenCalledWith({ access_token: 'eyJ.a.b', refresh_token: 'r3fr35h' })
    expect(window.location.href).toBe('/onboarding/inmobiliaria')
  })

  // 02-10-2026 · Regla de oro: si falló la red o Supabase, el enlace puede
  // estar bien; no se le pide otro enlace a la persona.
  it('🔴 abrir la sesión sin respuesta: habla de la conexión, no de pedir otro enlace', async () => {
    ubicar('#access_token=eyJ.a.b&refresh_token=r3fr35h&type=invite')
    window.history.replaceState = vi.fn()
    st.setSession = vi.fn().mockResolvedValue({
      error: Object.assign(new Error('Failed to fetch'), { name: 'AuthRetryableFetchError', status: 0 }),
    })
    await montar()
    expect(container.textContent).toMatch(/conexión/)
    expect(container.textContent).not.toMatch(/reenvíen/)
  })

  it('🔴 un 5xx de Supabase al abrir la sesión: falló de nuestro lado', async () => {
    ubicar('#access_token=eyJ.a.b&refresh_token=r3fr35h&type=invite')
    window.history.replaceState = vi.fn()
    st.setSession = vi.fn().mockResolvedValue({
      error: Object.assign(new Error('Internal error'), { name: 'AuthApiError', status: 500 }),
    })
    await montar()
    expect(container.textContent).toMatch(/de nuestro lado/)
    expect(container.textContent).not.toMatch(/conexi[oó]n|Internal/)
  })

  it('un token rechazado (4xx) sigue diciendo que pidan otro enlace', async () => {
    ubicar('#access_token=eyJ.a.b&refresh_token=r3fr35h&type=invite')
    window.history.replaceState = vi.fn()
    st.setSession = vi.fn().mockResolvedValue({
      error: Object.assign(new Error('Invalid Refresh Token'), { name: 'AuthApiError', status: 400, code: 'refresh_token_not_found' }),
    })
    await montar()
    expect(container.textContent).toContain('Pide que te lo reenvíen')
  })

  it('nunca llama a getSession()', async () => {
    ubicar('#error_code=otp_expired')
    await montar()
    await emitir('INITIAL_SESSION', SESION_CONFIRMADA)
    expect(st.getSessionCalls).toBe(0)
  })
})
