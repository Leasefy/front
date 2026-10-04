/**
 * IN-17 (QA de Inmuebles, 04-10): las etiquetas del asistente «Nueva
 * consignación» no estaban unidas a su campo. Un lector de pantalla no decía
 * qué era cada caja y `getByLabel` (Playwright, Testing Library) no las
 * encontraba. Esta prueba busca CADA campo por su etiqueta, como lo hace
 * `getByLabel`: `<label htmlFor>` → el control con ese id (que tiene que ser
 * «labelable»), `aria-labelledby` para los grupos de tarjetas, o `aria-label`.
 *
 * Y el aviso del paso de inventario (QA con avatares, 04-10): sin inventario
 * no se podrá firmar el contrato — se dice antes de salir del asistente.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p && 'n' in p ? `${k} ${p.n}` : k),
    locale: 'es',
  }),
}))
vi.mock('./AgenteSelector', () => ({ AgenteSelector: () => React.createElement('div') }))
vi.mock('./PropietarioSelector', () => ({ PropietarioSelector: () => React.createElement('div') }))
// La dirección real es un autocompletar que pone el `id` en su <input>: acá,
// un <input> con ese id basta para probar que la etiqueta lo nombra.
vi.mock('@/components/publicar/PropertyLocationField', () => ({
  PropertyLocationField: ({ id }: { id?: string }) => React.createElement('input', { id, readOnly: true }),
}))
vi.mock('./PropertyPhotoPicker', () => ({ PropertyPhotoPicker: () => React.createElement('div') }))

import { StepActaEntrega, StepCommissionTerms, StepPropertyData } from './ConsignacionWizardSteps'

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

const LABELABLE = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'METER', 'OUTPUT', 'PROGRESS'])

/** Lo que haría `getByLabel(texto)`: el control que esa etiqueta nombra, o null. */
function porEtiqueta(texto: string): HTMLElement | null {
  const etiqueta = Array.from(container.querySelectorAll('label')).find((l) =>
    (l.textContent ?? '').includes(texto),
  )
  if (etiqueta) {
    const para = etiqueta.getAttribute('for')
    if (para) {
      const c = document.getElementById(para)
      return c && LABELABLE.has(c.tagName) ? c : null
    }
    const anidado = etiqueta.querySelector('input,textarea,select,button')
    if (anidado) return anidado as HTMLElement
    if (etiqueta.id) {
      return container.querySelector<HTMLElement>(`[aria-labelledby~="${etiqueta.id}"]`)
    }
    return null
  }
  return container.querySelector<HTMLElement>(`[aria-label="${texto}"]`)
}

const S2 = 'inmobiliaria.consignaciones.wizard.step2.'

describe('IN-17: cada campo del asistente se encuentra por su etiqueta', () => {
  it('paso «Propiedad» (arriendo)', async () => {
    await act(async () => {
      root.render(
        React.createElement(StepPropertyData, {
          formData: { propertyType: 'apartment', listingType: 'rent' },
          updateFormData: vi.fn(),
          propietarios: [],
          agentes: [],
        }),
      )
    })
    for (const k of [
      'propertyTypeLabel', 'propertyTitleLabel', 'addressLabel', 'cityLabel', 'zoneLabel',
      'departmentLabel', 'listingTypeLabel', 'monthlyRentLabel', 'adminFeeLabel', 'bedroomsLabel',
      'bathroomsLabel', 'areaLabel', 'descriptionLabel', 'consignedAtLabel',
    ]) {
      expect(porEtiqueta(S2 + k), k).not.toBeNull()
    }
    // Los obligatorios lo dicen también a un lector de pantalla.
    expect(porEtiqueta(S2 + 'propertyTitleLabel')?.getAttribute('aria-required')).toBe('true')
    expect(porEtiqueta(S2 + 'cityLabel')?.getAttribute('aria-required')).toBe('true')
    expect(porEtiqueta(S2 + 'monthlyRentLabel')?.getAttribute('aria-required')).toBe('true')
  })

  it('paso «Propiedad» (venta): el precio', async () => {
    await act(async () => {
      root.render(
        React.createElement(StepPropertyData, {
          formData: { propertyType: 'apartment', listingType: 'sale' },
          updateFormData: vi.fn(),
          propietarios: [],
          agentes: [],
        }),
      )
    })
    expect(porEtiqueta(S2 + 'salePriceLabel')).not.toBeNull()
  })

  it('paso «Comisión»: la comisión y el término mínimo (y la de venta)', async () => {
    await act(async () => {
      root.render(
        React.createElement(StepCommissionTerms, {
          formData: { listingType: 'rent', monthlyRent: 1_000_000 },
          updateFormData: vi.fn(),
          propietarios: [],
          agentes: [],
        }),
      )
    })
    expect(porEtiqueta('inmobiliaria.consignaciones.wizard.step3.commissionLabel')).not.toBeNull()
    expect(porEtiqueta('inmobiliaria.consignaciones.wizard.step3.minimumTermLabel')).not.toBeNull()
    await act(async () => {
      root.render(
        React.createElement(StepCommissionTerms, {
          formData: { listingType: 'sale' },
          updateFormData: vi.fn(),
          propietarios: [],
          agentes: [],
        }),
      )
    })
    expect(porEtiqueta('inmobiliaria.consignaciones.wizard.step3.saleCommissionLabel')).not.toBeNull()
  })

  it('paso «Acta de entrega»: cada ítem y las observaciones; quitar dice qué quita', async () => {
    await act(async () => {
      root.render(
        React.createElement(StepActaEntrega, {
          formData: {
            listingType: 'rent',
            inventoryItems: [{ id: 'item-1', name: 'Nevera', quantity: 1, condition: 'good' }],
            photos: [],
          },
          updateFormData: vi.fn(),
          propietarios: [],
          agentes: [],
        }),
      )
    })
    const S5 = 'inmobiliaria.consignaciones.wizard.step5.'
    expect(porEtiqueta(`${S5}itemNameAria 1`)).not.toBeNull()
    expect(porEtiqueta(`${S5}itemQuantityAria 1`)).not.toBeNull()
    expect(porEtiqueta(`${S5}itemConditionAria 1`)).not.toBeNull()
    expect(porEtiqueta(`${S5}itemNotesAria 1`)).not.toBeNull()
    expect(porEtiqueta(`${S5}generalNotes`)).not.toBeNull()
    // Antes el botón de la papelera se llamaba «Agregar item».
    expect(porEtiqueta(`${S5}removeItem 1`)).not.toBeNull()
  })
})

describe('QA con avatares: el paso de inventario avisa lo que pasa sin inventario', () => {
  async function pintar(formData: Record<string, unknown>) {
    await act(async () => {
      root.render(
        React.createElement(StepActaEntrega, { formData, updateFormData: vi.fn(), propietarios: [], agentes: [] }),
      )
    })
  }
  const aviso = () => container.querySelector('[data-testid="aviso-sin-inventario"]')

  it('🔴 sin ítems dice que sin inventario no se podrá firmar el contrato', async () => {
    await pintar({ listingType: 'rent', inventoryItems: [], photos: [] })
    expect(aviso()?.textContent).toContain('inmobiliaria.consignaciones.wizard.step5.sinInventarioAviso')
  })

  it('un renglón sin nombre no cuenta como inventario', async () => {
    await pintar({ listingType: 'rent', inventoryItems: [{ id: 'i', name: ' ', quantity: 1, condition: 'good' }], photos: [] })
    expect(aviso()).not.toBeNull()
  })

  it('con un ítem el aviso se va', async () => {
    await pintar({ listingType: 'rent', inventoryItems: [{ id: 'i', name: 'Nevera', quantity: 1, condition: 'good' }], photos: [] })
    expect(aviso()).toBeNull()
  })

  it('en venta no hay inventario que pedir: no avisa', async () => {
    await pintar({ listingType: 'sale', inventoryItems: [], photos: [] })
    expect(aviso()).toBeNull()
  })
})
