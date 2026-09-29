/**
 * `/auth/confirmar` — confirmar el correo del registro con `token_hash`
 * (bug de QA, 28-09: el enlace decía «vencido» con la cuenta confirmada).
 *
 * Lo que tiene que quedar fijo:
 *  · abrir la página NO gasta el token (el escáner de enlaces del correo la
 *    abre antes que la persona); sólo el clic en «Confirmar mi correo»;
 *  · el clic abre la sesión con `verifyOtp` —sirve en cualquier navegador— y
 *    va al destino;
 *  · un token ya gastado con la sesión abierta en este navegador (segundo clic
 *    en el correo) NO dice «vencido»: dice que el correo quedó confirmado y
 *    sigue;
 *  · nunca `getSession()` (se traba con el `onAuthStateChange` del
 *    AuthProvider, ver `/auth/enlace`).
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
  verifyOtp: null as unknown as Mock<(...a: unknown[]) => unknown>,
  getSessionCalls: 0,
  hidratado: true,
}))

vi.mock('@/lib/hooks/use-hidratado', () => ({ useHidratado: () => st.hidratado }))

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
      verifyOtp: (...a: unknown[]) => st.verifyOtp(...a),
      getSession: () => {
        st.getSessionCalls++
        return new Promise(() => {})
      },
    },
  }),
}))

import ConfirmarPage from './page'

let container: HTMLDivElement
let root: Root
const realLocation = window.location

const GASTADO = { error: Object.assign(new Error('Email link is invalid or has expired'), { code: 'otp_expired', status: 403 }) }
const SESION_CONFIRMADA = { access_token: 't', user: { email: 'qa@example.com', email_confirmed_at: '2026-09-28T22:52:11Z' } }

beforeEach(() => {
  st.search = 'token_hash=pkce_abc&type=email&returnUrl=%2Fonboarding%2Finmobiliaria'
  st.authCb = null
  st.getSessionCalls = 0
  st.hidratado = true
  st.verifyOtp = vi.fn().mockResolvedValue({ data: { session: {} }, error: null })
  Object.defineProperty(window, 'location', { value: { href: '' }, writable: true, configurable: true })
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(() => {
  act(() => root?.unmount())
  container.remove()
  Object.defineProperty(window, 'location', { value: realLocation, writable: true, configurable: true })
})

async function montar() {
  await act(async () => {
    root = createRoot(container)
    root.render(React.createElement(ConfirmarPage))
  })
}
const boton = () =>
  Array.from(container.querySelectorAll('button')).find((b) => /Confirmar mi correo/.test(b.textContent ?? ''))
async function tocar(b: HTMLElement | undefined) {
  expect(b).toBeDefined()
  await act(async () => {
    b!.click()
  })
}
async function emitir(evento: string, sesion: unknown) {
  await act(async () => {
    st.authCb?.(evento, sesion)
  })
}

describe('/auth/confirmar', () => {
  it('al abrir NO gasta el token: muestra el botón y espera el clic', async () => {
    await montar()
    await emitir('INITIAL_SESSION', null)
    expect(boton()).toBeDefined()
    expect(st.verifyOtp).not.toHaveBeenCalled()
    expect(window.location.href).toBe('')
  })

  it('antes de hidratar el botón está apagado: un clic en el HTML del servidor no se pierde en silencio', async () => {
    st.hidratado = false
    await montar()
    const b = boton() as HTMLButtonElement
    expect(b.disabled).toBe(true)
    await tocar(b)
    expect(st.verifyOtp).not.toHaveBeenCalled()
  })

  it('el clic confirma con verifyOtp(token_hash) y va al destino', async () => {
    await montar()
    await tocar(boton())
    expect(st.verifyOtp).toHaveBeenCalledTimes(1)
    expect(st.verifyOtp).toHaveBeenCalledWith({ token_hash: 'pkce_abc', type: 'email' })
    expect(window.location.href).toBe('/onboarding/inmobiliaria')
    expect(container.textContent).toContain('Tu correo quedó confirmado')
  })

  it('dos clics seguidos gastan el token una sola vez', async () => {
    let soltar: (v: unknown) => void = () => {}
    st.verifyOtp = vi.fn().mockReturnValue(new Promise((r) => { soltar = r }))
    await montar()
    const b = boton()
    await act(async () => {
      b!.click()
      b!.click()
    })
    expect(st.verifyOtp).toHaveBeenCalledTimes(1)
    await act(async () => soltar({ data: {}, error: null }))
  })

  it('token ya gastado y la sesión abierta en este navegador: «ya quedó confirmado», nunca «venció»', async () => {
    st.verifyOtp = vi.fn().mockResolvedValue(GASTADO)
    await montar()
    await emitir('INITIAL_SESSION', SESION_CONFIRMADA)
    await tocar(boton())
    expect(container.textContent).toContain('Tu correo ya quedó confirmado')
    expect(container.textContent).not.toMatch(/venci/i)
    expect(window.location.href).toBe('/onboarding/inmobiliaria')
  })

  it('token ya gastado y sin sesión: lo dice sin afirmar que venció y ofrece entrar', async () => {
    st.verifyOtp = vi.fn().mockResolvedValue(GASTADO)
    await montar()
    await emitir('INITIAL_SESSION', null)
    await tocar(boton())
    expect(container.textContent).toContain('Este enlace ya no sirve')
    expect(container.textContent).toContain('Si ya confirmaste tu correo, inicia sesión con tu contraseña')
    const entrar = container.querySelector('a[href^="/auth?"]') as HTMLAnchorElement | null
    expect(entrar?.getAttribute('href')).toBe('/auth?returnUrl=%2Fonboarding%2Finmobiliaria')
    expect(window.location.href).toBe('')
  })

  it('un fallo de red deja volver a intentar', async () => {
    st.verifyOtp = vi.fn().mockRejectedValueOnce(new Error('fetch failed')).mockResolvedValue({ data: {}, error: null })
    await montar()
    await tocar(boton())
    expect(container.textContent).toContain('No pudimos confirmar tu correo')
    const reintentar = Array.from(container.querySelectorAll('button')).find((b) => /Intentar de nuevo/.test(b.textContent ?? ''))
    await tocar(reintentar)
    expect(st.verifyOtp).toHaveBeenCalledTimes(2)
    expect(window.location.href).toBe('/onboarding/inmobiliaria')
  })

  it('sin token_hash: enlace incompleto, sin llamar a Supabase', async () => {
    st.search = 'returnUrl=%2Fonboarding%2Finmobiliaria'
    await montar()
    expect(container.textContent).toContain('Este enlace está incompleto')
    expect(boton()).toBeUndefined()
    expect(st.verifyOtp).not.toHaveBeenCalled()
  })

  it('un destino que sale del sitio no se sigue', async () => {
    st.search = 'token_hash=abc&type=email&returnUrl=https%3A%2F%2Fevil.example'
    await montar()
    await tocar(boton())
    expect(window.location.href).toBe('/auth/post-login')
  })

  it('nunca llama a getSession()', async () => {
    st.verifyOtp = vi.fn().mockResolvedValue(GASTADO)
    await montar()
    await tocar(boton())
    expect(st.getSessionCalls).toBe(0)
  })
})
