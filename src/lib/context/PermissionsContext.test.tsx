/**
 * Fija la regresión de «No tienes acceso a Cobranza» y un segundo después
 * entrar.
 *
 * Los módulos del agente (cobranza, cotizador) fallan CERRADO. Con `agencyId`
 * todavía sin hidratar el fetch de permisos NI SE DISPARA, así que
 * `canAccess('cobranza')` da false por falta de datos, no por falta de
 * permiso. `agentPermsResolved` es lo que separa esos dos casos; sin él, la
 * puerta acusaba a alguien de no tener acceso y se desdecía en el cuadro
 * siguiente.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const AGENCY = 'AGY-1'

/** Lo que devuelve `useAuth()` — cada test lo reescribe antes de montar. */
let authState: { agency: { id: string } | null; agencyMembershipChecked: boolean } = {
  agency: null,
  agencyMembershipChecked: false,
}

vi.mock('@/lib/auth', () => ({
  useAuth: () => authState,
}))

vi.mock('@/lib/api/client', () => ({
  apiClient: { get: vi.fn(async () => ({ isAdmin: false, role: 'ADMIN', effectivePermissions: {} })) },
  getAccessToken: () => 'token-de-prueba',
}))

import {
  PermissionsProvider,
  usePermissionsContext,
} from './PermissionsContext'

type Ctx = ReturnType<typeof usePermissionsContext>

let root: Root | null = null
let container: HTMLDivElement | null = null

function montar(): { leer: () => Ctx; volverARenderizar: () => void } {
  const caja: { actual: Ctx | null } = { actual: null }
  const Sonda = () => {
    caja.actual = usePermissionsContext()
    return null
  }
  const Arbol = () => (
    <PermissionsProvider>
      <Sonda />
    </PermissionsProvider>
  )
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root!.render(<Arbol />)
  })
  return {
    leer: () => caja.actual as Ctx,
    volverARenderizar: () => {
      act(() => {
        root!.render(<Arbol />)
      })
    },
  }
}

async function asentar() {
  await act(async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve()
  })
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://localhost:4000')
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ cobranza: ['view'] }),
    })),
  )
  authState = { agency: null, agencyMembershipChecked: false }
  window.localStorage.clear()
})

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('agentAccessStatus', () => {
  it('sin agencia y con la sonda de membresía SIN asentar, sigue RESOLVIENDO', async () => {
    const { leer } = montar()
    await asentar()

    // Ésta es la regresión: `isLoading` ya bajó pero al agente nunca se le
    // pudo preguntar. Negar acá es lo que producía el parpadeo.
    expect(leer().isLoading).toBe(false)
    expect(leer().canAccess('cobranza', 'view')).toBe(false)
    expect(leer().agentAccessStatus).toBe('resolviendo')
  })

  it('con agencia y el agente contestando, queda resuelto y da acceso', async () => {
    authState = { agency: { id: AGENCY }, agencyMembershipChecked: true }
    const { leer } = montar()
    await asentar()

    expect(leer().agentAccessStatus).toBe('resuelto')
    expect(leer().agentPermsResolved).toBe(true)
    expect(leer().canAccess('cobranza', 'view')).toBe(true)
  })

  it('sin agencia pero con la sonda YA asentada, está resuelto: es un no de verdad', async () => {
    authState = { agency: null, agencyMembershipChecked: true }
    const { leer } = montar()
    await asentar()

    expect(leer().agentAccessStatus).toBe('resuelto')
    expect(leer().canAccess('cobranza', 'view')).toBe(false)
  })

  it('agente caído NO es una negativa: queda SIN-VERIFICAR', async () => {
    authState = { agency: { id: AGENCY }, agencyMembershipChecked: true }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })),
    )
    const { leer } = montar()
    await asentar()

    // Si esto dijera 'resuelto', una caída del agente se leería como
    // «No tienes acceso a Cobranza» — la misma mentira, un paso más adelante.
    expect(leer().agentAccessStatus).toBe('sin-verificar')
    expect(leer().canAccess('cobranza', 'view')).toBe(false)
  })

  it('cuando la agencia llega tarde no hay ventana de «denegado» intermedia', async () => {
    const { leer, volverARenderizar } = montar()
    await asentar()
    expect(leer().agentAccessStatus).toBe('resolviendo')

    // Llega la agencia: hasta que el fetch de ESA agencia no termine, sigue
    // resolviendo — nunca aparece un «resuelto» con datos viejos.
    authState = { agency: { id: AGENCY }, agencyMembershipChecked: true }
    volverARenderizar()
    expect(leer().agentAccessStatus).toBe('resolviendo')

    await asentar()
    expect(leer().agentAccessStatus).toBe('resuelto')
    expect(leer().canAccess('cobranza', 'view')).toBe(true)
  })
})
