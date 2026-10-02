/**
 * La cola humana: una acción que no sale (tanda 2 de errores, 02-10-2026).
 *
 * Antes el toast decía «No se pudo: 403» o el código del micro, y lo que el
 * micro decía del motivo (un 400 con `campos`) nunca llegaba al campo. Lo que
 * se fija:
 *
 *  · un 400 con `campos` sobre el motivo va debajo del motivo, con el foco,
 *    sin toast (y lo escrito se queda);
 *  · un 5xx dice «de nuestro lado» con la referencia;
 *  · un pedido que ni salió (status 0) habla de la conexión;
 *  · un 4xx dice el `message` del micro, nunca el código.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { toasts } = vi.hoisted(() => ({ toasts: { ok: [] as string[], error: [] as string[] } }))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('sonner', () => ({
  toast: {
    success: (m: string) => toasts.ok.push(m),
    error: (m: string) => toasts.error.push(m),
  },
}))

import { ColaHumana } from './ColaHumana'
import { falloDelMicro } from '@/lib/api/fallo-del-micro'
import type { WorkItem, WorkItemAction } from '@/lib/api/work-item'

const CONFIRMAR: WorkItemAction = {
  id: 'confirm',
  label: 'Confirmar match',
  kind: 'primary',
  method: 'POST',
  path: '/api/agency/a/conciliacion/queue/m-1/confirm',
}
const RECHAZAR: WorkItemAction = {
  id: 'reject',
  label: 'Rechazar',
  kind: 'danger',
  method: 'POST',
  path: '/api/agency/a/conciliacion/queue/m-1/reject',
  requiresReason: true,
}

const ITEM: WorkItem = {
  id: 'm-1',
  agente: 'conciliacion',
  tipo: 'match',
  estado: 'sugerido',
  flags: ['necesita_humano'],
  ownerRole: 'contador',
  severidad: 'media',
  titulo: 'Transferencia de $1.250.000',
  accionSugerida: { label: 'Conciliar con el recaudo de octubre', razon: 'Monto y fecha coinciden.' },
  actions: [CONFIRMAR, RECHAZAR],
  subject: { kind: 'reconciliation_match', id: 'm-1' },
  createdAt: '2026-10-01T10:00:00.000-05:00',
  source: { endpoint: '/conciliacion/queue', entity: 'match' },
}

let container: HTMLDivElement
let root: Root
let onAction: ReturnType<typeof vi.fn>

beforeEach(() => {
  toasts.ok = []
  toasts.error = []
  onAction = vi.fn().mockResolvedValue({ ok: true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function render() {
  act(() => {
    root.render(
      <ColaHumana
        items={[ITEM]}
        agente="conciliacion"
        onAction={onAction as unknown as React.ComponentProps<typeof ColaHumana>['onAction']}
      />,
    )
  })
}

function boton(re: RegExp): HTMLButtonElement {
  const b = Array.from(container.querySelectorAll('button')).find((x) => re.test(x.textContent ?? ''))
  if (!b) throw new Error(`No hay botón ${re}`)
  return b as HTMLButtonElement
}

async function rechazarCon(motivo: string) {
  act(() => boton(/^Rechazar$/).click())
  const area = container.querySelector('#reason-m-1') as HTMLTextAreaElement
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  act(() => {
    setter.call(area, motivo)
    area.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => boton(/confirmar$/i).click())
  return area
}

describe('ColaHumana — una acción que no sale', () => {
  it('🔴 un 400 con `campos` sobre el motivo va debajo del motivo, con el foco y sin toast', async () => {
    onAction.mockResolvedValue({
      ok: false,
      error: '400',
      fallo: await falloDelMicro({
        status: 400,
        json: async () => ({
          statusCode: 400,
          code: 'DATOS_INVALIDOS',
          message: ['Escribe el motivo del rechazo.'],
          campos: [{ campo: 'reason', regla: 'requerido', mensaje: 'Escribe el motivo del rechazo.' }],
        }),
      }),
    })
    render()
    const area = await rechazarCon('   no   ')

    expect(onAction).toHaveBeenCalledWith(ITEM, RECHAZAR, { reason: 'no' })
    expect(container.querySelector('#reason-m-1-error')?.textContent).toContain('Escribe el motivo del rechazo.')
    expect(area.getAttribute('aria-invalid')).toBe('true')
    expect(area.getAttribute('aria-describedby')).toBe('reason-m-1-error')
    expect(document.activeElement).toBe(area)
    expect(toasts.error).toEqual([])
    // Lo escrito se queda: el panel del motivo sigue abierto.
    expect(area.value).toBe('   no   ')
  })

  it('al corregir el motivo, el error se va', async () => {
    onAction.mockResolvedValue({
      ok: false,
      fallo: await falloDelMicro({
        status: 400,
        json: async () => ({
          code: 'DATOS_INVALIDOS',
          campos: [{ campo: 'reason', regla: 'requerido', mensaje: 'Escribe el motivo del rechazo.' }],
        }),
      }),
    })
    render()
    const area = await rechazarCon('no')
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
    act(() => {
      setter.call(area, 'no es de este contrato')
      area.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(area.getAttribute('aria-invalid')).toBeNull()
  })

  it('un 5xx dice «de nuestro lado» con la referencia, nunca el status', async () => {
    onAction.mockResolvedValue({
      ok: false,
      error: '500',
      fallo: await falloDelMicro({ status: 500, json: async () => ({ error: 'boom', requestId: 'beef0042-aaaa' }) }),
    })
    render()
    await act(async () => boton(/Confirmar match/).click())
    expect(toasts.error).toHaveLength(1)
    expect(toasts.error[0]).toContain('No pudimos confirmar match: algo falló de nuestro lado')
    expect(toasts.error[0]).toContain('beef0042')
    expect(toasts.error[0]).not.toMatch(/conexi|500/i)
  })

  it('si el pedido ni salió (status 0) habla de la conexión', async () => {
    const red = new TypeError('Failed to fetch')
    onAction.mockResolvedValue({ ok: false, error: red.message, fallo: red })
    render()
    await act(async () => boton(/Confirmar match/).click())
    expect(toasts.error[0]).toMatch(/conexión/)
    expect(toasts.error[0]).not.toContain('Failed to fetch')
  })

  it('un 4xx dice el `message` del micro, nunca el código ni el status', async () => {
    onAction.mockResolvedValue({
      ok: false,
      error: 'MATCH_YA_DECIDIDO',
      fallo: await falloDelMicro({
        status: 409,
        json: async () => ({ code: 'MATCH_YA_DECIDIDO', message: 'Otra persona ya decidió este cruce.' }),
      }),
    })
    render()
    await act(async () => boton(/Confirmar match/).click())
    expect(toasts.error).toEqual(['Otra persona ya decidió este cruce.'])
  })
})
