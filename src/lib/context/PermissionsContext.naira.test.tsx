/**
 * PermissionsContext.naira.test.tsx — el admin del monolito NO ve Naira sin el arreglo del agente (13-01, FG13-8, D13-3).
 *
 * `canAccess` pregunta `isAgentModule` ANTES que `permissions.isAdmin` (PermissionsContext.tsx:218 y :225). Con `naira`
 * en FAIL_CLOSED_MODULES, el admin del monolito deja de alcanzar a Naira: sin `naira` en /my-permissions del agente,
 * todo es falso, y la acción real la decide el agente (no el rol del monolito). El camino del admin se prueba VIVO en el
 * mismo montaje (`dispersiones` sí pasa), para que la negativa no sea por `isLoading`.
 *
 * Vive aparte para no tocar PermissionsContext.test.tsx (su arnés se copia; ese test no se toca ni se debilita).
 * Marcador [N13:*] en el TÍTULO.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const AGENCY = 'AGY-1'

let authState: { agency: { id: string } | null; agencyMembershipChecked: boolean } = {
  agency: { id: AGENCY },
  agencyMembershipChecked: true,
}

vi.mock('@/lib/auth', () => ({
  useAuth: () => authState,
}))

const { legacyPermissionsGetMock } = vi.hoisted(() => ({
  legacyPermissionsGetMock: vi.fn((..._args: unknown[]) =>
    Promise.resolve({ isAdmin: true, role: 'ADMIN', effectivePermissions: 'FULL_ACCESS' }),
  ),
}))

vi.mock('@/lib/api/client', () => ({
  apiClient: { get: (...args: unknown[]) => legacyPermissionsGetMock(...args) },
  getAccessToken: () => 'token-de-prueba',
}))

import { PermissionsProvider, usePermissionsContext } from './PermissionsContext'
import { clearBootstrapSeed } from '@/lib/auth/bootstrap-seed'

type Ctx = ReturnType<typeof usePermissionsContext>

let root: Root | null = null
let container: HTMLDivElement | null = null

function montar(): { leer: () => Ctx } {
  const caja: { actual: Ctx | null } = { actual: null }
  const Sonda = () => {
    caja.actual = usePermissionsContext()
    return null
  }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root!.render(
      <PermissionsProvider>
        <Sonda />
      </PermissionsProvider>,
    )
  })
  return { leer: () => caja.actual as Ctx }
}

async function asentar() {
  await act(async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve()
  })
}

/** El payload de /my-permissions del agente que devuelve el `fetch` de este test. */
function agenteContesta(payload: Record<string, string[]>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, status: 200, json: async () => payload })),
  )
}

beforeEach(() => {
  legacyPermissionsGetMock.mockClear()
  vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://localhost:4000')
  authState = { agency: { id: AGENCY }, agencyMembershipChecked: true }
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
  clearBootstrapSeed()
})

describe('naira — el admin del monolito no alcanza a Naira (FG13-8)', () => {
  it('[N13:naira-fail-closed] admin del monolito sin el arreglo naira del agente: naira falso, el resto del admin vivo', async () => {
    agenteContesta({ cobranza: ['view'], cotizador: [] })
    const { leer } = montar()
    await asentar()

    expect(leer().agentAccessStatus).toBe('resuelto')
    expect(leer().permissions?.isAdmin).toBe(true)
    expect(leer().canAccess('dispersiones', 'view')).toBe(true) // el camino del admin está VIVO
    expect(leer().canAccess('naira', 'view')).toBe(false)
    expect(leer().canAccess('naira', 'briefing-view')).toBe(false)
  })

  it('[N13:naira-fail-closed] con el agente caído, naira también es falso para el admin', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })),
    )
    const { leer } = montar()
    await asentar()

    expect(leer().agentAccessStatus).toBe('sin-verificar')
    expect(leer().permissions?.isAdmin).toBe(true)
    expect(leer().canAccess('dispersiones', 'view')).toBe(true)
    expect(leer().canAccess('naira', 'view')).toBe(false)
    expect(leer().canAccess('naira', 'memory-view')).toBe(false)
  })

  it('[N13:naira-view-alias] con naira: [] el alias view es falso', async () => {
    agenteContesta({ cobranza: [], cotizador: [], naira: [] })
    const { leer } = montar()
    await asentar()

    expect(leer().agentAccessStatus).toBe('resuelto')
    expect(leer().canAccess('naira', 'view')).toBe(false)
  })

  it('[N13:control-positivo] con naira del agente: view y la acción otorgada sí; otra acción no, aun para el admin', async () => {
    agenteContesta({ cobranza: [], cotizador: [], naira: ['briefing-view', 'memory-view'] })
    const { leer } = montar()
    await asentar()

    expect(leer().canAccess('naira', 'view')).toBe(true)
    expect(leer().canAccess('naira', 'briefing-view')).toBe(true)
    expect(leer().canAccess('naira', 'memory-erase')).toBe(false) // la autoridad es el agente
  })
})
