/**
 * PropietarioForm — «¿A quién pertenece la cuenta?» y el departamento.
 *
 * Nico (22-09): «la cuenta de banco donde recibe el propietario no
 * necesariamente tiene que estar asociada a ese propietario, puede ser otra
 * persona […] si es a otra persona, debe pedir el tipo de documento y número de
 * documento y ahí ya le da la opción de agregar la cuenta».
 *
 * Antes el formulario tenía un «Titular» obligatorio (que se llenaba con el
 * nombre del propietario) y un documento del titular opcional «sólo si es otra
 * persona»: nada preguntaba de quién era la cuenta, y una cuenta de otra
 * persona sin documento salía al banco con la cédula del propietario.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (clave: string) => clave, locale: 'es' }),
}))

import { PropietarioForm } from './PropietarioForm'
import type { Propietario, PropietarioFormData } from '@/lib/types/inmobiliaria'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

/** Jorge recibe en la cuenta de su hermano Carlos. */
const deOtraPersona: PropietarioFormData = {
  name: 'Jorge Restrepo',
  email: 'jorge@example.com',
  phone: '3101234567',
  documentType: 'CC',
  documentNumber: '71234567',
  address: 'Cra 15 #93-45',
  city: 'Medellín',
  department: 'Antioquia',
  bankCode: 'bancolombia',
  accountType: 'savings',
  accountNumber: '91234567890',
  accountHolder: 'Carlos Restrepo',
  accountHolderDocumentType: 'CC',
  accountHolderDocument: '8001234',
  notes: '',
}

const $ = (testid: string) => container.querySelector(`[data-testid="${testid}"]`) as HTMLElement | null

async function render(props: Partial<React.ComponentProps<typeof PropietarioForm>>) {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  await act(async () => {
    root.render(<PropietarioForm mode="create" onSubmit={onSubmit} onCancel={() => {}} {...props} />)
  })
  return onSubmit
}

async function submit() {
  const form = container.querySelector('form')!
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

async function clic(testid: string) {
  await act(async () => {
    $(testid)!.click()
  })
}

async function escribir(testid: string, valor: string) {
  const input = $(testid) as HTMLInputElement
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(input, valor)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('<PropietarioForm> — ¿a quién pertenece la cuenta?', () => {
  it('la pregunta va ANTES del banco y del número de cuenta', async () => {
    await render({ initialFormData: deOtraPersona })
    const pregunta = $('titular-de-la-cuenta')!
    const texto = container.textContent ?? ''
    expect(pregunta).not.toBeNull()
    expect(texto.indexOf('inmobiliaria.propietario.form.titularPregunta')).toBeLessThan(
      texto.indexOf('inmobiliaria.propietario.form.accountNumber'),
    )
  })

  it('una cuenta con el documento de otra persona abre en «De otra persona» con sus datos, y los manda', async () => {
    const onSubmit = await render({ initialFormData: deOtraPersona })
    expect($('titular-tercero')!.getAttribute('aria-checked')).toBe('true')
    expect(($('titular-documento') as HTMLInputElement).value).toBe('8001234')
    expect(($('titular-nombre') as HTMLInputElement).value).toBe('Carlos Restrepo')
    expect($('propietario-departamento')?.textContent).toContain('Antioquia')

    await submit()
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      department: 'Antioquia',
      titularDeLaCuenta: 'TERCERO',
      accountHolder: 'Carlos Restrepo',
      accountHolderDocumentType: 'CC',
      accountHolderDocument: '8001234',
    })
  })

  it('«Del propietario» no pide titular y lo manda vacío (el back lo limpia)', async () => {
    const onSubmit = await render({ initialFormData: deOtraPersona })
    await clic('titular-propietario')
    expect($('titular-nombre')).toBeNull()
    expect($('titular-documento')).toBeNull()

    await submit()
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      titularDeLaCuenta: 'PROPIETARIO',
      accountHolder: '',
      accountHolderDocument: '',
      accountHolderDocumentType: '',
    })
  })

  it('un propietario nuevo sin titular declarado arranca en «Del propietario» y se guarda sin llenar nada más', async () => {
    const onSubmit = await render({
      initialFormData: { ...deOtraPersona, accountHolder: '', accountHolderDocument: '', accountHolderDocumentType: '' },
    })
    expect($('titular-propietario')!.getAttribute('aria-checked')).toBe('true')
    await submit()
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ titularDeLaCuenta: 'PROPIETARIO' })
  })

  it('«De otra persona» sin tipo de documento no se guarda y dice por qué', async () => {
    const onSubmit = await render({ initialFormData: { ...deOtraPersona, accountHolderDocumentType: '' } })
    await submit()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(container.textContent).toContain('inmobiliaria.propietario.form.errHolderDocTypeRequired')
  })

  it('«De otra persona» sin nombre ni documento no se guarda', async () => {
    const onSubmit = await render({
      initialFormData: { ...deOtraPersona, accountHolder: '', accountHolderDocument: '', accountHolderDocumentType: '' },
    })
    await clic('titular-tercero')
    await submit()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(container.textContent).toContain('inmobiliaria.propietario.form.titularErrNombre')
  })

  it('🔴 «De otra persona» con tipo y número pero SIN nombre no se guarda: algunos bancos lo exigen (Nico, 23-09)', async () => {
    const onSubmit = await render({ initialFormData: { ...deOtraPersona, accountHolder: '' } })
    await submit()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(container.textContent).toContain('inmobiliaria.propietario.form.titularErrNombre')
  })

  it('«De otra persona» con la cédula del propietario se rechaza: no es otra persona', async () => {
    const onSubmit = await render({ initialFormData: deOtraPersona })
    await escribir('titular-documento', '71.234.567')
    await submit()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(container.textContent).toContain('inmobiliaria.propietario.form.titularErrEsElPropietario')
  })

  it('un NIT con el dígito de verificación equivocado se rechaza', async () => {
    const onSubmit = await render({
      initialFormData: {
        ...deOtraPersona,
        accountHolder: 'Inversiones Restrepo SAS',
        accountHolderDocumentType: 'NIT',
        accountHolderDocument: '890903938-3',
      },
    })
    await submit()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(container.textContent).toContain('inmobiliaria.propietario.form.titularErrDv')
  })

  it('al editar una ficha vieja con el titular a medias SIN tocar la pregunta, no bloquea y viaja como estaba', async () => {
    const propietario: Propietario = {
      id: 'po-1',
      name: 'Jorge Restrepo',
      email: 'jorge@example.com',
      phone: '3101234567',
      documentType: 'CC',
      documentNumber: '71234567',
      city: 'Bogotá',
      department: 'Bogotá D.C.',
      bankAccount: {
        bank: 'bancolombia',
        accountType: 'savings',
        accountNumber: '91234567890',
        // Lo que dejó la migración: el nombre de otra persona, sin documento.
        accountHolder: 'Carlos Restrepo',
      },
      propertyCount: 0,
      activeLeases: 0,
      totalMonthlyRent: 0,
      pendingBalance: 0,
      createdAt: '2026-09-07',
      updatedAt: '2026-09-07',
    }
    const onSubmit = await render({ mode: 'edit', initialData: propietario })
    expect($('titular-tercero')!.getAttribute('aria-checked')).toBe('true')
    expect($('propietario-departamento')?.textContent).toContain('Bogotá D.C.')

    await submit()
    expect(onSubmit).toHaveBeenCalledTimes(1)
    const enviado = onSubmit.mock.calls[0][0] as PropietarioFormData
    expect(enviado.titularDeLaCuenta).toBeUndefined()
    expect(enviado).toMatchObject({ department: 'Bogotá D.C.', accountHolder: 'Carlos Restrepo' })
  })
})
