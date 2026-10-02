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
    render({ prefill: { legalName: 'Inmobiliaria Andes SAS', nit: '900123456-8' } })

    expect(byId('legalName').value).toBe('Inmobiliaria Andes SAS')
    expect(byId('nit').value).toBe('900123456-8')
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

describe('<AgencyStepForm> — el correo y el teléfono son de la cuenta', () => {
  it('dice «de la cuenta» y para qué sirve el correo, no «contacto principal» (Nico 30-09)', () => {
    render()
    const etiquetas = [...container.querySelectorAll('label')].map((l) => l.textContent ?? '')
    expect(etiquetas.some((t) => t.includes('Correo de la cuenta'))).toBe(true)
    expect(etiquetas.some((t) => t.includes('Teléfono de la cuenta'))).toBe(true)
    expect(container.textContent).not.toContain('contacto principal')
    expect(container.textContent).toContain('Queda asociado a la cuenta de la inmobiliaria')
  })
})

describe('<AgencyStepForm> — razón social + NIT read-only', () => {
  it('renders legalName and nit as read-only when both come prefilled', () => {
    render({ prefill: { legalName: 'Inmobiliaria Andes SAS', nit: '900123456-8' } })

    expect(byId('legalName').readOnly).toBe(true)
    expect(byId('nit').readOnly).toBe(true)
  })

  it('keeps read-only legalName + nit in the submitted step payload', async () => {
    const onSubmit = vi.fn().mockResolvedValue(null)
    render({
      prefill: {
        legalName: 'Inmobiliaria Andes SAS',
        nit: '900123456-8',
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
    expect(body.nit).toBe('900123456-8')
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
    render({ prefill: { legalName: 'Inmobiliaria Andes SAS', nit: '900123456-8' } })

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

describe('<AgencyStepForm> — teléfono y borrador local (Nico, 30-09)', () => {
  it('🔴 el teléfono sólo acepta dígitos: las letras no entran al valor', () => {
    render()
    const tel = byId('primaryContactPhone')
    setInputValue(tel, '300abc123')
    expect(tel.value).not.toMatch(/[a-zA-Z]/)
    expect(tel.value.replace(/\D/g, '')).toBe('300123')
  })

  it('🔴 lo escrito y NO enviado vuelve al desmontar y volver a montar (devolverse de paso)', () => {
    sessionStorage.clear()
    render({ sessionId: 'ses-1' })
    setInputValue(byId('address.calle'), 'Calle 10 # 5-55')
    setInputValue(byId('primaryContactEmail'), 'ana@andes.test')

    act(() => {
      root.unmount()
    })
    root = createRoot(container)
    render({ sessionId: 'ses-1' })

    expect(byId('address.calle').value).toBe('Calle 10 # 5-55')
    expect(byId('primaryContactEmail').value).toBe('ana@andes.test')
  })

  it('al enviar con éxito, el borrador local del paso se borra', async () => {
    sessionStorage.clear()
    const onSubmit = vi.fn().mockResolvedValue({ ok: true })
    render({
      sessionId: 'ses-2',
      onSubmit,
      prefill: {
        legalName: 'Inmobiliaria Andes SAS',
        nit: '900123456-8',
        address: { departamento: 'Cundinamarca', ciudad: 'Bogotá', calle: '', codigoPostal: '' },
      },
    })
    fillEditableFields()
    expect(sessionStorage.getItem('leasefy-asistente:ses-2:agency')).not.toBeNull()

    await clickSubmit()

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem('leasefy-asistente:ses-2:agency')).toBeNull()
  })

  it('sin sessionId no guarda nada (los usos sueltos siguen igual)', () => {
    sessionStorage.clear()
    render()
    setInputValue(byId('address.calle'), 'Calle 1')
    expect(sessionStorage.length).toBe(0)
  })
})

describe('<AgencyStepForm> — dirección y código postal (QA 01-10)', () => {
  const PREFILL_DIRECCION = {
    legalName: 'Inmobiliaria Andes SAS',
    nit: '900123456-8',
    address: { calle: '', ciudad: 'Medellín', departamento: 'Antioquia', codigoPostal: '' },
  }

  it('🔴 la dirección del reporte («!@#$%^&*()(*&^%$») no se envía: borde rojo y mensaje', async () => {
    const props = render({ prefill: PREFILL_DIRECCION })
    fillEditableFields()
    setInputValue(byId('address.calle'), '!@#$%^&*()(*&^%$')
    await clickSubmit()
    expect(props.onSubmit).not.toHaveBeenCalled()
    const calle = byId('address.calle')
    expect(calle.getAttribute('aria-invalid')).toBe('true')
    const error = container.querySelector('[id="address.calle-error"]')
    expect(error?.textContent).toMatch(/no van en una dirección/)
    expect(error?.textContent).toContain('Calle 10 # 43-20')
  })

  it('el código postal no deja escribir letras ni símbolos, y corta en seis sin maxLength', () => {
    render()
    const postal = byId('address.codigoPostal')
    expect(postal.getAttribute('inputmode')).toBe('numeric')
    expect(postal.hasAttribute('maxlength')).toBe(false)
    setInputValue(postal, '05a0-02 1 9')
    expect(postal.value).toBe('050021')
  })

  it('el código postal de otro departamento no se envía', async () => {
    const props = render({ prefill: PREFILL_DIRECCION })
    fillEditableFields()
    setInputValue(byId('address.codigoPostal'), '110111')
    await clickSubmit()
    expect(props.onSubmit).not.toHaveBeenCalled()
    expect(container.querySelector('[id="address.codigoPostal-error"]')?.textContent).toBe(
      'Ese código postal es de Bogotá D.C. Los de Antioquia empiezan por 05.',
    )
    expect(byId('address.codigoPostal').getAttribute('aria-invalid')).toBe('true')
  })

  it('una dirección real y su código postal se envían limpios', async () => {
    const props = render({ prefill: PREFILL_DIRECCION })
    fillEditableFields()
    setInputValue(byId('address.calle'), '  Cra. 76  No. 32-15 Apto 301 ')
    setInputValue(byId('address.codigoPostal'), '050021')
    await clickSubmit()
    expect(props.onSubmit).toHaveBeenCalledTimes(1)
    const body = (props.onSubmit as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(body.address).toEqual({
      calle: 'Cra. 76 No. 32-15 Apto 301',
      ciudad: 'Medellín',
      departamento: 'Antioquia',
      codigoPostal: '050021',
    })
  })
})
