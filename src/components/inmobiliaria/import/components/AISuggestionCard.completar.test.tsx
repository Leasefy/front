/**
 * «Completá esto para poder crearlo» no puede desaparecer mientras se escribe.
 * Nico (2026-09-02): «pone una letra ahí en ese de error y de una lo quita y
 * queda siempre con una sola letra». La sección pintaba SÓLO lo que faltaba,
 * y «Barrio» deja de faltar con la primera letra → el input se desmontaba.
 */
import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { ImportProperty } from '../lib/importTypes'
import { escribirCampo } from '../lib/requisitosDelBack'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k, locale: 'es' }) }))

import { AISuggestionCard } from './AISuggestionCard'

let container: HTMLDivElement
let root: Root
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function base(extra: Partial<ImportProperty>): ImportProperty {
  return {
    _rowIndex: 0,
    propertyTitle: 'Apartamento en Venta en Barranquilla',
    propertyAddress: 'Cra 20 #1E 165',
    propertyCity: 'Barranquilla',
    propertyType: 'apartment',
    listingType: 'venta',
    salePrice: 470_000_000,
    bathrooms: 2,
    propertyArea: 60,
    selected: false,
    hasErrors: true,
    errorMessages: [],
    suggestions: [],
    ...extra,
  } as ImportProperty
}

/** Monta la tarjeta como la monta el paso: el padre guarda y vuelve a pintar. */
function montar(inicial: ImportProperty) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  let property = inicial
  const pintar = () =>
    root.render(
      <AISuggestionCard
        property={property}
        index={0}
        onToggleSelect={() => {}}
        onAcceptSuggestion={() => {}}
        onRejectSuggestion={() => {}}
        onAcceptAll={() => {}}
        onEditField={(_row, campo, valor) => {
          property = escribirCampo(property, campo, valor)
          pintar()
        }}
      />,
    )
  act(() => pintar())
  return { get property() { return property } }
}

function escribir(input: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(input, valor)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

const campoBarrio = () =>
  container.querySelector<HTMLInputElement>('[data-testid="falta-propertyZone-0"]')

describe('AISuggestionCard — completar lo que falta', () => {
  it('el campo Barrio sigue en pantalla letra por letra hasta la palabra completa', () => {
    const vista = montar(base({ propertyZone: '' }))
    expect(campoBarrio()).not.toBeNull()

    escribir(campoBarrio()!, 'S')
    // Con una letra ya no «falta» — pero el input tiene que seguir ahí.
    expect(vista.property.propertyZone).toBe('S')
    expect(campoBarrio()).not.toBeNull()
    expect(campoBarrio()!.getAttribute('aria-invalid')).toBeNull()

    escribir(campoBarrio()!, 'Sa')
    escribir(campoBarrio()!, 'Sabanilla')
    expect(vista.property.propertyZone).toBe('Sabanilla')
    expect(campoBarrio()!.value).toBe('Sabanilla')
  })

  it('cuando ya no falta nada la sección lo dice en verde, y si se borra vuelve a reclamar', () => {
    const vista = montar(base({ propertyZone: '' }))
    const seccion = () => container.querySelector('[data-testid="completar-0"]')!
    expect(seccion().textContent).toContain('Completá esto para poder crearlo')

    escribir(campoBarrio()!, 'Sabanilla')
    expect(vista.property.hasErrors).toBe(false)
    expect(seccion().textContent).toContain('Listo, ya se puede crear')
    expect(seccion().getAttribute('data-completo')).toBe('true')

    escribir(campoBarrio()!, '')
    expect(seccion().textContent).toContain('Completá esto para poder crearlo')
    expect(campoBarrio()!.getAttribute('aria-invalid')).toBe('true')
  })

  it('el canon no se esfuma al cruzar el mínimo: se puede escribir $1.500.000 entero', () => {
    montar(base({ listingType: 'arriendo', salePrice: undefined, monthlyRent: undefined }))
    const canon = () =>
      container.querySelector<HTMLInputElement>('[data-testid="falta-monthlyRent-0"]')
    expect(canon()).not.toBeNull()
    for (const parcial of ['1', '15', '150', '1500', '15000', '150000', '1500000']) {
      escribir(canon()!, parcial)
      expect(canon(), `tras escribir ${parcial}`).not.toBeNull()
    }
    expect(canon()!.value).toBe('1500000')
  })
})
