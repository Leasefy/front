/**
 * ConfigPerfilAgencia.test.tsx — profile form wired to PUT /inmobiliaria/agency.
 *
 * Covers: view-mode rendering from the real agency shape, changed-fields-only
 * save payload, no-op save when nothing changed, admin-only edit gating, and
 * staying in edit mode when the save rejects (e.g. backend 403).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

import { ConfigPerfilAgencia } from './ConfigPerfilAgencia'
import type { AgencyProfile } from '@/lib/types/inmobiliaria'

const AGENCY: AgencyProfile = {
  id: 'ag-1',
  name: 'Inmobiliaria ABC',
  nit: '901.234.567-8',
  address: 'Cra 11 #82-76',
  city: 'Bogota',
  phone: '+57 601 345 6789',
  email: 'contacto@abc.co',
  website: 'https://abc.co',
  whatsapp: '+57 310 555 1234',
  supportEmail: 'soporte@abc.co',
  razonSocial: 'Inmobiliaria ABC S.A.S.',
  matriculaInmobiliaria: 'INM-2024-001234',
  registroCamara: 'S0012345',
  department: 'Cundinamarca',
  postalCode: '110221',
  legalRepresentative: 'Juan Perez',
  legalDocumentNumber: '80123456',
  defaultCommissionPercent: 10,
  defaultLateFeePercent: 2,
  paymentDueDay: 5,
  disbursementDay: 15,
  reminderDaysBefore: [3, 1],
  reminderDaysAfter: [1, 3, 7, 15],
  memberRole: 'ADMIN',
}

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
  vi.clearAllMocks()
})

function render(props: Partial<React.ComponentProps<typeof ConfigPerfilAgencia>> = {}) {
  const defaultProps: React.ComponentProps<typeof ConfigPerfilAgencia> = {
    agency: AGENCY,
    onSave: vi.fn().mockResolvedValue(undefined),
    ...props,
  }
  act(() => {
    root.render(<ConfigPerfilAgencia {...defaultProps} />)
  })
  return defaultProps
}

function findButton(text: string): HTMLButtonElement {
  const buttons = Array.from(container.querySelectorAll('button'))
  const btn = buttons.find((b) => (b.textContent ?? '').includes(text))
  if (!btn) throw new Error(`Button with text "${text}" not found`)
  return btn as HTMLButtonElement
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )!.set!
  setter.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function enterEditMode() {
  act(() => {
    findButton('Editar').click()
  })
}

async function clickSave() {
  await act(async () => {
    findButton('Guardar cambios').click()
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('<ConfigPerfilAgencia>', () => {
  it('renders the real agency fields in view mode', () => {
    render()
    const text = container.textContent ?? ''
    expect(text).toContain('Inmobiliaria ABC')
    expect(text).toContain('+57 601 345 6789')
    expect(text).toContain('contacto@abc.co')
    expect(text).toContain('901.234.567-8')
    expect(text).toContain('Juan Perez')
    // Reminder arrays from the agency row
    expect(text).toContain('3d, 1d')
  })

  it('renders the extended design fields in view mode', () => {
    render()
    const text = container.textContent ?? ''
    expect(text).toContain('https://abc.co')
    expect(text).toContain('+57 310 555 1234')
    expect(text).toContain('Inmobiliaria ABC S.A.S.')
    expect(text).toContain('INM-2024-001234')
    expect(text).toContain('S0012345')
    // Department is joined into the address line
    expect(text).toContain('Cundinamarca')
  })

  it('saves changed extended fields with their contract payload keys', async () => {
    const props = render()
    enterEditMode()

    const whatsappInput = Array.from(container.querySelectorAll('input')).find(
      (i) => i.value === '+57 310 555 1234',
    ) as HTMLInputElement
    expect(whatsappInput).toBeTruthy()
    act(() => {
      setInputValue(whatsappInput, '+57 320 999 8877')
    })

    const websiteInput = Array.from(container.querySelectorAll('input')).find(
      (i) => i.value === 'https://abc.co',
    ) as HTMLInputElement
    expect(websiteInput).toBeTruthy()
    act(() => {
      setInputValue(websiteInput, 'https://abc.com.co')
    })

    await clickSave()

    expect(props.onSave).toHaveBeenCalledWith({
      whatsapp: '+57 320 999 8877',
      website: 'https://abc.com.co',
    })
  })

  it('saves the real-estate license under the matriculaInmobiliaria key (backend field name)', async () => {
    const props = render()
    enterEditMode()

    const matriculaInput = Array.from(container.querySelectorAll('input')).find(
      (i) => i.value === 'INM-2024-001234',
    ) as HTMLInputElement
    expect(matriculaInput).toBeTruthy()
    act(() => {
      setInputValue(matriculaInput, 'INM-2026-009999')
    })

    await clickSave()

    expect(props.onSave).toHaveBeenCalledWith({ matriculaInmobiliaria: 'INM-2026-009999' })
  })

  it('toggles a reminder day chip and sends the full array', async () => {
    const props = render()
    enterEditMode()

    // "Antes" group: currently [3, 1] → clicking 5d adds it
    const beforeChip = container.querySelector(
      '[data-testid="reminder-before-5"]',
    ) as HTMLButtonElement
    expect(beforeChip).toBeTruthy()
    act(() => {
      beforeChip.click()
    })

    await clickSave()

    expect(props.onSave).toHaveBeenCalledWith({
      reminderDaysBefore: [1, 3, 5],
    })
  })

  it('allows clearing all reminder days (empty array = disabled)', async () => {
    const props = render()
    enterEditMode()

    for (const day of [1, 3]) {
      const chip = container.querySelector(
        `[data-testid="reminder-before-${day}"]`,
      ) as HTMLButtonElement
      act(() => {
        chip.click()
      })
    }

    await clickSave()

    expect(props.onSave).toHaveBeenCalledWith({ reminderDaysBefore: [] })
  })

  it('does not send reminder arrays when they were not touched', async () => {
    const props = render()
    enterEditMode()

    const nameInput = Array.from(container.querySelectorAll('input')).find(
      (i) => i.value === 'Inmobiliaria ABC',
    ) as HTMLInputElement
    act(() => {
      setInputValue(nameInput, 'Inmobiliaria XYZ')
    })

    await clickSave()

    expect(props.onSave).toHaveBeenCalledWith({ name: 'Inmobiliaria XYZ' })
  })

  it('saves only the changed fields', async () => {
    const props = render()
    enterEditMode()

    const nameInput = Array.from(container.querySelectorAll('input')).find(
      (i) => i.value === 'Inmobiliaria ABC',
    ) as HTMLInputElement
    expect(nameInput).toBeTruthy()
    act(() => {
      setInputValue(nameInput, 'Inmobiliaria XYZ')
    })

    await clickSave()

    expect(props.onSave).toHaveBeenCalledTimes(1)
    expect(props.onSave).toHaveBeenCalledWith({ name: 'Inmobiliaria XYZ' })
  })

  it('does not call onSave when nothing changed', async () => {
    const props = render()
    enterEditMode()

    await clickSave()

    expect(props.onSave).not.toHaveBeenCalled()
    // Back to view mode — the edit button is visible again
    expect(findButton('Editar')).toBeTruthy()
  })

  it('stays in edit mode when the save rejects (backend 403 surfaced by the parent)', async () => {
    const props = render({ onSave: vi.fn().mockRejectedValue(new Error('403')) })
    enterEditMode()

    const nameInput = Array.from(container.querySelectorAll('input')).find(
      (i) => i.value === 'Inmobiliaria ABC',
    ) as HTMLInputElement
    act(() => {
      setInputValue(nameInput, 'Otro Nombre')
    })

    await clickSave()

    expect(props.onSave).toHaveBeenCalledTimes(1)
    // Still editing: the save button remains rendered
    expect(findButton('Guardar cambios')).toBeTruthy()
  })

  it('hides the edit button and shows a hint for non-admins', () => {
    render({ canEdit: false })
    const buttons = Array.from(container.querySelectorAll('button'))
    expect(buttons.some((b) => (b.textContent ?? '').includes('Editar'))).toBe(false)
    expect(container.textContent).toContain(
      'Solo los administradores de la agencia pueden editar esta información.',
    )
  })

  it('validates the name before saving', async () => {
    const props = render()
    enterEditMode()

    const nameInput = Array.from(container.querySelectorAll('input')).find(
      (i) => i.value === 'Inmobiliaria ABC',
    ) as HTMLInputElement
    act(() => {
      setInputValue(nameInput, '   ')
    })

    await clickSave()

    expect(props.onSave).not.toHaveBeenCalled()
    expect(container.textContent).toContain('El nombre de la agencia es obligatorio')
  })
})
