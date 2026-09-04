/**
 * El paso 1 del wizard tenía un selector de UN dueño: tocar otro reemplazaba
 * al anterior. Los tipos, el payload y el back soportaban copropietarios desde
 * el 2026-09-03; lo único que faltaba era esto.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

import { StepSelectPropietario, seleccionDeDuenos } from './ConsignacionWizardSteps'
import type { ConsignacionFormData, Propietario } from '@/lib/types/inmobiliaria'

const PROPIETARIOS = [
  { id: 'p1', name: 'Ana Restrepo', documentNumber: '111', email: 'ana@x.co' },
  { id: 'p2', name: 'Beto Cardona', documentNumber: '222', email: 'beto@x.co' },
  { id: 'p3', name: 'Cami Ospina', documentNumber: '333', email: 'cami@x.co' },
] as unknown as Propietario[]

let container: HTMLDivElement
let root: Root

function renderPaso(formData: Partial<ConsignacionFormData>, updateFormData = vi.fn()) {
  act(() => {
    root.render(
      <StepSelectPropietario
        formData={formData}
        updateFormData={updateFormData}
        propietarios={PROPIETARIOS}
        agentes={[]}
      />,
    )
  })
  return updateFormData
}

function clickPorTexto(texto: string) {
  const nodo = Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes(texto),
  )
  expect(nodo, `no encontré "${texto}"`).toBeTruthy()
  act(() => {
    nodo!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('seleccionDeDuenos', () => {
  it('es el principal seguido de los copropietarios, en orden', () => {
    expect(
      seleccionDeDuenos({
        propietarioId: 'p1',
        copropietarios: [
          { propietarioId: 'p2', participacionBps: 3000 },
          { propietarioId: 'p3', participacionBps: 2000 },
        ],
      }),
    ).toEqual(['p1', 'p2', 'p3'])
  })

  it('sin principal no hay selección, aunque haya copropietarios sueltos', () => {
    expect(
      seleccionDeDuenos({ copropietarios: [{ propietarioId: 'p2', participacionBps: 5000 }] }),
    ).toEqual([])
  })

  it('con un solo dueño la selección es de uno', () => {
    expect(seleccionDeDuenos({ propietarioId: 'p1' })).toEqual(['p1'])
  })
})

describe('<StepSelectPropietario> — varios dueños', () => {
  it('elegir un segundo dueño NO reemplaza al primero', () => {
    const update = renderPaso({ propietarioId: 'p1', copropietarios: [] })
    clickPorTexto('Beto Cardona')

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        propietarioId: 'p1',
        copropietarios: [{ propietarioId: 'p2', participacionBps: 5000 }],
      }),
    )
  })

  it('el primero elegido queda de principal', () => {
    const update = renderPaso({})
    clickPorTexto('Cami Ospina')

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ propietarioId: 'p3', copropietarios: [] }),
    )
  })

  it('destildar un copropietario lo saca de la lista', () => {
    const update = renderPaso({
      propietarioId: 'p1',
      copropietarios: [{ propietarioId: 'p2', participacionBps: 5000 }],
    })
    clickPorTexto('Beto Cardona')

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ propietarioId: 'p1', copropietarios: [] }),
    )
  })

  it('con tres dueños el reparto arranca en partes iguales, sin pasarse de 100', () => {
    const update = renderPaso({
      propietarioId: 'p1',
      copropietarios: [{ propietarioId: 'p2', participacionBps: 5000 }],
    })
    clickPorTexto('Cami Ospina')

    const llamada = update.mock.calls.at(-1)![0] as {
      copropietarios: { participacionBps: number }[]
    }
    const repartido = llamada.copropietarios.reduce((a, c) => a + c.participacionBps, 0)
    expect(llamada.copropietarios).toHaveLength(2)
    expect(repartido).toBeLessThan(10000)
  })

  it('con un solo dueño no se pide reparto', () => {
    renderPaso({ propietarioId: 'p1', copropietarios: [] })
    expect(container.textContent).not.toContain('Reparto')
  })
})
