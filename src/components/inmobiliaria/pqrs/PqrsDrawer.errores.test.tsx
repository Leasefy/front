/**
 * 02-10-2026 · Mover o reasignar una PQRS que el back rechaza: el motivo se
 * dice entero (antes uno de más de 160 caracteres se perdía), un 5xx dice que
 * falló de nuestro lado con su referencia y «conexión» sólo sin respuesta.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { actualizar, toastMock } = vi.hoisted(() => ({
  actualizar: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k, formatDate: () => '1 sept 2026' }),
}))
vi.mock('@/lib/hooks/useInmobiliaria', () => ({ useAgentes: () => ({ agentes: [] }) }))
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }))
vi.mock('@/lib/api/pqrs-agencia.service', () => ({
  pqrsApi: {
    actualizar: (...a: unknown[]) => actualizar(...a),
    // PQRS-FIX (04-10): el cajón pide el detalle y los responsables al abrir.
    detalle: () => Promise.reject(new Error('sin detalle en la prueba')),
    responsables: () => Promise.resolve([]),
  },
}))
// El selector de estados como un <select>: lo que importa es qué hace al elegir.
vi.mock('@/components/ui/combobox', () => ({
  Combobox: ({
    options,
    onChange,
    ...resto
  }: {
    options: { value: string; label: string }[]
    onChange: (v: string | undefined) => void
    'data-testid'?: string
  }) =>
    React.createElement(
      'select',
      { 'data-testid': resto['data-testid'], onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value) },
      [React.createElement('option', { key: '', value: '' }, '—')].concat(
        options.map((o) => React.createElement('option', { key: o.value, value: o.value }, o.label)),
      ),
    ),
}))

import { PqrsDrawer } from './PqrsDrawer'
import { ApiError } from '@/lib/api/client'
import type { Pqrs } from '@/lib/api/pqrs-agencia.types'

const SOLICITUD = {
  id: 'q-1',
  numero: 7,
  radicado: 'PQRS-0007',
  tipo: 'QUEJA',
  solicitanteTipo: 'INQUILINO',
  solicitanteNombre: 'Camila Restrepo',
  solicitanteContacto: null,
  asunto: 'Gotera en el baño principal',
  descripcion: null,
  consignacionId: null,
  inmuebleLabel: null,
  // Con responsable: sin él no se ofrece mover (el back lo rechazaría).
  asignadoAUserId: 'u-1',
  asignadoANombre: 'Víctor Ortiz',
  estado: 'RECIBIDA',
  slaVenceAt: '2026-09-25T12:00:00.000Z',
  resueltaAt: null,
  cerradaAt: null,
  createdAt: '2026-09-01T12:00:00.000Z',
  updatedAt: '2026-09-01T12:00:00.000Z',
} as unknown as Pqrs

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

async function moverCon(fallo: unknown) {
  actualizar.mockRejectedValue(fallo)
  act(() => {
    root.render(
      <PqrsDrawer pqrs={SOLICITUD} open onOpenChange={() => undefined} onActualizado={() => undefined} />,
    )
  })
  const mover = document.body.querySelector<HTMLSelectElement>('[data-testid="pqrs-mover"]')!
  const destino = mover.options[1]!.value
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(mover, destino)
    mover.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await act(async () => {
    await Promise.resolve()
  })
  return toastMock.error.mock.calls[0]?.[1]?.description as string
}

describe('PqrsDrawer — el error de mover, por el traductor', () => {
  it('🔴 un motivo largo llega entero', async () => {
    const largo =
      'No se puede pasar a «Resuelta» sin una respuesta escrita: la Ley 1755 exige que quede la respuesta de fondo. Escríbela en la ficha y vuelve a moverla cuando esté enviada.'
    expect(largo.length).toBeGreaterThan(160)
    expect(await moverCon(new ApiError(409, largo))).toBe(largo)
  })

  it('🔴 un 5xx dice que falló de nuestro lado, con la referencia', async () => {
    const d = await moverCon(
      new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor',
        referencia: 'ab12cd34',
      }),
    )
    expect(d).toContain('de nuestro lado')
    expect(d).toContain('ab12cd34')
    expect(d).not.toMatch(/conexi[oó]n/i)
  })

  it('🔴 sin respuesta (status 0) habla de la conexión', async () => {
    expect(await moverCon(new ApiError(0, 'Failed to fetch'))).toMatch(/conexi[oó]n/i)
  })
})
