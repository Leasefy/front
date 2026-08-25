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

async function clickSubmit() {
  const submitBtn = container.querySelector(
    '[data-testid="agency-step-form"] button[type="submit"]',
  ) as HTMLButtonElement
  await act(async () => {
    submitBtn.click()
    await new Promise((r) => setTimeout(r, 0))
  })
}

/**
 * Fills the free-text editable fields so a submit passes the schema. Departamento
 * and Municipio are searchable comboboxes (Radix Popover) that can't be operated
 * under happy-dom, so callers that need a passing submit seed them via
 * `prefill.address` instead (the Controller renders their initial value).
 */
function fillEditableFields() {
  setInputValue(byId('address.calle'), 'Calle 100 # 10-20')
  setInputValue(byId('primaryContactEmail'), 'ana@andes.test')
  setInputValue(byId('primaryContactPhone'), '3000000000')
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
})

describe('<AgencyStepForm> — razón social + NIT read-only', () => {
  it('renders legalName and nit as read-only when both come prefilled', () => {
    render({ prefill: { legalName: 'Inmobiliaria Andes SAS', nit: '900123456-7' } })

    expect(byId('legalName').readOnly).toBe(true)
    expect(byId('nit').readOnly).toBe(true)
  })

  it('keeps read-only legalName + nit in the submitted step payload', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null)
    render({
      prefill: {
        legalName: 'Inmobiliaria Andes SAS',
        nit: '900123456-7',
        // Departamento + Municipio are comboboxes (not operable under happy-dom),
        // so seed them here to let the submit pass the schema.
        address: { departamento: 'Cundinamarca', ciudad: 'Bogotá', calle: '', codigoPostal: '' },
      },
      onSubmit,
    })

    fillEditableFields()
    await clickSubmit()

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const body = onSubmit.mock.calls[0][0]
    expect(body.legalName).toBe('Inmobiliaria Andes SAS')
    expect(body.nit).toBe('900123456-7')
  })

  it('degrades legalName + nit to editable inputs when NOT prefilled (fallback)', () => {
    render()

    expect(byId('legalName').readOnly).toBe(false)
    expect(byId('nit').readOnly).toBe(false)

    setInputValue(byId('legalName'), 'Escrito a mano SAS')
    setInputValue(byId('nit'), '800999888-1')

    expect(byId('legalName').value).toBe('Escrito a mano SAS')
    expect(byId('nit').value).toBe('800999888-1')
  })

  it('keeps address/contact fields editable even when legalName + nit are confirmed', () => {
    render({ prefill: { legalName: 'Inmobiliaria Andes SAS', nit: '900123456-7' } })

    expect(byId('address.calle').readOnly).toBe(false)
    expect(byId('primaryContactEmail').readOnly).toBe(false)

    setInputValue(byId('address.calle'), 'Calle 100 # 10-20')
    expect(byId('address.calle').value).toBe('Calle 100 # 10-20')
  })
})

describe('<AgencyStepForm> — address fields', () => {
  it('labels the street field "Dirección" (not "Calle") and keeps it as an editable input', () => {
    render()

    expect(container.textContent).toContain('Dirección')
    expect(container.textContent).not.toContain('Calle')

    setInputValue(byId('address.calle'), 'Cra 7 # 71-21')
    expect(byId('address.calle').value).toBe('Cra 7 # 71-21')
  })

  it('renders "Departamento" and "Municipio" labels (not "Ciudad")', () => {
    render()

    expect(container.textContent).toContain('Departamento')
    expect(container.textContent).toContain('Municipio')
    expect(container.textContent).not.toContain('Ciudad')
  })

  it('renders departamento and municipio as combobox controls', () => {
    render()

    const comboboxes = container.querySelectorAll('[role="combobox"]')
    expect(comboboxes.length).toBe(2)
  })

  it('disables the municipio combobox until a departamento is chosen', () => {
    render()

    // Municipio is the second combobox; with no departamento selected it must
    // be disabled so a municipio can never be picked without its departamento.
    const comboboxes = container.querySelectorAll<HTMLButtonElement>('[role="combobox"]')
    const municipio = comboboxes[1]
    expect(municipio.disabled).toBe(true)
  })

  it('enables the municipio combobox when a departamento is prefilled', () => {
    render({ prefill: { address: { departamento: 'Antioquia', calle: '', ciudad: '', codigoPostal: '' } } })

    const comboboxes = container.querySelectorAll<HTMLButtonElement>('[role="combobox"]')
    const municipio = comboboxes[1]
    expect(municipio.disabled).toBe(false)
  })
})
