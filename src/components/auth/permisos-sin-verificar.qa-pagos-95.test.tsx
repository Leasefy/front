/**
 * H-09 (QA-PAGOS-95 ronda 2; main, con la recomendada): un 500 de los permisos
 * no apaga el panel. «No se pudo saber» (`sin-verificar`) no es «no».
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }))
const permisos = {
  isAdmin: false,
  isLoading: false,
  agencyRole: null as string | null,
  canAccess: (_m: string, _a: string) => false,
  permisosDelBack: 'sin-verificar' as 'sin-verificar' | 'resuelto' | 'resolviendo',
  refetch: vi.fn(),
}
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => permisos }))

import { PageGuard } from './PageGuard'
import { falloSinRespuesta } from '@/lib/context/PermissionsContext'
import { pasaGateDeFila } from '@/lib/nav/agency-nav-filter'

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})
const $ = (id: string) => container.querySelector(`[data-testid="${id}"]`)

describe('H-09 · permisos sin verificar', () => {
  it('🔴 la pantalla se muestra con el aviso y «Reintentar»; no el cartel de negado', () => {
    permisos.permisosDelBack = 'sin-verificar'
    act(() =>
      root.render(
        <PageGuard module="cobros">
          <p data-testid="contenido">Cartera</p>
        </PageGuard>,
      ),
    )
    expect($('contenido')).not.toBeNull()
    expect($('permisos-sin-verificar')!.textContent).toContain('No pudimos verificar tus permisos')
    expect($('pantalla-negada')).toBeNull()
    act(() => ($('permisos-reintentar') as HTMLButtonElement).click())
    expect(permisos.refetch).toHaveBeenCalled()
  })

  it('con la respuesta del back (un «no» de verdad) sigue el cartel de negado', () => {
    permisos.permisosDelBack = 'resuelto'
    act(() =>
      root.render(
        <PageGuard module="cobros">
          <p data-testid="contenido">Cartera</p>
        </PageGuard>,
      ),
    )
    expect($('contenido')).toBeNull()
    expect($('pantalla-negada')).not.toBeNull()
  })

  it('«no se pudo saber» es sin respuesta o 5xx; 401/403/404 son un no', () => {
    expect(falloSinRespuesta(new TypeError('fetch failed'))).toBe(true)
    expect(falloSinRespuesta({ status: 500 })).toBe(true)
    expect(falloSinRespuesta({ status: 0 })).toBe(true)
    expect(falloSinRespuesta({ status: 403 })).toBe(false)
    expect(falloSinRespuesta({ status: 401 })).toBe(false)
  })

  it('🔴 el menú no esconde Dinero cuando los permisos del back no se pudieron saber', () => {
    const ctx = { canAccess: () => false, isAdmin: false, agencyRole: null }
    expect(pasaGateDeFila({ module: 'cobros' }, ctx)).toBe(false)
    expect(pasaGateDeFila({ module: 'cobros' }, { ...ctx, backUnverified: true })).toBe(true)
    expect(pasaGateDeFila({ module: 'cobros', roles: ['ADMIN', 'CONTADOR'] }, { ...ctx, backUnverified: true })).toBe(true)
  })
})
