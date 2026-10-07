/**
 * QA-IA-95 (05-10-2026): Cobranza › Configuración ofrecía su propio «nivel de
 * autonomía» (Sugerir · Aprobar · Automático controlado · Automático completo)
 * aunque la cobranza ya tuviera su modo elegido en el Piloto, y en ese caso el
 * micro ignora el nivel (`piloto/autonomia.ts → modoEfectivo`). Ahora la
 * pantalla dice qué modo manda y dónde se cambia.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/panel/inmobiliaria/pagos/cobranza/configuracion',
}))
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({
    permissions: null, isLoading: false, error: null, canAccess: () => true, isAdmin: true, agencyRole: 'ADMIN', refetch: vi.fn(),
  }),
}))
vi.mock('@/components/auth/PageGuard', () => ({ PageGuard: ({ children }: { children: React.ReactNode }) => children }))
vi.mock('@/lib/hooks/cobranza/use-agency-policy', () => ({
  useAgencyPolicy: () => ({ data: null, isLoading: false, error: null, notProvisioned: true, refetch: vi.fn(), patchPolicy: vi.fn() }),
}))
vi.mock('@/lib/hooks/cobranza/use-autonomy', () => ({
  useAutonomy: () => ({
    data: { agencyId: 'ag-1', autonomyLevel: 'automatico_completo', requiresHumanApproval: false, isDefault: false },
    isLoading: false, error: null, notProvisioned: false, refetch: vi.fn(), saveAutonomy: vi.fn(),
  }),
}))
const { flota } = vi.hoisted(() => ({ flota: { origen: 'piloto' as 'piloto' | 'politica', modo: 'copiloto' } }))
vi.mock('@/lib/api/piloto', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/piloto')>()),
  fetchPilotoFlota: async () => ({ data: { agentes: [{ agente: 'cobranza', modo: flota.modo, origen: flota.origen, corre: true }] }, notAvailable: false }),
}))

import CobranzaConfiguracionPage from './page'
import { AuthContext } from '@/lib/auth/auth-context'

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_AGENT_URL', 'http://localhost:4000')
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllEnvs()
})

async function pintar() {
  const auth = { agency: { id: 'ag-1', name: 'Inmobiliaria' } } as unknown as React.ContextType<typeof AuthContext>
  await act(async () => {
    root.render(
      <AuthContext.Provider value={auth}>
        <CobranzaConfiguracionPage />
      </AuthContext.Provider>,
    )
  })
  await act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve()
  })
}

describe('Cobranza › Configuración › Autonomía (QA-IA-95)', () => {
  it('con el modo elegido en el Piloto, dice cuál manda y dónde se cambia; no ofrece el nivel que ya no decide', async () => {
    flota.origen = 'piloto'
    flota.modo = 'copiloto'
    await pintar()
    const aviso = container.querySelector('[data-testid="autonomia-en-el-piloto"]')
    expect(aviso?.textContent).toContain('Copiloto')
    expect(aviso?.querySelector('a')?.getAttribute('href')).toBe('/panel/inmobiliaria/piloto')
    expect(container.querySelector('[data-testid="autonomy-option-automatico_completo"]')).toBeNull()
  })

  it('sin elección en el Piloto, se ofrecen los TRES modos del Piloto, no los cuatro peldaños (N-13, QA-PAGOS-95 r2)', async () => {
    flota.origen = 'politica'
    await pintar()
    expect(container.querySelector('[data-testid="autonomia-en-el-piloto"]')).toBeNull()
    expect(container.querySelector('[data-testid="autonomy-option-automatico_completo"]')).toBeNull()
    expect(container.querySelector('[data-testid="autonomia-modo-sombra"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="autonomia-modo-copiloto"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="autonomia-modo-autonomo"]')).not.toBeNull()
    // El peldaño de antes (automático completo) se dice con su modo: Automático.
    expect(container.querySelector('[data-testid="autonomia-tres-modos"]')?.textContent).toContain('Automático')
  })
})
