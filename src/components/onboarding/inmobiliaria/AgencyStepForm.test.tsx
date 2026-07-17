import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

import { AgencyStepForm } from './AgencyStepForm'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

function render(props: Partial<React.ComponentProps<typeof AgencyStepForm>> = {}) {
  const defaultProps: React.ComponentProps<typeof AgencyStepForm> = {
    isSubmitting: false,
    onSubmit: vi.fn().mockResolvedValue(null),
    submitError: null,
    ...props,
  }
  act(() => {
    root.render(<AgencyStepForm {...defaultProps} />)
  })
  return defaultProps
}

function byId(id: string): HTMLInputElement {
  const el = container.querySelector(`[id="${id}"]`)
  if (!el) throw new Error(`Element with id="${id}" not found`)
  return el as HTMLInputElement
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  act(() => {
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('<AgencyStepForm> — prefill', () => {
  it('renders with legalName/nit prefilled from the pre-step values', () => {
    render({ prefill: { legalName: 'Inmobiliaria Andes SAS', nit: '900123456-7' } })

    expect(byId('legalName').value).toBe('Inmobiliaria Andes SAS')
    expect(byId('nit').value).toBe('900123456-7')
  })

  it('renders with proposedAgencyName/contactEmail values from the resume draft', () => {
    render({
      prefill: { legalName: 'Inmobiliaria Andes SAS', primaryContactEmail: 'ana@andes.test' },
    })

    expect(byId('legalName').value).toBe('Inmobiliaria Andes SAS')
    expect(byId('primaryContactEmail').value).toBe('ana@andes.test')
  })

  it('leaves fields without a prefill source empty', () => {
    render({ prefill: { legalName: 'Inmobiliaria Andes SAS' } })

    expect(byId('nit').value).toBe('')
    expect(byId('primaryContactEmail').value).toBe('')
  })

  it('renders with no prefill values when the prop is omitted (no crash)', () => {
    render()

    expect(byId('legalName').value).toBe('')
    expect(byId('nit').value).toBe('')
  })

  it('prefilled inputs remain editable', () => {
    render({ prefill: { legalName: 'Inmobiliaria Andes SAS', nit: '900123456-7' } })

    setInputValue(byId('legalName'), 'Otro Nombre SAS')
    setInputValue(byId('nit'), '800999888-1')

    expect(byId('legalName').value).toBe('Otro Nombre SAS')
    expect(byId('nit').value).toBe('800999888-1')
  })
})
