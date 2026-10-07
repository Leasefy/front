/**
 * La cola humana con su movimiento (MOV-A2, movimiento ola 2, 03-10-2026), con
 * las animaciones DE VERDAD (`MotionGlobalConfig.skipAnimations = false`).
 *
 * Lo que fija:
 *  · el caso que se resuelve SALE de la cola con su animación (sigue en
 *    pantalla mientras se va, y después se quita); antes desaparecía de golpe;
 *  · la fila del motivo que despliega «Rechazar» entra y, al cancelar, sale
 *    (antes se montaba y se desmontaba en seco).
 */
import * as React from 'react'
import { act } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { MotionGlobalConfig } from 'framer-motion'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { ColaHumana } from './ColaHumana'
import type { WorkItem, WorkItemAction } from '@/lib/api/work-item'

const RECHAZAR: WorkItemAction = {
  id: 'reject',
  label: 'Rechazar',
  kind: 'danger',
  method: 'POST',
  path: '/api/agency/a/conciliacion/queue/m-1/reject',
  requiresReason: true,
}

const caso = (id: string): WorkItem => ({
  id,
  agente: 'conciliacion',
  tipo: 'match',
  estado: 'sugerido',
  flags: [],
  ownerRole: 'contador',
  severidad: 'media',
  titulo: `Caso ${id}`,
  accionSugerida: { label: 'Conciliar', razon: 'Monto y fecha coinciden.' },
  actions: [RECHAZAR],
  subject: { kind: 'reconciliation_match', id },
  createdAt: '2026-10-01T10:00:00.000-05:00',
  source: { endpoint: '/conciliacion/queue', entity: 'match' },
})

let host: HTMLDivElement
let root: Root
const onAction = vi.fn().mockResolvedValue({ ok: true })

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  MotionGlobalConfig.skipAnimations = false
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  MotionGlobalConfig.skipAnimations = true
})

const pintar = (items: WorkItem[]) =>
  act(() => {
    root.render(
      <ColaHumana
        items={items}
        agente="conciliacion"
        onAction={onAction as unknown as React.ComponentProps<typeof ColaHumana>['onAction']}
      />,
    )
  })
const esperar = (ms: number) =>
  act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })
const fila = (id: string) => host.querySelector<HTMLElement>(`[data-testid="work-item-${id}"]`)

describe('ColaHumana — movimiento', () => {
  it('el caso resuelto sale con su animación y después se quita', async () => {
    pintar([caso('a'), caso('b')])
    await esperar(700)
    expect(fila('a')).not.toBeNull()

    // El micro ya no lo trae: se resolvió.
    pintar([caso('b')])
    // Sigue en pantalla mientras sale…
    expect(fila('a')).not.toBeNull()
    // …y después se quita; el otro caso no se mueve de la cola.
    await esperar(600)
    expect(fila('a')).toBeNull()
    expect(fila('b')).not.toBeNull()
  })

  it('la fila del motivo entra al pedir «Rechazar» y sale al cancelar', async () => {
    pintar([caso('a')])
    await esperar(700)
    const rechazar = Array.from(host.querySelectorAll('button')).find((b) => b.textContent === 'Rechazar')!
    act(() => rechazar.click())
    const motivo = () => host.querySelector<HTMLElement>('[data-testid="work-item-motivo-a"]')
    expect(motivo()).not.toBeNull()
    expect(motivo()!.tagName).toBe('TR')

    const cancelar = Array.from(motivo()!.querySelectorAll('button')).find((b) =>
      /cancel/i.test(b.textContent ?? ''),
    )!
    act(() => cancelar.click())
    // Mientras sale sigue montada (con su contenido, no vacía)…
    expect(motivo()).not.toBeNull()
    expect(motivo()!.querySelector('textarea')).not.toBeNull()
    await esperar(600)
    expect(motivo()).toBeNull()
  })
})
