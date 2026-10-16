/**
 * @vitest-environment happy-dom
 *
 * PropuestasPorAprobar — #35: a quien aprueba, cuántas propuestas de Naira esperan SU decisión (pendientes que el
 * servidor dice que puede decidir), con el enlace a Aprobaciones. Sin permiso no pide nada; sin propuestas, con datos de
 * ejemplo o con la lectura caída, no pinta nada.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const red = vi.hoisted(() => ({ leer: vi.fn(), permisos: new Set<string>() }))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'AGY-1' } }) }))
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({ canAccess: (_m: string, accion: string) => red.permisos.has(accion) }),
}))
vi.mock('@/lib/api/naira/cliente', () => ({ leerPropuestas: red.leer }))

import { PropuestasPorAprobar } from './PropuestasPorAprobar'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

const accion = (estado: string, puedeDecidir: boolean) => ({ estado, puedeDecidir })

beforeEach(() => {
  red.leer.mockReset()
  red.permisos.clear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function montar(respuesta: unknown): Promise<void> {
  red.leer.mockResolvedValue(respuesta)
  await act(async () => {
    root.render(<PropuestasPorAprobar />)
  })
  await act(async () => {
    await Promise.resolve()
  })
}

const lista = (acciones: unknown[], origen = 'agente') => ({ kind: 'ok', origen, data: { generadoEn: '', desde: '', acciones, ocultasPorRol: 0 } })

describe('#35 — propuestas por aprobar arriba del briefing', () => {
  it('[POR-APROBAR-F:cuenta] cuenta solo las pendientes que la persona puede decidir y lleva a Aprobaciones', async () => {
    red.permisos.add('action-approve-internal')
    await montar(lista([accion('pendiente', true), accion('pendiente', true), accion('pendiente', false), accion('aprobada', true), accion('vencible', true)]))
    expect(red.leer).toHaveBeenCalledWith('AGY-1')
    expect(container.textContent).toContain('Tienes 2 propuestas de Naira por aprobar.')
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/panel/inmobiliaria/reportes/naira/aprobaciones')
  })

  it('[POR-APROBAR-F:una] una sola, en singular', async () => {
    red.permisos.add('action-approve-external')
    await montar(lista([accion('pendiente', true)]))
    expect(container.textContent).toContain('Tienes 1 propuesta de Naira por aprobar.')
  })

  it('[POR-APROBAR-F:nada] sin permiso no pide; sin pendientes, con datos de ejemplo o con la lectura caída, no pinta', async () => {
    await montar(lista([accion('pendiente', true)]))
    expect(red.leer).not.toHaveBeenCalled()
    expect(container.innerHTML).toBe('')
    red.permisos.add('action-approve-internal')
    for (const r of [lista([]), lista([accion('pendiente', true)], 'ejemplo'), { kind: 'no_disponible' }]) {
      await montar(r)
      expect(container.innerHTML, JSON.stringify(r)).toBe('')
    }
  })
})
