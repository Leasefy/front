/**
 * AuthForm — «Tu sesión expiró» sólo cuando la sesión expiró de verdad.
 *
 * Nico (2026-09-08) llegó a /auth?…&reason=expirada y vio el cartel mientras
 * ya estaba entrando otra vez. El cartel se decidía sólo por el parámetro de
 * la URL, y un parámetro no caduca: sobrevive a la recarga, al historial y a
 * la pestaña que el navegador restaura al abrirse.
 *
 * La regla nueva: el cartel sale si `terminarSesion` dejó su aviso hace menos
 * de un minuto; ese aviso se consume al mostrarlo y el parámetro se borra de
 * la barra de direcciones.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { params } = vi.hoisted(() => ({ params: { reason: null as string | null } }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => ({
    get: (k: string) => (k === 'reason' ? params.reason : null),
  }),
}))

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({
    signInWithGoogle: vi.fn(),
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    sendPasswordReset: vi.fn(),
    user: null,
    isAuthenticated: false,
    isLoading: false,
    needsOnboarding: false,
    mfaRequired: false,
  }),
}))

vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => null }))
vi.mock('@/lib/firebase/messaging', () => ({
  requestNotificationPermission: vi.fn().mockResolvedValue(undefined),
  removeFcmToken: vi.fn().mockResolvedValue(undefined),
}))

import { AuthForm } from './AuthForm'
import { terminarSesion, resetSessionTerminal } from '@/lib/auth/session-terminal'

const CARTEL = 'Tu sesión expiró'

let container: HTMLDivElement
let root: Root
const realLocation = window.location

/** El cierre ocurre desde el panel; /auth es ruta de salida y no escribe aviso. */
function huboUnCierreDeVerdad() {
  Object.defineProperty(window, 'location', {
    value: {
      pathname: '/panel/inmobiliaria',
      search: '',
      origin: 'https://app.leasefy.co',
      replace: vi.fn(),
      href: 'https://app.leasefy.co/panel/inmobiliaria',
    },
    writable: true,
    configurable: true,
  })
  terminarSesion('expirada')
  Object.defineProperty(window, 'location', {
    value: realLocation,
    writable: true,
    configurable: true,
  })
}

beforeEach(() => {
  // El reset limpia el aviso además de la bandera: va ANTES del cierre.
  resetSessionTerminal()
  sessionStorage.clear()
  params.reason = 'expirada'
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  sessionStorage.clear()
  vi.clearAllMocks()
})

async function render() {
  await act(async () => {
    root.render(<AuthForm />)
  })
}

describe('AuthForm — el aviso de sesión cerrada', () => {
  it('lo muestra cuando el cierre acaba de ocurrir', async () => {
    huboUnCierreDeVerdad()
    await render()
    expect(container.textContent).toContain(CARTEL)
  })

  it('NO lo muestra con `?reason=expirada` viejo en la URL y ningún cierre detrás', async () => {
    await render()
    expect(container.textContent).not.toContain(CARTEL)
  })

  it('lo consume: la recarga siguiente ya no lo repite', async () => {
    huboUnCierreDeVerdad()
    await render()
    expect(container.textContent).toContain(CARTEL)

    // La recarga = montar de nuevo con el mismo parámetro en la URL.
    await act(async () => root.unmount())
    root = createRoot(container)
    await render()
    expect(container.textContent).not.toContain(CARTEL)
  })
})
