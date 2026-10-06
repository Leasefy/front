/**
 * 🟡 QA-PILOTO-95 r2 (06-10-2026): con el micro COLGADO (acepta y no contesta), `my-permissions` del
 * micro no tenía tope: `isLoading` no bajaba nunca y el panel entero (menú y página) se quedaba en
 * esqueleto. Con tope, al vencer se sigue con los permisos del back y el acceso del agente queda
 * `sin-verificar` (la pantalla lo dice y ofrece reintentar).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'AGY-1' }, agencyMembershipChecked: true }) }))
vi.mock('@/lib/api/client', () => ({
  apiClient: { get: () => Promise.resolve({ isAdmin: true, role: 'ADMIN', effectivePermissions: {} }) },
  getAccessToken: () => 'token-de-prueba',
}))

import { PermissionsProvider, usePermissionsContext, TOPE_DE_LOS_PERMISOS_DEL_MICRO_MS } from './PermissionsContext'

let root: Root | null = null
let container: HTMLDivElement | null = null

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://micro.test')
  // El micro colgado: no contesta; sólo suelta al cortarle la señal.
  vi.stubGlobal('fetch', vi.fn((_u: string, init?: { signal?: AbortSignal }) => new Promise((_r, rej) => {
    init?.signal?.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true })
  })))
})
afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('los permisos del micro con el micro colgado', () => {
  it('al tope deja de cargar: sigue con los del back y el agente queda «sin verificar»', async () => {
    const caja: { c: ReturnType<typeof usePermissionsContext> | null } = { c: null }
    const Sonda = () => {
      caja.c = usePermissionsContext()
      return null
    }
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    act(() => root!.render(<PermissionsProvider><Sonda /></PermissionsProvider>))
    await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    expect(caja.c!.isLoading).toBe(true)
    await act(async () => { await vi.advanceTimersByTimeAsync(TOPE_DE_LOS_PERMISOS_DEL_MICRO_MS + 100) })
    expect(caja.c!.isLoading).toBe(false)
    expect(caja.c!.permissions).not.toBeNull()
    expect(caja.c!.agentAccessStatus).toBe('sin-verificar')
  })
})
