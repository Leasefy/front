/**
 * QA-INQ I-25 (03-10-2026): Inquilinos se protege con el módulo `contratos`,
 * y el cartel de acceso negado decía «No tienes acceso a Contratos» estando
 * en Inquilinos. `seccion` nombra la pantalla en el cartel.
 */
import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }))
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ isAdmin: false, isLoading: false, agencyRole: 'AGENTE', canAccess: () => false }),
}))

import { PageGuard } from './PageGuard'

let container: HTMLDivElement
let root: Root
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})
function render(props: Partial<React.ComponentProps<typeof PageGuard>>) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(<PageGuard {...props}><div data-testid="inner" /></PageGuard>)
  })
}

describe('PageGuard · seccion', () => {
  it('🔴 el cartel nombra la SECCIÓN que se abrió, no el módulo que la protege', () => {
    render({ module: 'contratos', seccion: 'Inquilinos' })
    expect(container.querySelector('[data-testid="inner"]')).toBeNull()
    expect(container.textContent).toContain('No tienes acceso a Inquilinos')
    expect(container.textContent).not.toContain('Contratos')
  })

  it('sin `seccion`, como siempre: el nombre del módulo', () => {
    render({ module: 'contratos' })
    expect(container.textContent).toContain('No tienes acceso a Contratos')
  })
})
