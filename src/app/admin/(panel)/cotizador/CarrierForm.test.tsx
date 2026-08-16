/**
 * CarrierForm tests — create/edit form for cotizador carriers, incl. el
 * patrón write-only de credenciales (nunca se prellenan; se omiten del
 * submit si el usuario no las tocó).
 *
 * Strategy: createRoot + act (repo convention, no @testing-library) — mismo
 * patrón que PhotoDescriptionsEditor.test.tsx / registration-profiles page.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { CarrierForm } from './CarrierForm'
import { carrierToFormValues, type CarrierFormValues } from './carrier-form-schema'
import type { CarrierRow } from '@/lib/admin/cotizador'

void React

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

let container: HTMLDivElement
let root: Root

/** Set a controlled input's value the React-tracked way, then fire input. */
function typeInto(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(el, value)
  act(() => {
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function byId<T extends HTMLElement = HTMLInputElement>(id: string): T {
  const el = container.querySelector(`#${id}`)
  if (!el) throw new Error(`#${id} not found`)
  return el as T
}

function submitButton(): HTMLButtonElement {
  return Array.from(container.querySelectorAll('button')).find(
    (b) => b.type === 'submit',
  ) as HTMLButtonElement
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

describe('CarrierForm — create mode', () => {
  it('prefills the Fianly defaults and leaves name/route editable', () => {
    act(() => {
      root.render(<CarrierForm mode="create" onSubmit={vi.fn()} onCancel={vi.fn()} />)
    })

    expect(byId('carrier-name').getAttribute('value')).toBe('fianly')
    expect(byId('carrier-name').hasAttribute('disabled')).toBe(false)
    expect(byId('carrier-route').getAttribute('value')).toBe('direct')
  })

  it('submits with credentials typed by the user', async () => {
    const onSubmit = vi.fn()
    act(() => {
      root.render(<CarrierForm mode="create" onSubmit={onSubmit} onCancel={vi.fn()} />)
    })

    typeInto(byId('carrier-config_base_url'), 'https://fianly.example')
    typeInto(byId('carrier-config_username'), 'leasify')
    typeInto(byId('carrier-config_password'), 'secret123')

    await act(async () => {
      submitButton().click()
    })

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const values: CarrierFormValues = onSubmit.mock.calls[0][0]
    expect(values.name).toBe('fianly')
    expect(values.config_base_url).toBe('https://fianly.example')
    expect(values.config_username).toBe('leasify')
    expect(values.config_password).toBe('secret123')
  })

  it('shows a field error and blocks submit when route is cleared', async () => {
    const onSubmit = vi.fn()
    act(() => {
      root.render(<CarrierForm mode="create" onSubmit={onSubmit} onCancel={vi.fn()} />)
    })

    typeInto(byId('carrier-route'), '')

    await act(async () => {
      submitButton().click()
    })

    expect(onSubmit).not.toHaveBeenCalled()
    expect(container.textContent).toContain('La ruta es obligatoria.')
  })

  it('blocks submit and flags the empty fields when only the password is typed (credentials are all-or-nothing)', async () => {
    const onSubmit = vi.fn()
    act(() => {
      root.render(<CarrierForm mode="create" onSubmit={onSubmit} onCancel={vi.fn()} />)
    })

    typeInto(byId('carrier-config_password'), 'secret123')

    await act(async () => {
      submitButton().click()
    })

    expect(onSubmit).not.toHaveBeenCalled()
    const message = 'Para cambiar las credenciales, completá los tres campos (se guardan como un bloque).'
    expect(container.textContent).toContain(message)
    // Error shown against BOTH empty fields, not just one.
    const baseUrlField = byId('carrier-config_base_url').closest('div')
    const usernameField = byId('carrier-config_username').closest('div')
    expect(baseUrlField?.textContent).toContain(message)
    expect(usernameField?.textContent).toContain(message)
  })
})

describe('CarrierForm — edit mode', () => {
  it('disables the name field and shows "configurado ✓" when the carrier already has credentials', () => {
    act(() => {
      root.render(
        <CarrierForm
          mode="edit"
          initialValues={carrierToFormValues(FIANLY)}
          hasConfig={FIANLY.has_config}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      )
    })

    expect(byId('carrier-name').hasAttribute('disabled')).toBe(true)
    expect(container.textContent).toContain('configurado ✓')
    // Credenciales nunca se prellenan aunque el carrier ya las tenga.
    expect(byId('carrier-config_password').getAttribute('value')).toBe('')
  })

  it('submits with empty credential values when the user leaves them untouched (preserve existing)', async () => {
    const onSubmit = vi.fn()
    act(() => {
      root.render(
        <CarrierForm
          mode="edit"
          initialValues={carrierToFormValues(FIANLY)}
          hasConfig={FIANLY.has_config}
          onSubmit={onSubmit}
          onCancel={vi.fn()}
        />,
      )
    })

    await act(async () => {
      submitButton().click()
    })

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const values: CarrierFormValues = onSubmit.mock.calls[0][0]
    expect(values.config_base_url).toBe('')
    expect(values.config_username).toBe('')
    expect(values.config_password).toBe('')
  })
})
