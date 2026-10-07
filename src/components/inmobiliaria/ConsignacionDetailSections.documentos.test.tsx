/**
 * DocumentsSection — el motivo cuando subir el contrato de consignación falla
 * (sistema de errores, 02-10-2026).
 *
 * Antes la descripción se mostraba sólo si el mensaje del back tenía menos de
 * 160 caracteres: un 400 con varios motivos se perdía entero, y un 5xx o la red
 * no decían nada. Ahora pasa por el traductor.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { ApiError } from '@/lib/api/client'
import type { Consignacion } from '@/lib/types/inmobiliaria'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { toastMock, subirContrato } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
  subirContrato: vi.fn(),
}))

vi.mock('@/components/ui/toast', () => ({ toast: toastMock }))
vi.mock('@/lib/api/inmobiliaria.service', () => ({ consignacionesApi: { subirContrato } }))
vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k, locale: 'es' }) }))
vi.mock('./ContratoPdfModal', () => ({ ContratoPdfModal: () => null }))

import { DocumentsSection } from './ConsignacionDetailSections'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  Object.values(toastMock).forEach((m) => m.mockReset())
  subirContrato.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function subir(error: unknown) {
  subirContrato.mockRejectedValueOnce(error)
  act(() => {
    root.render(
      <DocumentsSection
        consignacion={{ id: 'c1', consignmentContractUrl: null, photosUrls: [], inventoryItems: [] } as unknown as Consignacion}
      />,
    )
  })
  const input = container.querySelector<HTMLInputElement>('[data-testid="documento-contrato-input"]')!
  Object.defineProperty(input, 'files', {
    value: [new File(['%PDF'], 'contrato.pdf', { type: 'application/pdf' })],
    configurable: true,
  })
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
    await Promise.resolve()
  })
  return toastMock.error.mock.calls[0][1].description as string
}

describe('DocumentsSection — subir el contrato de consignación', () => {
  it('🔴 un motivo largo del back (varios renglones de un 400) ya no se tira', async () => {
    const motivos = [
      'El archivo no es un PDF válido: no se pudo leer la primera página del documento.',
      'El contrato de consignación debe traer la firma del propietario y la de la inmobiliaria.',
    ]
    const descripcion = await subir(new ApiError(400, motivos, 'CONTRATO_INVALIDO'))
    expect(descripcion).toContain(motivos[0])
    expect(descripcion).toContain(motivos[1])
  })

  it('un 5xx dice «de nuestro lado» con la referencia', async () => {
    const descripcion = await subir(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', { referencia: 'ab12cd34' }),
    )
    expect(descripcion).toMatch(/^No pudimos subir el contrato de consignación: algo falló de nuestro lado/)
    expect(descripcion).toContain('ab12cd34')
  })

  it('sin respuesta: la conexión', async () => {
    expect(await subir(new TypeError('Failed to fetch'))).toMatch(/conexión/)
  })
})
