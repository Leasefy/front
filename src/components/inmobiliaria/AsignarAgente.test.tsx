/**
 * AsignarAgente — el motivo cuando asignar falla (sistema de errores, 02-10-2026).
 *
 * Antes el toast llevaba `err.message` crudo: un 500 decía «Error interno del
 * servidor.» y sin red, «Failed to fetch». Ahora pasa por el traductor.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { ApiError } from '@/lib/api/client'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { toastMock, assignAgent } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
  assignAgent: vi.fn(),
}))

vi.mock('@/components/ui/toast', () => ({ toast: toastMock }))
vi.mock('@/lib/api/inmobiliaria.service', () => ({ consignacionesApi: { assignAgent } }))
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useAgentes: () => ({
    agentes: [{ id: 'm1', userId: 'u1', name: 'Ana Agente', role: 'agent', status: 'active' }],
    isLoading: false,
    errorCrudo: null,
    refetch: vi.fn(),
  }),
}))

import { AsignarAgente } from './AsignarAgente'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  Object.values(toastMock).forEach((m) => m.mockReset())
  assignAgent.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function asignar() {
  act(() => {
    root.render(<AsignarAgente abierto onCerrar={vi.fn()} consignacionId="c1" onAsignado={vi.fn()} />)
  })
  const boton = Array.from(document.body.querySelectorAll('button')).find((b) =>
    b.textContent?.includes('Ana Agente'),
  ) as HTMLButtonElement
  await act(async () => {
    boton.click()
    await Promise.resolve()
  })
}

describe('AsignarAgente — cuando asignar falla', () => {
  it('🔴 un 5xx dice «de nuestro lado» con la referencia, no el texto crudo', async () => {
    assignAgent.mockRejectedValueOnce(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', { referencia: 'ab12cd34' }),
    )
    await asignar()
    const [titulo, opciones] = toastMock.error.mock.calls[0]
    expect(titulo).toBe('No pudimos asignar el agente')
    expect(opciones.description).toMatch(/^No pudimos asignar el agente: algo falló de nuestro lado/)
    expect(opciones.description).toContain('ab12cd34')
  })

  it('un 4xx dice lo que mandó el back', async () => {
    assignAgent.mockRejectedValueOnce(new ApiError(409, 'La consignación está terminada.'))
    await asignar()
    expect(toastMock.error.mock.calls[0][1].description).toBe('La consignación está terminada.')
  })

  it('sin respuesta: la conexión', async () => {
    assignAgent.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await asignar()
    expect(toastMock.error.mock.calls[0][1].description).toMatch(/conexión/)
  })
})
