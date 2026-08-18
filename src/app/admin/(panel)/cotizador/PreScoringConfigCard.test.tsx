/**
 * PreScoringConfigCard tests — la sección de TTL de pre-scoring en
 * /admin/cotizador. Protege las reglas de la experiencia, no el markup:
 *  · precarga los valores del GET
 *  · un valor fuera de 1..720 bloquea "Guardar"
 *  · "Guardar" hace PATCH solo con los campos que cambiaron y confirma
 *  · un fallo del back (502/500) se muestra legible, sin romper la pantalla
 *
 * Strategy: createRoot + act (repo convention) — mismo patrón que CarrierForm.
 * El módulo `cotizador` está mockeado: se testea el comportamiento del card,
 * no el wiring de adminApi (cubierto en cotizador.test.ts).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

const { getMock, updateMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  updateMock: vi.fn(),
}))

vi.mock('@/lib/admin/cotizador', () => ({
  getPreScoringConfig: (...args: unknown[]) => getMock(...args),
  updatePreScoringConfig: (...args: unknown[]) => updateMock(...args),
}))

// ApiError real (el card la usa con instanceof para leer body.error).
vi.mock('@/lib/admin/api', () => ({
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      msg: string,
      public body?: unknown,
    ) {
      super(msg)
      this.name = 'ApiError'
    }
  },
}))

import { PreScoringConfigCard } from './PreScoringConfigCard'
import { ApiError } from '@/lib/admin/api'

let container: HTMLDivElement
let root: Root

function typeInto(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(el, value)
  act(() => {
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function byId(id: string): HTMLInputElement {
  const el = container.querySelector(`#${id}`)
  if (!el) throw new Error(`#${id} not found`)
  return el as HTMLInputElement
}

function saveButton(): HTMLButtonElement {
  return Array.from(container.querySelectorAll('button')).find(
    (b) => b.textContent?.includes('Guardar'),
  ) as HTMLButtonElement
}

async function mount() {
  await act(async () => {
    root.render(<PreScoringConfigCard />)
    await Promise.resolve()
  })
  // Un tick extra para que el effect que hidrata desde el GET corra.
  await act(async () => {
    await Promise.resolve()
  })
}

beforeEach(() => {
  getMock.mockReset()
  updateMock.mockReset()
  getMock.mockResolvedValue({ authorizationWaitHours: 48, resultReuseTtlHours: 48 })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('PreScoringConfigCard', () => {
  it('precarga los valores del GET', async () => {
    getMock.mockResolvedValue({ authorizationWaitHours: 72, resultReuseTtlHours: 24 })
    await mount()

    expect(byId('prescoring-reuse-ttl').getAttribute('value')).toBe('24')
    expect(byId('prescoring-authorization-wait').getAttribute('value')).toBe('72')
    // Sin cambios: guardar arranca deshabilitado.
    expect(saveButton().disabled).toBe(true)
  })

  it('un valor fuera de rango bloquea el guardado con mensaje claro', async () => {
    await mount()

    typeInto(byId('prescoring-reuse-ttl'), '999')

    expect(saveButton().disabled).toBe(true)
    expect(container.textContent).toContain('Entero entre 1 y 720')
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('guardar hace PATCH solo con lo cambiado y confirma', async () => {
    await mount()
    updateMock.mockResolvedValue({ authorizationWaitHours: 48, resultReuseTtlHours: 24 })

    // Solo cambia la validez del estudio; la espera de autorización queda igual.
    typeInto(byId('prescoring-reuse-ttl'), '24')
    expect(saveButton().disabled).toBe(false)

    await act(async () => {
      saveButton().click()
      await Promise.resolve()
    })

    expect(updateMock).toHaveBeenCalledTimes(1)
    expect(updateMock).toHaveBeenCalledWith({ resultReuseTtlHours: 24 })
    expect(container.textContent).toContain('Configuración guardada.')
    // Ya persistido: sin cambios pendientes, vuelve a deshabilitarse.
    expect(saveButton().disabled).toBe(true)
  })

  it('muestra la equivalencia en días como ayuda', async () => {
    getMock.mockResolvedValue({ authorizationWaitHours: 72, resultReuseTtlHours: 48 })
    await mount()
    expect(container.textContent).toContain('72 h ≈ 3 días')
    expect(container.textContent).toContain('48 h ≈ 2 días')
  })

  it('un fallo de carga (502) se muestra legible, sin romper la pantalla', async () => {
    getMock.mockRejectedValue(new ApiError(502, 'Micro de agentes inalcanzable'))
    await mount()

    expect(container.textContent).toContain('Micro de agentes inalcanzable')
    // No renderiza los inputs cuando no pudo cargar.
    expect(container.querySelector('#prescoring-reuse-ttl')).toBeNull()
  })

  it('un fallo al guardar muestra el error del back y no confirma', async () => {
    await mount()
    // adminApi ya extrae `message` del envelope y lo pone en err.message.
    updateMock.mockRejectedValue(
      new ApiError(400, 'resultReuseTtlHours must not be greater than 720'),
    )

    typeInto(byId('prescoring-reuse-ttl'), '10')
    await act(async () => {
      saveButton().click()
      await Promise.resolve()
    })

    expect(container.textContent).toContain('must not be greater than 720')
    expect(container.textContent).not.toContain('Configuración guardada.')
  })
})
