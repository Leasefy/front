/**
 * 22-09 noche · «Permisos de esta persona»: qué hereda de su rol, qué es suyo
 * y por qué; guardar manda su matriz; «Volver a lo de su rol» manda null.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const getMemberPermissions = vi.fn()
const updateMemberPermissions = vi.fn()
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  permissionsApi: {
    getMemberPermissions: (...a: unknown[]) => getMemberPermissions(...a),
    updateMemberPermissions: (...a: unknown[]) => updateMemberPermissions(...a),
  },
}))

import { PermisosDeLaPersona } from './PermisosDeLaPersona'

const PERSONA = {
  id: 'm-1',
  email: 'ana@x.co',
  name: 'Ana',
  role: 'contador' as const,
  status: 'active' as const,
  createdAt: '2026-09-01',
}

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  getMemberPermissions.mockReset()
  updateMemberPermissions.mockReset().mockResolvedValue({})
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

const q = (id: string) => document.querySelector(`[data-testid="${id}"]`)

describe('<PermisosDeLaPersona>', () => {
  it('dice qué es propio y por qué, y guarda la matriz de la persona', async () => {
    getMemberPermissions.mockResolvedValue({
      memberId: 'm-1',
      role: 'CONTADOR',
      isAdmin: false,
      effectivePermissions: { cobros: ['view'], bitacora: ['view'] },
      delRol: { cobros: ['view', 'edit'], bitacora: [] },
      tienePropios: true,
      usingDefaults: false,
      permissions: null,
    })
    await act(async () => {
      root.render(<PermisosDeLaPersona persona={PERSONA} onCerrar={() => undefined} />)
    })
    const lista = q('diferencias-con-el-rol')?.textContent ?? ''
    expect(lista).toContain('quitado a esta persona (su rol lo trae)')
    expect(lista).toContain('sumado a esta persona (su rol no lo trae)')
    expect(q('frase-de-permisos-propios')?.textContent).toContain('2 cambios propios')

    await act(async () => {
      ;(q('guardar-permisos-de-la-persona') as HTMLButtonElement).click()
    })
    expect(updateMemberPermissions).toHaveBeenCalledWith(
      'm-1',
      expect.objectContaining({ bitacora: ['view'], cobros: ['view'] }),
    )
  })

  it('«Volver a lo de su rol» manda null', async () => {
    getMemberPermissions.mockResolvedValue({
      memberId: 'm-1',
      role: 'CONTADOR',
      isAdmin: false,
      effectivePermissions: { cobros: ['view', 'edit', 'export'] },
      delRol: { cobros: ['view', 'edit'] },
      usingDefaults: false,
      permissions: null,
    })
    await act(async () => {
      root.render(<PermisosDeLaPersona persona={PERSONA} onCerrar={() => undefined} />)
    })
    await act(async () => {
      ;(q('volver-a-su-rol') as HTMLButtonElement).click()
    })
    expect(updateMemberPermissions).toHaveBeenCalledWith('m-1', null)
  })
})
