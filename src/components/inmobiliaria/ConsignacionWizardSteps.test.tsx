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

import { StepAssignAgent, StepConfirmation, StepActaEntrega, StepPropertyData, StepCommissionTerms } from './ConsignacionWizardSteps'

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

  it('replaces the commission/minimum-term terms section with the sale commission (contract-addendum-2.md §A.8)', async () => {
    await act(async () => {
      root.render(
        React.createElement(StepConfirmation, {
          formData: {
            propietarioId: 'prop-1',
            propertyTitle: 'Depto Centro',
            listingType: 'sale',
            salePrice: 400_000_000,
            saleCommissionPercent: 3,
          },
          updateFormData: vi.fn(),
          propietarios: PROPIETARIOS,
          agentes: [AGENTE],
          onGoToStep: vi.fn(),
        }),
      )
    })

    expect(container.textContent).toContain('inmobiliaria.consignaciones.wizard.step6.saleCommission')
    expect(container.textContent).toContain('3%')
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

/**
 * <StepActaEntrega> — el video del inmueble (marketplace, 09-10-2026): el mismo
 * campo de «Editar», opcional, con la regla de `lib/marketplace/video.ts`.
 */
describe('<StepActaEntrega> — el video del inmueble', () => {
  function pintar(formData: Record<string, unknown>, erroresDelServidor?: Record<string, string>) {
    const updateFormData = vi.fn()
    act(() => {
      root.render(
        React.createElement(StepActaEntrega, {
          formData: { inventoryItems: [], photos: [], ...formData },
          updateFormData,
          propietarios: PROPIETARIOS,
          agentes: [],
          erroresDelServidor,
        }),
      )
    })
    return { updateFormData, campo: container.querySelector<HTMLInputElement>('[data-testid="asistente-videoUrl"]')! }
  }

  it('está, vacío y sin error (es opcional), con la ayuda de las cuatro redes', () => {
    const { campo } = pintar({})
    expect(campo).toBeTruthy()
    expect(campo.value).toBe('')
    expect(campo.getAttribute('aria-invalid')).toBeNull()
    expect(container.textContent).toContain('inmobiliaria.consignaciones.editForm.videoUrlHelper')
  })

  it('escribir lo guarda en el borrador del asistente', () => {
    const { campo, updateFormData } = pintar({})
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(campo, 'https://www.instagram.com/reel/abc/')
      campo.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(updateFormData).toHaveBeenCalledWith({ videoUrl: 'https://www.instagram.com/reel/abc/' })
  })

  it('un enlace que no es de Instagram, TikTok, YouTube o Facebook se dice bajo el campo', () => {
    const { campo } = pintar({ videoUrl: 'https://drive.google.com/x' })
    expect(campo.getAttribute('aria-invalid')).toBe('true')
    expect(container.textContent).toContain('Instagram, TikTok, YouTube o Facebook')
  })

  it('el error que mandó el back para `videoUrl` también va bajo el campo', () => {
    pintar({ videoUrl: 'https://www.instagram.com/reel/abc/' }, { videoUrl: 'El enlace no sirve.' })
    expect(container.textContent).toContain('El enlace no sirve.')
  })
})

/**
 * <StepActaEntrega> — photos-only on a sale listing (T-0042, ledger.md §2/§3).
 *
 * Root cause: photos are staged by the UI in this step, but a sale listing
 * used to skip the step entirely (contract-addendum-2.md §A.8), so
 * `formData.photos` never got populated. The fix makes the step reachable
 * for sale AND renders it photos-only: no inventory items, no
 * "Observaciones generales", and a step heading that says neither
 * "Inventario" nor "Acta de Entrega". The rent path renders unchanged.
 */
describe('<StepActaEntrega> — photos-only rendering for a sale listing (T-0042)', () => {
  it('sale: shows the photo section, hides inventory items and general notes, and uses photo-only heading wording', async () => {
    await act(async () => {
      root.render(
        React.createElement(StepActaEntrega, {
          formData: { listingType: 'sale', inventoryItems: [], photos: [] },
          updateFormData: vi.fn(),
          propietarios: PROPIETARIOS,
          agentes: [],
        }),
      )
    })

    // Photo section reachable and kept.
    expect(container.querySelector('[data-testid="property-photo-picker"]')).toBeTruthy()
    expect(container.textContent).toContain('inmobiliaria.consignaciones.wizard.step5.photosTitle')

    // Step heading is photo-only wording — exact match on the h2/subtitle
    // nodes (not a substring check: "step5.title" is itself a substring of
    // "step5.titleSale", so a `.not.toContain('...step5.title')` on the
    // whole textContent would give a false pass here).
    expect(container.querySelector('h2')?.textContent).toBe(
      'inmobiliaria.consignaciones.wizard.step5.titleSale',
    )
    expect(container.querySelector('h2 + p')?.textContent).toBe(
      'inmobiliaria.consignaciones.wizard.step5.subtitleSale',
    )
    expect(container.querySelector('h2')?.textContent).not.toBe(
      'inmobiliaria.consignaciones.wizard.step5.title',
    )

    // No inventory items UI.
    expect(container.textContent).not.toContain('inmobiliaria.consignaciones.wizard.step5.inventoryTitle')
    expect(container.textContent).not.toContain('inmobiliaria.consignaciones.wizard.step5.addItem')
    expect(container.textContent).not.toContain('inmobiliaria.consignaciones.wizard.step5.emptyInventory')

    // No "Observaciones generales".
    expect(container.textContent).not.toContain('inmobiliaria.consignaciones.wizard.step5.generalNotes')
  })

  it('rent: still shows inventory items, general notes and photos (unchanged)', async () => {
    await act(async () => {
      root.render(
        React.createElement(StepActaEntrega, {
          formData: { listingType: 'rent', inventoryItems: [], photos: [] },
          updateFormData: vi.fn(),
          propietarios: PROPIETARIOS,
          agentes: [],
        }),
      )
    })

    expect(container.querySelector('h2')?.textContent).toBe(
      'inmobiliaria.consignaciones.wizard.step5.title',
    )
    expect(container.querySelector('h2 + p')?.textContent).toBe(
      'inmobiliaria.consignaciones.wizard.step5.subtitle',
    )
    expect(container.textContent).toContain('inmobiliaria.consignaciones.wizard.step5.inventoryTitle')
    expect(container.textContent).toContain('inmobiliaria.consignaciones.wizard.step5.addItem')
    expect(container.textContent).toContain('inmobiliaria.consignaciones.wizard.step5.emptyInventory')
    expect(container.textContent).toContain('inmobiliaria.consignaciones.wizard.step5.generalNotes')
    expect(container.querySelector('[data-testid="property-photo-picker"]')).toBeTruthy()
    expect(container.textContent).toContain('inmobiliaria.consignaciones.wizard.step5.photosTitle')
  })
})

/**
 * Sistema de errores, tanda 2 (02-10-2026): los errores del paso 2 son
 * `ErrorDelCampo` (entran suaves, con `role="alert"`), el control los nombra en
 * `aria-describedby`, y los topes del back se ven en el momento, sin esperar
 * al blur ni al servidor.
 */
describe('<StepPropertyData> — errores en su campo', () => {
  const BASE = {
    propertyTitle: 'Apartamento en Laureles',
    propertyAddress: 'Cra 80 # 33-10',
    propertyCity: 'Medellín',
    propertyZone: 'Laureles',
    department: 'Antioquia',
    propertyType: 'apartment' as const,
    listingType: 'rent' as const,
    monthlyRent: 1_800_000,
    bedrooms: 2,
    bathrooms: 1,
    area: 60,
    propertyDescription: 'Descripción suficientemente larga para el paso.',
    consignedAt: '2026-10-02',
  }

  async function pintar(
    formData: Record<string, unknown>,
    erroresDelServidor?: Record<string, string>,
  ) {
    await act(async () => {
      root.render(
        React.createElement(StepPropertyData, {
          formData,
          updateFormData: vi.fn(),
          propietarios: PROPIETARIOS,
          agentes: [],
          erroresDelServidor,
        }),
      )
    })
  }

  const control = (campo: string) => container.querySelector<HTMLElement>(`#asistente-${campo}`)
  const errorDe = (campo: string) => container.querySelector<HTMLElement>(`#asistente-${campo}-error`)

  it('sin errores, ningún control se marca inválido', async () => {
    await pintar(BASE)
    expect(container.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0)
  })

  it('🔴 un canon de once cifras se dice en el momento, con la frase del back', async () => {
    await pintar({ ...BASE, monthlyRent: 30_000_000_000 })
    expect(errorDe('monthlyRent')?.textContent).toBe(
      'El canon no puede pasar de $100.000.000 al mes. Revisa que no sobren ceros.',
    )
    expect(control('monthlyRent')?.getAttribute('aria-invalid')).toBe('true')
    expect(control('monthlyRent')?.getAttribute('aria-describedby')).toBe('asistente-monthlyRent-error')
  })

  it('un título de más de 100 caracteres y una administración de más se dicen en su campo', async () => {
    await pintar({ ...BASE, propertyTitle: 'x'.repeat(101), adminFee: 200_000_000 })
    expect(errorDe('propertyTitle')?.textContent).toBe('El título no puede tener más de 100 caracteres.')
    expect(errorDe('adminFee')?.textContent).toBe(
      'La administración no puede pasar de $100.000.000 al mes. Revisa que no sobren ceros.',
    )
  })

  it('el error que mandó el servidor sale debajo de su campo', async () => {
    await pintar(BASE, { area: 'El área debe ser un número entero de metros cuadrados.' })
    expect(errorDe('area')?.textContent).toBe('El área debe ser un número entero de metros cuadrados.')
    expect(errorDe('area')?.getAttribute('role')).toBe('alert')
    expect(control('area')?.getAttribute('aria-invalid')).toBe('true')
  })

  it('la fecha de consignación: el error reemplaza la ayuda', async () => {
    await pintar({ ...BASE, consignedAt: '1900-01-01' })
    expect(errorDe('consignedAt')?.textContent).toContain('La fecha de consignación debe estar entre 1950 y 2100.')
  })
})

describe('<StepCommissionTerms> — el error del servidor en la comisión', () => {
  it('sale en su campo, con la ayuda cruzada', async () => {
    await act(async () => {
      root.render(
        React.createElement(StepCommissionTerms, {
          formData: { listingType: 'rent', monthlyRent: 1_000_000, commissionPercent: 10 },
          updateFormData: vi.fn(),
          propietarios: PROPIETARIOS,
          agentes: [],
          erroresDelServidor: { commissionPercent: 'La comisión no puede pasar de 100.' },
        }),
      )
    })
    expect(container.querySelector('#asistente-commissionPercent-error')?.textContent).toContain(
      'La comisión no puede pasar de 100.',
    )
    expect(container.querySelector('#asistente-commissionPercent')?.getAttribute('aria-invalid')).toBe('true')
  })
})
