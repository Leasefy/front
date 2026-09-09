/**
 * «Completa esto para poder crearlo» no puede desaparecer mientras se escribe.
 * Nico (2026-09-02): «pone una letra ahí en ese de error y de una lo quita y
 * queda siempre con una sola letra». La sección pintaba SÓLO lo que faltaba,
 * y el campo dejaba de faltar con la primera letra → el input se desmontaba.
 *
 * 🔴 El ejemplo era «Barrio». Desde el 2026-09-09 el barrio ya no bloquea
 * (Nico: «el área, los baños… ellos muchas veces no traen esto»), así que el
 * caso se prueba con la DIRECCIÓN, que sí sigue siendo obligatoria y es del
 * mismo tipo. La regla que se congela no cambió; cambió qué campo la ejerce.
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

const campoDireccion = () =>
  container.querySelector<HTMLInputElement>('[data-testid="falta-propertyAddress-0"]')

describe('AISuggestionCard — completar lo que falta', () => {
  it('el campo obligatorio sigue en pantalla letra por letra hasta la palabra completa', () => {
    const vista = montar(base({ propertyAddress: '' }))
    expect(campoDireccion()).not.toBeNull()

    escribir(campoDireccion()!, 'C')
    // Con una letra ya no «falta» — pero el input tiene que seguir ahí.
    expect(vista.property.propertyAddress).toBe('C')
    expect(campoDireccion()).not.toBeNull()
    expect(campoDireccion()!.getAttribute('aria-invalid')).toBeNull()

    escribir(campoDireccion()!, 'Cr')
    escribir(campoDireccion()!, 'Cra 20 #1E 165')
    expect(vista.property.propertyAddress).toBe('Cra 20 #1E 165')
    expect(campoDireccion()!.value).toBe('Cra 20 #1E 165')
  })

  it('cuando ya no falta nada la sección lo dice en verde, y si se borra vuelve a reclamar', () => {
    const vista = montar(base({ propertyAddress: '' }))
    const seccion = () => container.querySelector('[data-testid="completar-0"]')!
    expect(seccion().textContent).toContain('Completa esto para poder crearlo')

    escribir(campoDireccion()!, 'Cra 20 #1E 165')
    expect(vista.property.hasErrors).toBe(false)
    expect(seccion().textContent).toContain('Listo, ya se puede crear')
    expect(seccion().getAttribute('data-completo')).toBe('true')

    escribir(campoDireccion()!, '')
    expect(seccion().textContent).toContain('Completa esto para poder crearlo')
    expect(campoDireccion()!.getAttribute('aria-invalid')).toBe('true')
  })

  /**
   * 🔴 El caso de Nico: su archivo real trae dirección, ciudad y canon, y nada
   * más. Antes esa fila salía en rojo con «Falta baños. Mínimo 1» y «Falta
   * área. Mínimo 10 m²», y no se podía seguir sin inventar los dos números.
   */
  it('sin baños, área ni barrio la tarjeta no pide nada: se puede crear', () => {
    montar(
      base({
        propertyZone: '',
        bathrooms: undefined,
        propertyArea: undefined,
        hasErrors: false,
      }),
    )

    expect(container.querySelector('[data-testid="completar-0"]')).toBeNull()
    expect(container.textContent).not.toContain('Completa esto para poder crearlo')

    // Sin errores ni sugerencias la tarjeta nace plegada — que es justo la
    // señal de que ya no hay nada que resolver ahí.
    act(() => {
      container.querySelector<HTMLButtonElement>('[aria-label="Expandir"]')!.click()
    })

    // Pero siguen siendo editables para quien SÍ tiene el dato: opcional no
    // quiere decir que desaparezcan del formulario.
    act(() => {
      container
        .querySelector<HTMLButtonElement>('[data-testid="editar-todo-0"]')!
        .click()
    })
    expect(container.querySelector('[data-testid="campo-propertyArea-0"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="campo-bathrooms-0"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="campo-propertyZone-0"]')).not.toBeNull()
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
