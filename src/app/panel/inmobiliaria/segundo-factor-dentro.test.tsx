/**
 * El layout del panel de la inmobiliaria con el segundo factor por activar.
 *
 * 🔴 Nico, 30-09-2026: «¿por qué me está sacando y me lleva a esta página? …
 * yo estoy es dentro». Con el `ProtectedRoute` REAL: no lo saca a
 * `/auth/mfa-enroll`, pinta la escena dentro, y no monta NADA de lo que pide
 * datos (el guard de suscripción envuelve todos los providers del panel: si
 * él no se monta, ninguno se monta). El registro a medias sigue mandando.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { replaceMock, authState, montajes } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  montajes: { suscripcion: 0, asistente: 0 },
  authState: {
    user: { id: 'u1', role: 'agency', onboardingCompleted: true } as Record<string, unknown>,
    isAuthenticated: true,
    isLoading: false,
    mfaRequired: false,
    mfaEnrollRequired: true,
    needsOnboarding: false,
    perfilElegido: null,
    agencyRole: 'ADMIN',
    hasActiveAgencyMembership: true,
    agencyMembershipChecked: true,
    agency: { id: 'ag1', name: 'Inmobiliaria Horizonte' },
    refreshUser: vi.fn(),
    signOut: vi.fn(),
    setMfaVerified: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  usePathname: () => '/panel/inmobiliaria/piloto',
}))

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => authState,
}))

vi.mock('@/components/providers/SmoothScroll', () => ({
  useLenis: () => ({ stop: vi.fn(), start: vi.fn() }),
}))

// Todo el panel (providers, sidebar, Piloto, la página) vive DENTRO de este
// guard: contar sus montajes es contar si el panel se montó.
vi.mock('@/components/auth/AgencySubscriptionGuard', () => ({
  AgencySubscriptionGuard: () => {
    React.useEffect(() => {
      montajes.suscripcion += 1
    }, [])
    return <div data-testid="panel-montado" />
  },
}))

vi.mock('@/components/auth/AsistentePendienteGuard', () => ({
  AsistentePendienteGuard: () => {
    React.useEffect(() => {
      montajes.asistente += 1
    }, [])
    return null
  },
}))

vi.mock('@/components/auth/ActivarSegundoFactorPasoAPaso', () => ({
  ActivarSegundoFactorPasoAPaso: () => <h1 data-testid="paso-a-paso">Activa tu segundo factor</h1>,
}))

import InmobiliariaLayout from './layout'

let container: HTMLDivElement
let root: Root

async function pintar() {
  await act(async () => {
    root.render(
      <InmobiliariaLayout>
        <div data-testid="pagina">página</div>
      </InmobiliariaLayout>,
    )
  })
  await act(async () => {
    await Promise.resolve()
  })
}

const hay = (id: string) => document.querySelector(`[data-testid="${id}"]`) !== null

beforeEach(() => {
  montajes.suscripcion = 0
  montajes.asistente = 0
  authState.mfaEnrollRequired = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

describe('Layout del panel — el segundo factor se activa DENTRO', () => {
  it('con mfaEnrollRequired: no saca a /auth/mfa-enroll, pinta la escena y NO monta el panel ni sus providers', async () => {
    await pintar()

    expect(replaceMock).not.toHaveBeenCalled()
    expect(hay('segundo-factor-dentro-del-panel')).toBe(true)
    expect(hay('paso-a-paso')).toBe(true)
    expect(hay('panel-montado')).toBe(false)
    expect(montajes.suscripcion).toBe(0)
    expect(hay('pagina')).toBe(false)
  })

  it('el registro a medias sigue mandando: AsistentePendienteGuard está montado también en la escena', async () => {
    await pintar()

    expect(montajes.asistente).toBe(1)
  })

  it('sin mfaEnrollRequired monta el panel como siempre', async () => {
    authState.mfaEnrollRequired = false
    await pintar()

    expect(hay('segundo-factor-dentro-del-panel')).toBe(false)
    expect(montajes.suscripcion).toBe(1)
    expect(montajes.asistente).toBe(1)
  })

  it('al soltar el contexto mfaEnrollRequired, el panel se monta en el mismo sitio', async () => {
    await pintar()
    expect(montajes.suscripcion).toBe(0)

    authState.mfaEnrollRequired = false
    await pintar()
    expect(hay('segundo-factor-dentro-del-panel')).toBe(false)
    expect(montajes.suscripcion).toBe(1)
    expect(replaceMock).not.toHaveBeenCalled()
  })
})
