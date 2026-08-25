/**
 * CotizadorPage — admin CRUD screen for the cotizador carrier registry.
 *
 * Uses createRoot + act (repo convention, no RTL). Mocks `@/lib/admin/cotizador`
 * so the test drives list/create/update/delete without a backend.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { ApiError } from '@/lib/admin/api'
import type { CarrierRow } from '@/lib/admin/cotizador'

void React

const listCarriers = vi.fn()
const createCarrier = vi.fn()
const updateCarrier = vi.fn()
const deleteCarrier = vi.fn()
// La pantalla tambien monta <PreScoringConfigCard>, que carga su config del
// MISMO modulo con `useApiQuery`. Sin estas dos, el mock las dejaba en
// `undefined`: el efecto de la card explotaba con «getPreScoringConfig is not
// a function», el rechazo caia fuera del `act` del test y el `unmount` del
// afterEach se topaba con trabajo concurrente a medio hacer — «Should not
// already be working», los cinco tests en rojo por algo que no estaban
// probando.
const getPreScoringConfig = vi.fn()
const updatePreScoringConfig = vi.fn()

vi.mock('@/lib/admin/cotizador', () => ({
  listCarriers: (signal?: AbortSignal) => listCarriers(signal),
  createCarrier: (body: unknown) => createCarrier(body),
  updateCarrier: (name: string, body: unknown) => updateCarrier(name, body),
  deleteCarrier: (name: string) => deleteCarrier(name),
  getPreScoringConfig: (signal?: AbortSignal) => getPreScoringConfig(signal),
  updatePreScoringConfig: (body: unknown) => updatePreScoringConfig(body),
}))

import CotizadorPage from './page'

const FIANLY: CarrierRow = {
  id: 'c-1',
  name: 'fianly',
  displayName: 'Fianly',
  productType: 'fianza',
  route: 'direct',
  mode: 'rest',
  enabled: true,
  priority: 1,
  maxCanonCop: null,
  has_config: true,
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
}

const NEW_CARRIER: CarrierRow = {
  id: 'c-2',
  name: 'sura',
  displayName: null,
  productType: 'seguro',
  route: 'direct',
  mode: 'stub',
  enabled: false,
  priority: null,
  maxCanonCop: null,
  has_config: false,
  createdAt: '2026-08-05T00:00:00Z',
  updatedAt: '2026-08-05T00:00:00Z',
}

let container: HTMLDivElement
let root: Root

async function mount() {
  await act(async () => {
    root = createRoot(container)
    root.render(React.createElement(CotizadorPage))
  })
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  listCarriers.mockReset()
  createCarrier.mockReset()
  updateCarrier.mockReset()
  deleteCarrier.mockReset()
  getPreScoringConfig.mockReset()
  getPreScoringConfig.mockResolvedValue({
    authorizationWaitHours: 48,
    resultReuseTtlHours: 48,
  })
  updatePreScoringConfig.mockReset()
  window.confirm = vi.fn().mockReturnValue(true)
})

afterEach(() => {
  vi.restoreAllMocks()
  act(() => root?.unmount())
  container.remove()
})

function editButton(name: string): HTMLButtonElement {
  const row = Array.from(container.querySelectorAll('tr')).find((tr) =>
    tr.textContent?.includes(name),
  )
  const btn = Array.from(row?.querySelectorAll('button') ?? []).find((b) =>
    b.textContent?.includes('Editar'),
  )
  if (!btn) throw new Error(`Editar button for ${name} not found`)
  return btn as HTMLButtonElement
}

function deleteButton(name: string): HTMLButtonElement {
  const row = Array.from(container.querySelectorAll('tr')).find((tr) =>
    tr.textContent?.includes(name),
  )
  const btn = Array.from(row?.querySelectorAll('button') ?? []).find((b) =>
    b.textContent?.includes('Eliminar'),
  )
  if (!btn) throw new Error(`Eliminar button for ${name} not found`)
  return btn as HTMLButtonElement
}

function submitButton(): HTMLButtonElement {
  return Array.from(container.querySelectorAll('button')).find(
    (b) => b.type === 'submit',
  ) as HTMLButtonElement
}

describe('CotizadorPage', () => {
  it('lists carriers with mode/enabled/credenciales pills', async () => {
    listCarriers.mockResolvedValue([FIANLY, NEW_CARRIER])

    await mount()

    expect(container.textContent).toContain('fianly')
    expect(container.textContent).toContain('sura')
    expect(container.textContent).toContain('configurado ✓')
    expect(container.textContent).toContain('sin credenciales')
  })

  it('opens the create form and creates a carrier', async () => {
    listCarriers.mockResolvedValue([])
    createCarrier.mockResolvedValue(FIANLY)

    await mount()

    const newBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Nuevo carrier'),
    ) as HTMLButtonElement
    await act(async () => newBtn.click())

    await act(async () => {
      submitButton().click()
    })

    expect(createCarrier).toHaveBeenCalledTimes(1)
    const body = createCarrier.mock.calls[0][0]
    expect(body.name).toBe('fianly')
    expect(body.route).toBe('direct')
    expect(listCarriers).toHaveBeenCalledTimes(2) // initial + refetch after save
  })

  it('opens the edit form prefilled and updates the carrier without touching credentials', async () => {
    listCarriers.mockResolvedValue([FIANLY])
    updateCarrier.mockResolvedValue(FIANLY)

    await mount()

    await act(async () => editButton('fianly').click())

    const nameInput = container.querySelector('#carrier-name') as HTMLInputElement
    expect(nameInput.disabled).toBe(true)
    expect(container.textContent).toContain('configurado ✓')

    await act(async () => {
      submitButton().click()
    })

    expect(updateCarrier).toHaveBeenCalledTimes(1)
    expect(updateCarrier.mock.calls[0][0]).toBe('fianly')
    const body = updateCarrier.mock.calls[0][1]
    expect(body.config).toBeUndefined()
  })

  it('sends the full config block when the admin fills all three credential fields', async () => {
    listCarriers.mockResolvedValue([FIANLY])
    updateCarrier.mockResolvedValue(FIANLY)

    await mount()

    await act(async () => editButton('fianly').click())

    function typeInto(el: HTMLInputElement, value: string) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setter?.call(el, value)
      act(() => {
        el.dispatchEvent(new Event('input', { bubbles: true }))
      })
    }

    typeInto(container.querySelector('#carrier-config_base_url') as HTMLInputElement, 'https://fianly.example')
    typeInto(container.querySelector('#carrier-config_username') as HTMLInputElement, 'leasify')
    typeInto(container.querySelector('#carrier-config_password') as HTMLInputElement, 'secret123')

    await act(async () => {
      submitButton().click()
    })

    expect(updateCarrier).toHaveBeenCalledTimes(1)
    const body = updateCarrier.mock.calls[0][1]
    expect(body.config).toEqual({
      base_url: 'https://fianly.example',
      username: 'leasify',
      password: 'secret123',
    })
  })

  it('deletes a carrier after confirm and surfaces the micro error otherwise', async () => {
    listCarriers.mockResolvedValue([FIANLY])
    deleteCarrier.mockRejectedValueOnce(
      new ApiError(400, 'Error 400', { success: false, error: 'no se puede eliminar' }),
    )

    await mount()

    await act(async () => {
      deleteButton('fianly').click()
    })

    expect(deleteCarrier).toHaveBeenCalledWith('fianly')
    expect(container.textContent).toContain('no se puede eliminar')
  })
})
