/**
 * /auth/update-password — lo que salió en producción (Nico, 30-09-2026):
 *
 *  1. Con segundo factor, «Guardar contraseña» mostraba «AAL2 session is
 *     required to update email or password when MFA is enabled.» y no había
 *     cómo seguir. Ahora pasa primero por el código y vuelve.
 *  2. El botón tenía dos flechas: la ↗ del botón y una → a mano.
 *  3. Al guardar, la sesión deja de ser «sólo para cambiar la contraseña».
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { replaceMock, pushMock, authState, busqueda } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  pushMock: vi.fn(),
  authState: { isLoading: false, isAuthenticated: true, mfaRequired: false },
  busqueda: { valor: '' },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
  useSearchParams: () => new URLSearchParams(busqueda.valor),
}))

vi.mock('@/lib/auth', () => ({ useAuth: () => authState }))
vi.mock('@/lib/api/client', () => ({ getAccessToken: () => 'token-aal1' }))
vi.mock('@/lib/hooks/use-hidratado', () => ({ useHidratado: () => true }))
vi.mock('@/components/providers/ForceLightMode', () => ({
  ForceLightMode: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import UpdatePasswordPage from './page'
import { COOKIE_DE_RECUPERACION, borrarMarcaDeRecuperacion, hayMarcaDeRecuperacion } from '@/lib/auth/sesion-de-recuperacion'

const CLAVE = 'Otra-Clave#2026-segura'
let container: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.test')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
  authState.isLoading = false
  authState.isAuthenticated = true
  authState.mfaRequired = false
  busqueda.valor = ''
  borrarMarcaDeRecuperacion()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

function escribir(input: HTMLInputElement, valor: string) {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(input, valor)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

async function pintar() {
  await act(async () => {
    root.render(<UpdatePasswordPage />)
  })
}

async function guardar() {
  const [clave, confirmar] = [...container.querySelectorAll('input')] as HTMLInputElement[]
  await act(async () => {
    escribir(clave, CLAVE)
    escribir(confirmar, CLAVE)
  })
  await act(async () => {
    container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

describe('/auth/update-password', () => {
  it('con segundo factor pendiente lleva al código y vuelve acá, sin mostrar el formulario activo', async () => {
    authState.mfaRequired = true
    await pintar()
    expect(replaceMock).toHaveBeenCalledWith(`/auth/mfa-verify?returnUrl=${encodeURIComponent('/auth/update-password')}`)
    expect((container.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true)
  })

  it('conserva la consulta al volver del código (invitación con destino)', async () => {
    authState.mfaRequired = true
    busqueda.valor = 'next=%2Finquilino'
    await pintar()
    expect(replaceMock).toHaveBeenCalledWith(
      `/auth/mfa-verify?returnUrl=${encodeURIComponent('/auth/update-password?next=%2Finquilino')}`,
    )
  })

  it('si Supabase exige aal2 al guardar, va al código en vez de mostrar el error en inglés', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ code: 403, error_code: 'insufficient_aal', msg: 'AAL2 session is required to update email or password when MFA is enabled.' }),
          { status: 403 },
        ),
      ),
    )
    await pintar()
    await guardar()
    expect(replaceMock).toHaveBeenCalledWith(`/auth/mfa-verify?returnUrl=${encodeURIComponent('/auth/update-password')}`)
    expect(container.textContent).not.toContain('AAL2')
  })

  it('al guardar borra la marca de la sesión de recuperación', async () => {
    document.cookie = `${COOKIE_DE_RECUPERACION}=1; path=/`
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })))
    await pintar()
    await guardar()
    expect(container.textContent).toContain('Contraseña actualizada')
    expect(hayMarcaDeRecuperacion()).toBe(false)
  })

  it('«Guardar contraseña» lleva una sola flecha', async () => {
    await pintar()
    const boton = container.querySelector('button[type="submit"]') as HTMLButtonElement
    expect(boton.textContent).toContain('Guardar contraseña')
    expect(boton.querySelectorAll('svg')).toHaveLength(1)
  })
})
