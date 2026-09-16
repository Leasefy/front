/**
 * IrALaCobranza — desde la Cartera sigue habiendo camino a la Cobranza.
 *
 * Cobranza dejó de ser una card del riel de Pagos el 2026-09-16 (se mudó a
 * «Agentes IA»). La cartera es exactamente lo que la cobranza persigue, así
 * que el camino queda como ENLACE, con el mismo gate que la fila del menú.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('next/link', () => ({
  default: ({ children, href, ...resto }: { children: React.ReactNode; href: string } & Record<string, unknown>) =>
    React.createElement('a', { href, ...resto }, children),
}))

const permisos = {
  modulos: null as string[] | null,
  isAdmin: false,
  agencyRole: 'CONTADOR' as string | null,
  agentAccessStatus: 'resuelto' as string,
}

vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({
    canAccess: (m: string) => permisos.modulos === null || permisos.modulos.includes(m),
    isAdmin: permisos.isAdmin,
    agencyRole: permisos.agencyRole,
    agentAccessStatus: permisos.agentAccessStatus,
  }),
}))

import { IrALaCobranza } from './IrALaCobranza'

let contenedor: HTMLDivElement
let root: Root

function render() {
  act(() => {
    root.render(<IrALaCobranza />)
  })
}

const enlace = () => contenedor.querySelector('[data-testid="ir-a-la-cobranza"]')

beforeEach(() => {
  permisos.modulos = null
  permisos.isAdmin = false
  permisos.agencyRole = 'CONTADOR'
  permisos.agentAccessStatus = 'resuelto'
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
})

describe('IrALaCobranza', () => {
  it('lleva a la sala de Cobranza, en su URL de siempre, y es un enlace (no una pestaña)', () => {
    render()
    expect(enlace()?.tagName).toBe('A')
    expect(enlace()?.getAttribute('href')).toBe('/panel/inmobiliaria/pagos/cobranza')
    expect(enlace()?.getAttribute('role')).toBeNull()
    expect(enlace()?.textContent).toContain('Ir a la cobranza')
  })

  it('sin permiso de `cobranza` no se muestra: un enlace que rebota es peor que ninguno', () => {
    permisos.modulos = ['cobros']
    render()
    expect(enlace()).toBeNull()
  })

  it('con el agente sin contestar se muestra igual, como la fila del menú', () => {
    permisos.modulos = ['cobros']
    permisos.agentAccessStatus = 'sin-verificar'
    render()
    expect(enlace()).not.toBeNull()
  })

  it('el comercial no lo ve: Cobranza es de finanzas, igual que en el menú', () => {
    permisos.agencyRole = 'AGENTE'
    render()
    expect(enlace()).toBeNull()
  })
})
