/**
 * ConsignacionWizardSteps.test.tsx — agent assignment is optional (T-0015).
 *
 * `StepAssignAgent` (wizard step 4) and `StepConfirmation` (step 6) used to
 * leave the user guessing what happens when no agent is picked: step 4 said
 * nothing extra, and step 6's summary just read "No asignado" — which reads
 * as broken/unassigned, not as "assigned to whoever is creating it" (the
 * actual behavior in ConsignacionWizard.handleSubmit).
 *
 * These tests lock the copy: no agent selected -> both steps say the
 * consignment stays with the creating profile.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { Agente, Propietario } from '@/lib/types/inmobiliaria'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

// Heavy siblings pulled in by the module (maps, owner form, cadence cards) —
// irrelevant to StepAssignAgent/StepConfirmation, mocked out to keep this
// test focused and fast.
vi.mock('./AgenteSelector', () => ({
  AgenteSelector: ({ allowNoAgent, value }: { allowNoAgent?: boolean; value?: string | null }) =>
    React.createElement(
      'div',
      { 'data-testid': 'agente-selector', 'data-allow-no-agent': String(allowNoAgent), 'data-value': String(value) },
    ),
}))

vi.mock('./PropietarioSelector', () => ({
  PropietarioSelector: () => React.createElement('div', { 'data-testid': 'propietario-selector' }),
}))

vi.mock('@/components/publicar/PropertyLocationField', () => ({
  PropertyLocationField: () => React.createElement('div', { 'data-testid': 'property-location-field' }),
}))

// PropertyPhotoPicker has its own test suite (PropertyPhotoPicker.test.tsx)
// covering validation/preview behavior. Here we only need to verify
// StepActaEntrega wires `formData.photos` and `onChange` correctly.
vi.mock('./PropertyPhotoPicker', () => ({
  PropertyPhotoPicker: ({
    photos,
    onChange,
  }: {
    photos: File[]
    onChange: (photos: File[]) => void
  }) =>
    React.createElement('div', {
      'data-testid': 'property-photo-picker',
      'data-count': String(photos.length),
      onClick: () => onChange([...photos, new File(['x'], 'added.jpg', { type: 'image/jpeg' })]),
    }),
}))

import { StepAssignAgent, StepConfirmation, StepActaEntrega } from './ConsignacionWizardSteps'

const AGENTE: Agente = {
  id: 'member-1',
  userId: 'agent-user-1',
  name: 'Agente Uno',
  email: 'agente1@test.com',
  phone: '3000000000',
  role: 'agent',
  status: 'active',
  commissionSplit: 50,
  assignedPropertyIds: [],
  hireDate: '2026-01-01',
  zone: 'Norte',
  metrics: {
    assignedProperties: 0,
    activeLeases: 0,
    closedThisMonth: 0,
    closedThisYear: 0,
    totalCommissions: 0,
    commissionsThisMonth: 0,
    avgDaysToClose: 0,
    conversionRate: 0,
  },
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
}

const PROPIETARIOS: Propietario[] = []

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

describe('<StepAssignAgent>', () => {
  it('tells the user the consignment stays with their own profile when no agent is picked', async () => {
    await act(async () => {
      root.render(
        React.createElement(StepAssignAgent, {
          formData: {},
          updateFormData: vi.fn(),
          propietarios: PROPIETARIOS,
          agentes: [AGENTE],
        }),
      )
    })

    expect(container.textContent).toContain('inmobiliaria.consignaciones.wizard.step4.selfAssignNotice')
    // AgenteSelector must still allow the explicit "no agent" option, even
    // with agentes loaded — req: an agency with zero agentes isn't broken.
    expect(container.querySelector('[data-testid="agente-selector"]')?.getAttribute('data-allow-no-agent')).toBe(
      'true',
    )
  })

  it('hides the self-assign notice once an agent is selected', async () => {
    await act(async () => {
      root.render(
        React.createElement(StepAssignAgent, {
          formData: { agenteId: 'member-1' },
          updateFormData: vi.fn(),
          propietarios: PROPIETARIOS,
          agentes: [AGENTE],
        }),
      )
    })

    expect(container.textContent).not.toContain('inmobiliaria.consignaciones.wizard.step4.selfAssignNotice')
  })
})

describe('<StepConfirmation> — agent section', () => {
  it('shows the self-assigned note instead of a blank/"not assigned" state when no agent was picked', async () => {
    await act(async () => {
      root.render(
        React.createElement(StepConfirmation, {
          formData: { propietarioId: 'prop-1', propertyTitle: 'Depto Centro' },
          updateFormData: vi.fn(),
          propietarios: PROPIETARIOS,
          agentes: [AGENTE],
          onGoToStep: vi.fn(),
        }),
      )
    })

    expect(container.textContent).toContain('inmobiliaria.consignaciones.wizard.step6.selfAssigned')
    expect(container.textContent).not.toContain('inmobiliaria.consignaciones.wizard.step6.notAssigned')
  })

  it('still shows the selected agent name when one was picked', async () => {
    await act(async () => {
      root.render(
        React.createElement(StepConfirmation, {
          formData: { propietarioId: 'prop-1', propertyTitle: 'Depto Centro', agenteId: 'member-1' },
          updateFormData: vi.fn(),
          propietarios: PROPIETARIOS,
          agentes: [AGENTE],
          onGoToStep: vi.fn(),
        }),
      )
    })

    expect(container.textContent).toContain('Agente Uno')
    expect(container.textContent).not.toContain('inmobiliaria.consignaciones.wizard.step6.selfAssigned')
  })
})

describe('<StepConfirmation> — T-0038 SALE listing summary', () => {
  it('shows the sale price instead of a monthly canon for a SALE listing', async () => {
    await act(async () => {
      root.render(
        React.createElement(StepConfirmation, {
          formData: {
            propietarioId: 'prop-1',
            propertyTitle: 'Depto Centro',
            listingType: 'sale',
            salePrice: 400_000_000,
            monthlyRent: undefined,
          },
          updateFormData: vi.fn(),
          propietarios: PROPIETARIOS,
          agentes: [AGENTE],
          onGoToStep: vi.fn(),
        }),
      )
    })

    expect(container.textContent).toContain('400.000.000')
    expect(container.textContent).not.toContain('inmobiliaria.consignaciones.wizard.step6.perMonth')
  })

  it('never shows "$0"/"$ 0" for a SALE listing with no salePrice yet', async () => {
    await act(async () => {
      root.render(
        React.createElement(StepConfirmation, {
          formData: { propietarioId: 'prop-1', propertyTitle: 'Depto Centro', listingType: 'sale' },
          updateFormData: vi.fn(),
          propietarios: PROPIETARIOS,
          agentes: [AGENTE],
          onGoToStep: vi.fn(),
        }),
      )
    })

    expect(container.textContent).not.toContain('$0')
    expect(container.textContent).not.toContain('$ 0')
    expect(container.textContent).toContain('inmobiliaria.consignaciones.wizard.step6.noSalePrice')
  })

  it('replaces the commission/minimum-term terms section with a "no terms for sale" notice', async () => {
    await act(async () => {
      root.render(
        React.createElement(StepConfirmation, {
          formData: {
            propietarioId: 'prop-1',
            propertyTitle: 'Depto Centro',
            listingType: 'sale',
            salePrice: 400_000_000,
          },
          updateFormData: vi.fn(),
          propietarios: PROPIETARIOS,
          agentes: [AGENTE],
          onGoToStep: vi.fn(),
        }),
      )
    })

    expect(container.textContent).toContain('inmobiliaria.consignaciones.wizard.step6.noTermsForSale')
    expect(container.textContent).not.toContain('inmobiliaria.consignaciones.wizard.step6.monthlyCommission')
  })

  it('a RENT listing keeps the commission/terms section unchanged (regression)', async () => {
    await act(async () => {
      root.render(
        React.createElement(StepConfirmation, {
          formData: {
            propietarioId: 'prop-1',
            propertyTitle: 'Depto Centro',
            listingType: 'rent',
            monthlyRent: 2_000_000,
            commissionPercent: 10,
          },
          updateFormData: vi.fn(),
          propietarios: PROPIETARIOS,
          agentes: [AGENTE],
          onGoToStep: vi.fn(),
        }),
      )
    })

    expect(container.textContent).toContain('inmobiliaria.consignaciones.wizard.step6.monthlyCommission')
    expect(container.textContent).not.toContain('inmobiliaria.consignaciones.wizard.step6.noTermsForSale')
  })
})

describe('<StepActaEntrega> — property photos (T-0017)', () => {
  it('renders the photo picker wired to formData.photos and forwards its onChange to updateFormData', async () => {
    const updateFormData = vi.fn()
    const existing = new File(['x'], 'existing.jpg', { type: 'image/jpeg' })

    await act(async () => {
      root.render(
        React.createElement(StepActaEntrega, {
          formData: { inventoryItems: [], photos: [existing] },
          updateFormData,
          propietarios: PROPIETARIOS,
          agentes: [],
        }),
      )
    })

    const picker = container.querySelector('[data-testid="property-photo-picker"]') as HTMLDivElement
    expect(picker).toBeTruthy()
    expect(picker.dataset.count).toBe('1')

    await act(async () => {
      picker.click()
    })

    expect(updateFormData).toHaveBeenCalledWith({ photos: [existing, expect.any(File)] })
  })

  it('no longer shows the disabled "coming soon" placeholder', async () => {
    await act(async () => {
      root.render(
        React.createElement(StepActaEntrega, {
          formData: { inventoryItems: [] },
          updateFormData: vi.fn(),
          propietarios: PROPIETARIOS,
          agentes: [],
        }),
      )
    })

    expect(container.textContent).toContain('inmobiliaria.consignaciones.wizard.step5.photosTitle')
    const disabledButtons = Array.from(container.querySelectorAll('button[disabled]'))
    expect(disabledButtons).toHaveLength(0)
  })
})
