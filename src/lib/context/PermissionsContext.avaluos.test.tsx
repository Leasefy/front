/**
 * QA-IA-95 (05-10-2026): Avalúos lo sirve el BACK. El auxiliar de cartera
 * (back: `avaluos: []`) abría `/inmuebles/avaluos` por URL y veía la pantalla
 * entera, porque `canAccess('avaluos')` seguía la postura del micro («llave
 * ausente = permitido») y el micro no manda esa llave. Si el back dice algo del
 * módulo, manda él.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const AGENCY = 'AGY-1'
const authState = { agency: { id: AGENCY }, agencyMembershipChecked: true }
vi.mock('@/lib/auth', () => ({ useAuth: () => authState }))

const { permisosDelBack } = vi.hoisted(() => ({
  permisosDelBack: { valor: {} as Record<string, unknown> },
}))
vi.mock('@/lib/api/client', () => ({
  apiClient: { get: () => Promise.resolve(permisosDelBack.valor) },
  getAccessToken: () => 'token-de-prueba',
}))

import { PermissionsProvider, usePermissionsContext } from './PermissionsContext'
import { clearBootstrapSeed } from '@/lib/auth/bootstrap-seed'

type Ctx = ReturnType<typeof usePermissionsContext>
let root: Root | null = null
let container: HTMLDivElement | null = null

async function montar(): Promise<Ctx> {
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
  await act(async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve()
  })
  return caja.actual as Ctx
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://localhost:4000')
  // El micro NO manda la llave `avaluos` (como hoy): su postura es «ausente = permitido».
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ cobranza: ['view'], cotizador: [] }) })))
  window.localStorage.clear()
})
afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  clearBootstrapSeed()
})

describe('canAccess(«avaluos») cuando el back sí dice algo (QA-IA-95)', () => {
  it('🔴 el auxiliar de cartera (back: avaluos: []) NO entra, aunque el micro no mande la llave', async () => {
    permisosDelBack.valor = { role: 'AUXILIAR_CARTERA', isAdmin: false, effectivePermissions: { cobros: ['view', 'create'], avaluos: [] } }
    const ctx = await montar()
    expect(ctx.canAccess('avaluos', 'view')).toBe(false)
    expect(ctx.canAccess('cobranza', 'view')).toBe(true)
  })

  it('🔴 el auxiliar de cartera tampoco entra a Matching ni a Estudio (agentes comerciales) aunque el micro no mande la llave', async () => {
    permisosDelBack.valor = { role: 'AUXILIAR_CARTERA', isAdmin: false, effectivePermissions: { cobros: ['view', 'create'], pipeline: [] } }
    const ctx = await montar()
    expect(ctx.canAccess('matching', 'view')).toBe(false)
    expect(ctx.canAccess('estudio', 'view')).toBe(false)
  })

  it('el contador y el asesor siguen entrando a Matching como antes (llave ausente del micro)', async () => {
    permisosDelBack.valor = { role: 'CONTADOR', isAdmin: false, effectivePermissions: { pipeline: [] } }
    expect((await montar()).canAccess('matching', 'view')).toBe(true)
  })

  it('quien tiene avaluos:view en el back sí entra', async () => {
    permisosDelBack.valor = { role: 'AGENTE', isAdmin: false, effectivePermissions: { avaluos: ['view'] } }
    const ctx = await montar()
    expect(ctx.canAccess('avaluos', 'view')).toBe(true)
  })

  it('sin la llave en el back, sigue la postura del micro (ausente = permitido), como antes', async () => {
    permisosDelBack.valor = { role: 'AGENTE', isAdmin: false, effectivePermissions: { pipeline: ['view'] } }
    const ctx = await montar()
    expect(ctx.canAccess('avaluos', 'view')).toBe(true)
  })

  it('el administrador entra siempre', async () => {
    permisosDelBack.valor = { role: 'ADMIN', isAdmin: true, effectivePermissions: 'FULL_ACCESS' }
    const ctx = await montar()
    expect(ctx.canAccess('avaluos', 'view')).toBe(true)
  })
})
