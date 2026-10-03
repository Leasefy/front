/**
 * 🔴 El acta de DEVOLUCIÓN ofrece también los inmuebles que ya no están
 * arrendados (PRUEBAS-PAGOS, 03-10-2026, hallado en el laboratorio): la
 * devolución se levanta cuando el inquilino entrega, casi siempre con el
 * arriendo ya terminado; con sólo los arrendados, un contrato terminado no tenía
 * acta de devolución posible y su cuota de cierre nunca nacía.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es', formatCurrency: (n: number) => `$${n}` }),
}))
// El paso 1 de mentiras: dice qué inmuebles recibió y deja cambiar el tipo.
vi.mock('./ActaEntregaSteps', () => ({
  StepBasicInfo: ({
    consignaciones,
    updateFormData,
  }: {
    consignaciones: Array<{ id: string }>
    updateFormData: (d: { type: string }) => void
  }) => (
    <div>
      <p data-testid="ofrecidos">{consignaciones.map((c) => c.id).join(',')}</p>
      <button type="button" onClick={() => updateFormData({ type: 'devolucion' })}>
        devolución
      </button>
      <button type="button" onClick={() => updateFormData({ type: 'entrega' })}>
        entrega
      </button>
    </div>
  ),
  StepRoomSelection: () => null,
  StepInventory: () => null,
  StepMetersKeys: () => null,
  StepObservations: () => null,
  StepSignatures: () => null,
}))

import { ActaEntregaForm } from './ActaEntregaForm'
import type { Consignacion } from '@/lib/types/inmobiliaria'

const ARRENDADO = { id: 'c-arrendado', availability: 'rented' } as unknown as Consignacion
const TERMINADO = { id: 'c-terminado', availability: 'available' } as unknown as Consignacion

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
})

const ofrecidos = () => container.querySelector('[data-testid="ofrecidos"]')!.textContent
const boton = (texto: string) =>
  Array.from(container.querySelectorAll('button')).find((b) => b.textContent === texto)!

describe('ActaEntregaForm — qué inmuebles se ofrecen', () => {
  it('entrega: sólo los arrendados; devolución: también el que ya terminó', async () => {
    await act(async () => {
      root.render(
        <ActaEntregaForm
          consignaciones={[ARRENDADO]}
          consignacionesDeDevolucion={[ARRENDADO, TERMINADO]}
          onSave={vi.fn()}
        />,
      )
    })
    expect(ofrecidos()).toBe('c-arrendado')
    await act(async () => boton('devolución').click())
    expect(ofrecidos()).toBe('c-arrendado,c-terminado')
    await act(async () => boton('entrega').click())
    expect(ofrecidos()).toBe('c-arrendado')
  })

  it('sin la lista de devolución, la de siempre', async () => {
    await act(async () => {
      root.render(<ActaEntregaForm consignaciones={[ARRENDADO]} onSave={vi.fn()} />)
    })
    await act(async () => boton('devolución').click())
    expect(ofrecidos()).toBe('c-arrendado')
  })
})
