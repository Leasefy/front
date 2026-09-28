/**
 * OwnerNameStepForm.representante.test.tsx — quien se registra y el
 * representante legal son dos personas distintas.
 *
 * Antes se pedía un solo «Nombre completo» y el caso del contador que registra
 * la inmobiliaria de otro no tenía salida: si escribía el nombre del dueño, el
 * correo de quien se registraba quedaba atado a un nombre ajeno; si escribía el
 * suyo, la agencia no guardaba quién era el dueño.
 *
 * Patrón tomado de los demás tests del paso (createRoot + harness).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

// El paso monta «Salir del registro», que usa el router de Next.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/onboarding/inmobiliaria',
  useSearchParams: () => new URLSearchParams(),
}))

import { OwnerNameStepForm } from './OwnerNameStepForm'

void React // jsx-preserve

// Convención del repo: sin esto React avisa «not configured to support act(...)».
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
  vi.restoreAllMocks()
})

const byId = <T extends HTMLElement>(id: string) => container.querySelector(`#${id}`) as T | null

function escribir(id: string, valor: string) {
  const input = byId<HTMLInputElement>(id)
  if (!input) throw new Error(`no encontré #${id}`)
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(input, valor)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function tildeDeRepresentante() {
  return Array.from(container.querySelectorAll('input[type="checkbox"]')).find((el) =>
    el.closest('label')?.textContent?.includes('representante legal'),
  ) as HTMLInputElement
}

function render(onSubmit = vi.fn()) {
  act(() => {
    root.render(React.createElement(OwnerNameStepForm, { onSubmit, isSubmitting: false }))
  })
  return onSubmit
}

function enviar() {
  const form = container.querySelector('form')!
  act(() => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
}

describe('OwnerNameStepForm — representante legal', () => {
  it('por defecto asume que quien se registra ES el representante, y no pide el dato dos veces', () => {
    const onSubmit = render()

    expect(tildeDeRepresentante().checked).toBe(true)
    expect(byId('legalRepresentative')).toBeNull()

    escribir('ownerFullName', 'Roberto Gómez')
    escribir('agencyName', 'Inmobiliaria Andes SAS')
    escribir('agencyNit', '900123456')
    enviar()

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      firstName: 'Roberto',
      legalRepresentative: 'Roberto Gómez',
    })
  })

  it('al destildarlo aparecen los campos del dueño, separados de quien se registra', () => {
    const onSubmit = render()

    act(() => { tildeDeRepresentante().click() })
    expect(byId('legalRepresentative')).not.toBeNull()

    escribir('ownerFullName', 'Alex Ramírez')        // el contador que registra
    escribir('agencyName', 'Inmobiliaria Andes SAS')
    escribir('agencyNit', '900123456')
    escribir('legalRepresentative', 'Roberto Gómez') // el dueño
    escribir('legalDocumentNumber', '80123456')
    enviar()

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      firstName: 'Alex',
      lastName: 'Ramírez',
      legalRepresentative: 'Roberto Gómez',
      legalDocumentNumber: '80123456',
    })
  })

  it('sin tilde, el representante es obligatorio: no deja enviar vacío', () => {
    const onSubmit = render()

    act(() => { tildeDeRepresentante().click() })
    escribir('ownerFullName', 'Alex Ramírez')
    escribir('agencyName', 'Inmobiliaria Andes SAS')
    escribir('agencyNit', '900123456')
    enviar()

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('el documento del representante es opcional', () => {
    const onSubmit = render()

    act(() => { tildeDeRepresentante().click() })
    escribir('ownerFullName', 'Alex Ramírez')
    escribir('agencyName', 'Inmobiliaria Andes SAS')
    escribir('agencyNit', '900123456')
    escribir('legalRepresentative', 'Roberto Gómez')
    enviar()

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0].legalDocumentNumber).toBeUndefined()
  })

  it('volver a tildarlo descarta lo escrito y reasume a quien se registra', () => {
    const onSubmit = render()

    act(() => { tildeDeRepresentante().click() })
    escribir('legalRepresentative', 'Roberto Gómez')
    act(() => { tildeDeRepresentante().click() })

    escribir('ownerFullName', 'Alex Ramírez')
    escribir('agencyName', 'Inmobiliaria Andes SAS')
    escribir('agencyNit', '900123456')
    enviar()

    expect(onSubmit.mock.calls[0][0].legalRepresentative).toBe('Alex Ramírez')
  })
})
