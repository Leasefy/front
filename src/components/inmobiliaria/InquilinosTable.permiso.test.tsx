/**
 * QA-INQ-95 (E-19 / PR-02 / PR-04, 04-10-2026): el contador y el viewer veían
 * «Crear su contrato» vivo en las filas sin arriendo; la pantalla de destino pide
 * `contratos:create` y el clic rebotaba. Sin ese permiso, el enlace no se pinta.
 */
import * as React from 'react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { Inquilino, ArriendoDeInquilino } from '@/lib/api/inquilinos.service'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    formatCurrency: (n: number) => `$${n.toLocaleString('es-CO')}`,
    formatDate: (d: string) => d,
  }),
}))
vi.mock('next/link', () => ({
  default: ({ children, href, ...r }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href, ...r }, children),
}))
const { pantalla } = vi.hoisted(() => ({ pantalla: { celular: false } }))
const permisos = vi.hoisted(() => ({ valor: null as null | { canAccess: (m: string, a: string) => boolean } }))
vi.mock('@/lib/context/PermissionsContext', () => ({ usePermissionsContextSafe: () => permisos.valor }))
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => pantalla.celular }))

import { InquilinosTable, EstadoDelArriendo, textoDeVigentes } from './InquilinosTable'
import { arriendosVigentes, estadoParaMostrar } from '@/lib/api/inquilinos.service'

function arriendo(p: Partial<ArriendoDeInquilino> = {}): ArriendoDeInquilino {
  return {
    leaseId: null,
    contractId: p.contractId ?? 'c1',
    estado: 'ACTIVE',
    desde: '2025-09-04',
    hasta: '2026-09-04',
    canonCop: 3_750_000,
    inmueble: { id: 'i1', title: 'Apto', address: 'Carrera 30a #25A-20', city: 'Bogotá' },
    ...p,
  }
}
function persona(p: Partial<Inquilino> = {}): Inquilino {
  return {
    tenantId: 't1',
    nombre: 'Esteban López Quintero',
    email: 'esteban@correo.co',
    telefono: '3010082450',
    documento: '1020304050',
    arriendos: [arriendo()],
    ...p,
  }
}

let container: HTMLDivElement | undefined
let root: Root | undefined
beforeEach(() => {
  pantalla.celular = false
})
afterEach(() => {
  const r = root
  if (r) act(() => r.unmount())
  container?.remove()
  root = undefined
  container = undefined
})
function montar(nodo: React.ReactElement) {
  const c = document.createElement('div')
  document.body.appendChild(c)
  const r = createRoot(c)
  container = c
  root = r
  act(() => {
    r.render(nodo)
  })
}

const SIN_ARRIENDO = persona({ tenantId: 't2', nombre: 'Sofía Sin Arriendo', arriendos: [] })

describe('E-19 · «Crear su contrato» con el permiso', () => {
  it('sin `contratos:create`, ni en la tabla ni en las tarjetas', () => {
    permisos.valor = { canAccess: (m: string, a: string) => !(m === 'contratos' && a === 'create') }
    montar(<InquilinosTable inquilinos={[SIN_ARRIENDO]} onAbrir={() => {}} />)
    expect(container!.querySelector('[data-testid="inquilino-crear-contrato"]')).toBeNull()
    act(() => root!.unmount()); root = undefined; container?.remove()
    pantalla.celular = true
    montar(<InquilinosTable inquilinos={[SIN_ARRIENDO]} onAbrir={() => {}} />)
    expect(container!.querySelector('[data-testid="inquilino-crear-contrato"]')).toBeNull()
    permisos.valor = null
  })

  it('con el permiso, sí', () => {
    permisos.valor = { canAccess: () => true }
    montar(<InquilinosTable inquilinos={[SIN_ARRIENDO]} onAbrir={() => {}} />)
    expect(container!.querySelector('[data-testid="inquilino-crear-contrato"]')).not.toBeNull()
    permisos.valor = null
  })
})
