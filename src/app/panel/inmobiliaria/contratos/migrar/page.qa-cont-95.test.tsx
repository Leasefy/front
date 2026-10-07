/**
 * QA-CONT-95 (MC-15, H-08, 04-10-2026): «Migrar contratos» para quien sólo ve
 * contratos, y para el abogado externo.
 */
import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { permisos, rolesDelGuard } = vi.hoisted(() => ({
  permisos: { canAccess: (_m: string, _a?: string): boolean => true, isAdmin: false, isLoading: false, agencyRole: 'ADMIN' as string | null },
  rolesDelGuard: { ultimo: null as string[] | null },
}))
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => permisos }))
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children, roles }: { children?: React.ReactNode; roles?: string[] }) => {
    rolesDelGuard.ultimo = roles ?? null
    return children
  },
}))
vi.mock('@/components/contratos/MigrarContratos', () => ({
  MigrarContratos: () => React.createElement('div', { 'data-testid': 'cargador' }),
}))
vi.mock('@/components/migracion/VeredictoDeMigracion', () => ({
  VeredictoDeMigracion: () => null,
  FilasFrenadas: () => null,
}))
vi.mock('@/lib/hooks/use-migracion-con-deuda', () => ({ useDeudaDeMigracion: () => ({ deuda: null, recargar: vi.fn() }) }))
vi.mock('@leasefy/cadence', () => ({ Eyebrow: ({ children }: { children?: React.ReactNode }) => children }))

import MigrarContratosPage from './page'

let root: Root | null = null
let container: HTMLDivElement | null = null
afterEach(async () => {
  await act(async () => { root?.unmount() })
  container?.remove()
})
async function pintar() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => { root!.render(<MigrarContratosPage />) })
}

describe('QA-CONT-95 · Migrar contratos según el rol', () => {
  it('🔴 el contador (ve, no crea) no recibe el cargador ni «Descartar/Retomar»: se le dice', async () => {
    permisos.canAccess = (_m: string, a?: string) => (a ?? 'view') === 'view'
    permisos.agencyRole = 'CONTADOR'
    await pintar()
    expect(document.body.querySelector('[data-testid="cargador"]')).toBeNull()
    expect(document.body.querySelector('[data-testid="migrar-solo-lectura"]')?.textContent).toContain('no subir archivos ni activar contratos')
  })

  it('quien crea contratos sigue teniendo el cargador', async () => {
    permisos.canAccess = () => true
    permisos.agencyRole = 'COORDINADOR'
    await pintar()
    expect(document.body.querySelector('[data-testid="cargador"]')).not.toBeNull()
  })

  it('🔴 el abogado externo queda fuera del guard de la pantalla', async () => {
    permisos.canAccess = () => true
    await pintar()
    expect(rolesDelGuard.ultimo).not.toBeNull()
    expect(rolesDelGuard.ultimo).not.toContain('ABOGADO_EXTERNO')
    expect(rolesDelGuard.ultimo).toContain('CONTADOR')
  })
})
