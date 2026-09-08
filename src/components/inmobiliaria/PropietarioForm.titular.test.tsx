/**
 * PropietarioForm — departamento y documento del titular de la cuenta.
 *
 * Los dos campos existían en la base desde la migración de terceros
 * (2026-09-07) pero el formulario del panel no los mostraba ni los recibía:
 * un propietario creado a mano nunca podía tener un titular distinto, y el
 * archivo de dispersión de Bancolombia salía con el documento equivocado.
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

const completo: PropietarioFormData = {
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

async function submit() {
  const form = container.querySelector('form')!
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

describe('<PropietarioForm> — departamento y titular', () => {
  it('muestra los campos y los manda al guardar', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    await act(async () => {
      root.render(<PropietarioForm mode="create" initialFormData={completo} onSubmit={onSubmit} onCancel={() => {}} />)
    })

    expect(container.querySelector('[data-testid="propietario-departamento"]')?.textContent).toContain('Antioquia')
    expect((container.querySelector('[data-testid="titular-documento"]') as HTMLInputElement).value).toBe('8001234')
    expect(container.querySelector('[data-testid="titular-tipo-documento"]')?.textContent).toContain('CC')

    await submit()
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      department: 'Antioquia',
      accountHolderDocumentType: 'CC',
      accountHolderDocument: '8001234',
    })
  })

  it('un documento del titular sin tipo no se guarda y dice por qué', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    await act(async () => {
      root.render(
        <PropietarioForm
          mode="create"
          initialFormData={{ ...completo, accountHolderDocumentType: '' }}
          onSubmit={onSubmit}
          onCancel={() => {}}
        />,
      )
    })
    await submit()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(container.textContent).toContain('inmobiliaria.propietario.form.errHolderDocTypeRequired')
  })

  it('al editar, precarga desde la ficha (bankAccount anidado) y respeta un departamento fuera de la lista', async () => {
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
        accountHolder: 'Carlos Restrepo',
        accountHolderDocument: '8001234',
        accountHolderDocumentType: 'CE',
      },
      propertyCount: 0,
      activeLeases: 0,
      totalMonthlyRent: 0,
      pendingBalance: 0,
      createdAt: '2026-09-07',
      updatedAt: '2026-09-07',
    }
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    await act(async () => {
      root.render(<PropietarioForm mode="edit" initialData={propietario} onSubmit={onSubmit} onCancel={() => {}} />)
    })
    expect((container.querySelector('[data-testid="titular-documento"]') as HTMLInputElement).value).toBe('8001234')
    expect(container.querySelector('[data-testid="propietario-departamento"]')?.textContent).toContain('Bogotá D.C.')

    await submit()
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      department: 'Bogotá D.C.',
      accountHolderDocumentType: 'CE',
      accountHolderDocument: '8001234',
    })
  })
})
