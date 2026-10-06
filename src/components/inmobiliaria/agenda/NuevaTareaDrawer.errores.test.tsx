/**
 * 02-10-2026 · Crear una tarea: lo que el back rechaza va a SU campo, con el
 * foco; un 5xx dice «de nuestro lado» con la referencia; sin respuesta habla
 * de la conexión. Antes un mensaje de más de 160 caracteres se perdía entero y
 * el error salía en un `<p class="text-xs">` que aparecía de golpe.
 */
import React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { crearTarea, toastMock } = vi.hoisted(() => ({
  crearTarea: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/api/agenda.service', () => ({
  agendaApi: { crearTarea: (...a: unknown[]) => crearTarea(...a) },
}))
vi.mock('sonner', () => ({ toast: toastMock }))
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useConsignaciones: () => ({ consignaciones: [], isLoading: false, errorCrudo: null }),
  useAgentes: () => ({ agentes: [] }),
}))
vi.mock('@/components/ui/cajon', () => ({
  Cajon: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
  CajonCabecera: ({ titulo }: { titulo: string }) => React.createElement('h2', null, titulo),
  CajonCuerpo: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
  CajonPie: ({ children, ayuda }: { children?: React.ReactNode; ayuda?: React.ReactNode }) =>
    React.createElement('div', null, ayuda, children),
}))
vi.mock('@/components/ui/combobox', () => ({ Combobox: () => null }))
// El día se elige en un calendario de Cadence: acá basta un botón que lo pone.
vi.mock('@leasefy/cadence', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  DatePicker: ({ id, onChange }: { id?: string; onChange: (d: Date) => void }) =>
    React.createElement('button', { id, type: 'button', 'data-testid': 'elegir-dia', onClick: () => onChange(new Date(2026, 9, 15)) }, 'día'),
  TimePicker: () => null,
}))

import { ApiError } from '@/lib/api/client'
import { NuevaTareaDrawer } from './NuevaTareaDrawer'
import { MENSAJES_DE_LA_AGENDA } from '@/lib/agenda/limites-de-la-agenda'

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
  vi.clearAllMocks()
})

async function llenarYGuardar(fallo: unknown) {
  crearTarea.mockRejectedValue(fallo)
  await act(async () => {
    root.render(<NuevaTareaDrawer abierto onOpenChange={() => {}} onCreada={() => {}} />)
  })
  const titulo = container.querySelector<HTMLTextAreaElement>('#tarea-titulo')!
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(titulo, 'Recoger las llaves del 402')
    titulo.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => {
    container.querySelector<HTMLButtonElement>('[data-testid="elegir-dia"]')!.click()
  })
  await act(async () => {
    container.querySelector<HTMLButtonElement>('[data-testid="tarea-guardar"]')!.click()
  })
  await act(async () => {
    await Promise.resolve()
  })
}

describe('Nueva tarea — el error del servidor, donde corresponde', () => {
  it('🔴 un 400 con campos se pinta bajo SU campo y le da el foco; no hay toast', async () => {
    await llenarYGuardar(
      new ApiError(400, [MENSAJES_DE_LA_AGENDA.fechaFueraDeRango], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [MENSAJES_DE_LA_AGENDA.fechaFueraDeRango],
        campos: [{ campo: 'fecha', regla: 'fecha', mensaje: MENSAJES_DE_LA_AGENDA.fechaFueraDeRango }],
      }),
    )
    expect(container.querySelector('#tarea-fecha-error')?.textContent).toBe(
      MENSAJES_DE_LA_AGENDA.fechaFueraDeRango,
    )
    expect(document.activeElement).toBe(container.querySelector('#tarea-fecha'))
    expect(toastMock.error).not.toHaveBeenCalled()
  })

  it('un mensaje largo del back llega entero (antes se cortaba en 160)', async () => {
    const largo =
      'No puedes asignarle la tarea a esa persona porque ya no hace parte del equipo de la inmobiliaria; elige a alguien activo o deja la tarea sin responsable y asígnala después desde la agenda.'
    expect(largo.length).toBeGreaterThan(160)
    await llenarYGuardar(new ApiError(409, largo))
    expect(toastMock.error).toHaveBeenCalledWith('No se pudo crear la tarea', { description: largo })
  })

  it('🔴 un 5xx dice que falló de nuestro lado, con la referencia', async () => {
    await llenarYGuardar(
      new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor',
        referencia: 'ab12cd34',
      }),
    )
    const descripcion = toastMock.error.mock.calls[0]?.[1]?.description as string
    expect(descripcion).toContain('de nuestro lado')
    expect(descripcion).toContain('ab12cd34')
    expect(descripcion).not.toMatch(/conexi[oó]n/i)
  })

  it('🔴 sin respuesta (status 0) habla de la conexión', async () => {
    await llenarYGuardar(new ApiError(0, 'Failed to fetch'))
    const descripcion = toastMock.error.mock.calls[0]?.[1]?.description as string
    expect(descripcion).toMatch(/conexi[oó]n/i)
  })
})
