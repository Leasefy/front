/**
 * /auth/mfa-enroll — T-0099 destino de «inscripción pendiente».
 *
 * 🔴 30-09-2026 · El rebote que vio Nico: antes el primer código iba por HTTP
 * crudo (la sesión del SDK seguía en `aal1`), la pantalla mandaba a
 * `/auth/mfa-verify`, que la devolvía acá con «Activada · Desactivar», y al
 * final pedía OTRO código. Estas pruebas montan el paso a paso DE VERDAD (sin
 * stub) para fijar la salida: verificación por el SDK, `setMfaVerified()`, y
 * directo al destino en cuanto el contexto suelta `mfaEnrollRequired`.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { replaceMock, signOutMock, setMfaVerifiedMock, authState, challengeMock, verifyMock } =
  vi.hoisted(() => ({
    replaceMock: vi.fn(),
    signOutMock: vi.fn().mockResolvedValue(undefined),
    setMfaVerifiedMock: vi.fn(),
    authState: {
      user: null as Record<string, unknown> | null,
      mfaEnrollRequired: true,
      mfaRequired: false,
      isLoading: false,
    },
    challengeMock: vi.fn(),
    verifyMock: vi.fn(),
  }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ ...authState, signOut: signOutMock, setMfaVerified: setMfaVerifiedMock }),
}))

vi.mock('@/lib/api/client', () => ({
  getAccessToken: () => 'token-aal1',
}))

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({ auth: { mfa: { challenge: challengeMock, verify: verifyMock } } }),
}))

vi.mock('@/components/providers/ForceLightMode', () => ({
  ForceLightMode: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// El candado del asistente a medias tiene sus propias pruebas
// (AsistentePendienteGuard.test.tsx); acá se prueba el paso a paso del 2FA.
// Con el registro terminado el guard deja pasar lo de adentro.
vi.mock('@/components/auth/AsistentePendienteGuard', () => ({
  AsistentePendienteGuard: ({ children }: { children?: import('react').ReactNode }) => children ?? null,
}))

import MfaEnrollPage from './page'

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://sb.test'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'

let container: HTMLDivElement
let root: Root
let fetchMock: ReturnType<typeof vi.fn>
let factoresDeLaCuenta: Array<{ id: string; factor_type: string; status: string }>

function respuesta(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as unknown as Response
}

beforeEach(() => {
  replaceMock.mockClear()
  setMfaVerifiedMock.mockClear()
  signOutMock.mockClear()
  setMfaVerifiedMock.mockClear()
  authState.user = { id: 'u1', role: 'agency' }
  authState.mfaEnrollRequired = true
  authState.mfaRequired = false
  authState.isLoading = false
  factoresDeLaCuenta = []
  challengeMock.mockReset().mockResolvedValue({ data: { id: 'ch1' }, error: null })
  verifyMock.mockReset().mockResolvedValue({ data: { access_token: 'token-aal2' }, error: null })
  fetchMock = vi.fn(async (url: string) => {
    const u = String(url)
    if (u.endsWith('/user')) return respuesta({ factors: factoresDeLaCuenta })
    if (u.endsWith('/factors')) {
      return respuesta({ id: 'f-nuevo', totp: { qr_code: '<svg/>', secret: 'JBSWY3DPEHPK3PXP' } })
    }
    return respuesta({})
  })
  vi.stubGlobal('fetch', fetchMock)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

async function render() {
  await act(async () => {
    root.render(<MfaEnrollPage />)
  })
}

function porTestId(id: string) {
  return container.querySelector(`[data-testid="${id}"]`) as HTMLElement | null
}

async function clic(el: Element | null) {
  await act(async () => {
    el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

async function activarConElCodigo(codigo = '123456') {
  await clic(porTestId('ya-tengo-la-app'))
  await clic(porTestId('ya-lo-agregue'))
  const primera = porTestId('casilla-0') as HTMLInputElement
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(primera, codigo)
    primera.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('/auth/mfa-enroll', () => {
  it('muestra el paso a paso, no la fila de Configuración', async () => {
    await render()

    expect(porTestId('paso-descargar')).not.toBeNull()
    expect(container.textContent).not.toContain('Capa extra de seguridad')
    expect(container.textContent).not.toContain('Desactivar')
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('si ya no hace falta inscribir, manda al inicio del rol — nadie queda varado acá', async () => {
    authState.mfaEnrollRequired = false
    await render()
    expect(replaceMock).toHaveBeenCalledWith('/panel/inmobiliaria')
  })

  it('si lo que falta es el CÓDIGO de un factor que ya existe, manda a /auth/mfa-verify', async () => {
    authState.mfaEnrollRequired = false
    authState.mfaRequired = true
    await render()
    expect(replaceMock).toHaveBeenCalledWith('/auth/mfa-verify')
  })

  it('no se va mientras la sesión todavía carga (el valor de fábrica no es una respuesta)', async () => {
    authState.mfaEnrollRequired = false
    authState.isLoading = true
    await render()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('«Cerrar sesión» (con tilde) cierra y vuelve a /auth', async () => {
    await render()
    const salir = [...container.querySelectorAll('button')].find((b) =>
      (b.textContent ?? '').includes('Cerrar sesión'),
    )
    expect(salir).toBeTruthy()
    await clic(salir ?? null)
    expect(signOutMock).toHaveBeenCalled()
    expect(replaceMock).toHaveBeenCalledWith('/auth')
  })

  it('🔴 afuera se queda como estaba: con «Cerrar sesión» y el encabezado propio del paso a paso', async () => {
    // Nico, 30-09: el «Cerrar sesión» se quitó DENTRO del panel; acá sirve
    // para recuperar el acceso y para lo que llega de afuera.
    await render()
    expect(container.textContent).toContain('Cerrar sesión')
    expect(container.textContent).toContain('Activa tu segundo factor')
    expect(container.textContent).toContain('aunque tenga tu contraseña')
    expect(container.textContent).not.toContain('Protege tu cuenta')
  })

  it('🔴 al completar el código: verifica por el SDK, llama setMfaVerified y sale al panel — NUNCA a /auth/mfa-verify', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    await render()
    await activarConElCodigo()

    // Por el SDK (sale MFA_CHALLENGE_VERIFIED), no por HTTP crudo.
    expect(verifyMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls.some((c) => /\/(challenge|verify)$/.test(String(c[0])))).toBe(false)
    expect(setMfaVerifiedMock).toHaveBeenCalledTimes(1)
    expect(porTestId('segundo-factor-listo')).not.toBeNull()
    expect(container.textContent).not.toContain('Desactivar')

    // Mientras el contexto todavía cree que falta inscribir, NO navega: eso
    // es lo que hacía rebotar a ProtectedRoute.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000)
    })
    expect(replaceMock).not.toHaveBeenCalled()

    // Llega el evento del SDK: auth-context apaga el pendiente.
    authState.mfaEnrollRequired = false
    await render()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })

    expect(replaceMock).toHaveBeenCalledTimes(1)
    expect(replaceMock).toHaveBeenCalledWith('/panel/inmobiliaria')
    expect(replaceMock).not.toHaveBeenCalledWith('/auth/mfa-verify')
  })

  it('si el contexto no se entera a tiempo, sale igual con carga completa (la sesión aal2 ya quedó guardada)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => {})
    await render()
    await activarConElCodigo()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000)
    })
    expect(assign).toHaveBeenCalledWith('/panel/inmobiliaria')
    expect(replaceMock).not.toHaveBeenCalledWith('/auth/mfa-verify')
  })

  it('si al abrir la cuenta ya tenía un factor verificado, va a escribir su código en /auth/mfa-verify', async () => {
    factoresDeLaCuenta = [{ id: 'f-viejo', factor_type: 'totp', status: 'verified' }]
    await render()
    await act(async () => {
      await Promise.resolve()
    })
    expect(replaceMock).toHaveBeenCalledWith('/auth/mfa-verify')
  })
})
