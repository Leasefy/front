/**
 * 🔴 /auth/mfa-verify — «No tengo la app» con un factor YA verificado
 * (Nico, 29-09-2026).
 *
 * Antes: «No tengo la app — activarla ahora» montaba `MfaSetupSection`, que
 * mostraba el factor «Activado» con un «Desactivar» que respondía «Error 422»
 * (Supabase exige `aal2` para quitarlo). Ahora:
 *
 *   · caso B (sin la app): se ofrece restablecerlo con un código al correo y,
 *     al confirmarlo, la MISMA tarjeta pasa a inscribir un factor nuevo; al
 *     terminar, entra como en la verificación normal;
 *   · caso A (con la app, desde `MfaSetupSection`): mientras cambia el factor
 *     la pantalla no se va sola aunque la sesión ya haya subido a `aal2`.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { replace, auth, supa, propsDeLaInscripcion, propsDelCorreo } = vi.hoisted(() => ({
  replace: vi.fn(),
  auth: {
    user: { id: 'u-1', role: 'agency', email: 'duenio@inmobiliaria.co' } as Record<string, unknown>,
    mfaRequired: true,
    mfaEnrollRequired: false,
    setMfaVerified: vi.fn(),
    signOut: vi.fn(),
  },
  supa: { listFactors: vi.fn() },
  propsDeLaInscripcion: { actual: null as null | Record<string, unknown> },
  propsDelCorreo: { actual: null as null | Record<string, unknown> },
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: vi.fn() }) }))
vi.mock('@/lib/auth', () => ({ useAuth: () => auth }))
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => ({ auth: { mfa: supa } }) }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/components/providers/ForceLightMode', () => ({
  ForceLightMode: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@/components/settings/MfaSetupSection', () => ({
  MfaSetupSection: (props: Record<string, unknown>) => {
    propsDeLaInscripcion.actual = props
    return <div data-testid="mfa-setup">inscribir</div>
  },
}))
vi.mock('@/components/auth/RestablecerSegundoFactorPorCorreo', () => ({
  RestablecerSegundoFactorPorCorreo: (props: Record<string, unknown>) => {
    propsDelCorreo.actual = props
    return <div data-testid="restablecer-por-correo">por correo</div>
  },
}))

import MfaVerifyPage from './page'

let host: HTMLDivElement
let root: Root

async function pintar() {
  await act(async () => {
    root.render(<MfaVerifyPage />)
  })
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

async function tocarNoTengoLaApp() {
  const salida = host.querySelector<HTMLElement>('[data-testid="no-tengo-la-app"]')
  expect(salida).not.toBeNull()
  await act(async () => {
    salida!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

async function llamar(fn: unknown, ...args: unknown[]) {
  await act(async () => {
    ;(fn as (...a: unknown[]) => void)(...args)
  })
}

const hay = (testid: string) => host.querySelector(`[data-testid="${testid}"]`) !== null

beforeEach(() => {
  replace.mockClear()
  auth.setMfaVerified.mockClear()
  auth.mfaRequired = true
  auth.mfaEnrollRequired = false
  propsDeLaInscripcion.actual = null
  propsDelCorreo.actual = null
  supa.listFactors.mockReset().mockResolvedValue({
    data: { totp: [{ id: 'f-viejo', status: 'verified' }] },
  })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

describe('/auth/mfa-verify — sin la app', () => {
  it('🔴 con factor verificado, «No tengo la app» ofrece el código al correo, NO un «Desactivar» que no sirve', async () => {
    await pintar()
    await tocarNoTengoLaApp()

    expect(hay('restablecer-por-correo')).toBe(true)
    expect(hay('mfa-setup')).toBe(false)
    expect(host.querySelectorAll('[data-testid^="casilla-"]')).toHaveLength(0)
    expect(propsDelCorreo.actual?.correo).toBe('duenio@inmobiliaria.co')
  })

  it('al confirmar el código del correo, la misma tarjeta inscribe uno NUEVO y al terminar entra', async () => {
    await pintar()
    await tocarNoTengoLaApp()
    await llamar(propsDelCorreo.actual!.onRestablecido)

    expect(hay('mfa-setup')).toBe(true)
    expect(propsDeLaInscripcion.actual).toMatchObject({
      enElIngreso: true,
      inscribirAlAbrir: true,
    })
    expect(host.textContent).toContain('Activa tu segundo factor de nuevo')

    await llamar(propsDeLaInscripcion.actual!.onActivado, 'f-nuevo')
    expect(auth.setMfaVerified).toHaveBeenCalledTimes(1)
    expect(replace).toHaveBeenCalledWith('/panel/inmobiliaria')
  })

  it('🔴 mientras restablece, no se va sola aunque cambie el estado del segundo factor', async () => {
    await pintar()
    await tocarNoTengoLaApp()
    await llamar(propsDelCorreo.actual!.onRestablecido)

    // Sin factores, un refresco del token deja «hay que inscribir»: antes
    // eso la mandaba a /auth/mfa-enroll a mitad de camino.
    auth.mfaRequired = false
    auth.mfaEnrollRequired = true
    await pintar()

    expect(replace).not.toHaveBeenCalled()
    expect(hay('mfa-setup')).toBe(true)
  })

  it('«Volver» regresa a pedir el código de la app', async () => {
    await pintar()
    await tocarNoTengoLaApp()
    await llamar(propsDelCorreo.actual!.onVolver)

    expect(hay('restablecer-por-correo')).toBe(false)
    expect(host.querySelectorAll('[data-testid^="casilla-"]')).toHaveLength(6)
  })

  it('caso A: al cambiar el factor con la app, el aal2 intermedio no la saca de la pantalla', async () => {
    // `listFactors` colgado: la puerta de emergencia monta la inscripción,
    // que encuentra el factor verificado y ofrece «Desactivar» (pidiendo código).
    supa.listFactors.mockReturnValue(new Promise(() => {}))
    await pintar()
    await tocarNoTengoLaApp()
    expect(hay('mfa-setup')).toBe(true)
    expect(propsDeLaInscripcion.actual).toMatchObject({ enElIngreso: true })

    await llamar(propsDeLaInscripcion.actual!.onCambioDeFactor, true)
    auth.mfaRequired = false
    await pintar()
    expect(replace).not.toHaveBeenCalled()

    await llamar(propsDeLaInscripcion.actual!.onActivado, 'f-nuevo')
    expect(auth.setMfaVerified).toHaveBeenCalled()
    expect(replace).toHaveBeenCalledWith('/panel/inmobiliaria')
  })

  it('caso A: «¿No tienes la app?» desde el modal también lleva al código por correo', async () => {
    supa.listFactors.mockReturnValue(new Promise(() => {}))
    await pintar()
    await tocarNoTengoLaApp()
    await llamar(propsDeLaInscripcion.actual!.onSinLaApp)

    expect(hay('restablecer-por-correo')).toBe(true)
  })
})
