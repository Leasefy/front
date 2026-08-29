/**
 * StepPropertyData.test.tsx — T-0038 additions to wizard step 2.
 *
 * Covers contract.md §3.2: the departamento select (reusing
 * COLOMBIAN_DEPARTMENTS, required in this UI), the rent/sale toggle that
 * swaps the price field (never both monthlyRent and salePrice inputs at
 * once), and the new property-level `consignedAt` date input — distinct
 * from the mandate's `contractStartDate` (not touched by this step).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { WizardFormData } from './ConsignacionWizardSteps'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

vi.mock('@/components/publicar/PropertyLocationField', () => ({
  PropertyLocationField: () => React.createElement('div', { 'data-testid': 'property-location-field' }),
}))

import { StepPropertyData } from './ConsignacionWizardSteps'

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
  vi.restoreAllMocks()
})

function render(formData: Partial<WizardFormData>, updateFormData = vi.fn()) {
  act(() => {
    root.render(
      React.createElement(StepPropertyData, {
        formData,
        updateFormData,
        propietarios: [],
        agentes: [],
      }),
    )
  })
  return { updateFormData }
}

describe('<StepPropertyData> — departamento select (contract.md §3.2.1)', () => {
  it('renders a department field with the placeholder when unset', () => {
    render({})
    expect(container.textContent).toContain('inmobiliaria.consignaciones.wizard.step2.departmentLabel')
  })

  it('shows the previously selected department once one is set', () => {
    // Radix Select's closed trigger renders its current value via
    // SelectValue; the option list itself only mounts once opened (a real
    // pointer-capture interaction, not exercised in this happy-dom suite —
    // see ConfigPerfilAgencia, which uses the identical Select pattern and
    // has no such test either).
    render({ department: 'Antioquia' })
    expect(container.textContent).toContain('Antioquia')
  })
})

describe('<StepPropertyData> — rent/sale toggle swaps the price field (contract.md §3.2.2/§3.2.4)', () => {
  it('shows the monthly-rent field and hides sale price when listingType is rent (default)', () => {
    render({})
    expect(container.textContent).toContain('inmobiliaria.consignaciones.wizard.step2.monthlyRentLabel')
    expect(container.textContent).not.toContain('inmobiliaria.consignaciones.wizard.step2.salePriceLabel')
  })

  it('shows the sale-price field and hides monthly rent when listingType is sale', () => {
    render({ listingType: 'sale' })
    expect(container.textContent).toContain('inmobiliaria.consignaciones.wizard.step2.salePriceLabel')
    expect(container.textContent).not.toContain('inmobiliaria.consignaciones.wizard.step2.monthlyRentLabel')
  })

  it('selecting "sale" calls updateFormData with listingType: sale', () => {
    const { updateFormData } = render({})
    const saleOption = Array.from(container.querySelectorAll('button, [role="radio"]')).find((el) =>
      el.textContent?.includes('inmobiliaria.consignaciones.wizard.step2.listingTypeSale'),
    )
    expect(saleOption).toBeTruthy()
    act(() => {
      ;(saleOption as HTMLElement).click()
    })
    expect(updateFormData).toHaveBeenCalledWith({ listingType: 'sale' })
  })

  it('typing a sale price strips non-digits and calls updateFormData with a number', () => {
    const { updateFormData } = render({ listingType: 'sale' })
    const input = Array.from(container.querySelectorAll('input')).find(
      (i) => i.getAttribute('placeholder') === 'inmobiliaria.consignaciones.wizard.step2.salePricePlaceholder',
    ) as HTMLInputElement
    expect(input).toBeTruthy()

    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
      setter.call(input, '350.000.000')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(updateFormData).toHaveBeenCalledWith({ salePrice: 350000000 })
  })
})

describe('<StepPropertyData> — validation (contract.md §3.2)', () => {
  it('shows a department-required error only after the field is touched', () => {
    render({ department: '' })
    expect(container.textContent).not.toContain('inmobiliaria.consignaciones.wizard.step2.validation.departmentRequired')
  })

  it('does not show a salePrice error for a RENT listing even with no salePrice', () => {
    render({ listingType: 'rent' })
    expect(container.textContent).not.toContain('inmobiliaria.consignaciones.wizard.step2.validation.salePriceRequired')
  })
})

describe('<StepPropertyData> — fecha de consignación (contract.md §3.2.6, D5, R6)', () => {
  it('renders a dedicated consignedAt date input, distinct from the mandate date', () => {
    render({ consignedAt: '2026-08-29' })
    const dateInputs = Array.from(container.querySelectorAll('input[type="date"]'))
    expect(dateInputs).toHaveLength(1)
    expect((dateInputs[0] as HTMLInputElement).value).toBe('2026-08-29')
  })

  it('calls updateFormData with only consignedAt when the date changes', () => {
    const { updateFormData } = render({ consignedAt: '2026-08-29' })
    const input = container.querySelector('input[type="date"]') as HTMLInputElement

    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
      setter.call(input, '2026-09-01')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(updateFormData).toHaveBeenCalledWith({ consignedAt: '2026-09-01' })
  })
})
