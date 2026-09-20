/**
 * @vitest-environment happy-dom
 *
 * 🔴 La franja de chips de «Inmuebles», que antes no tenía prueba ninguna.
 *
 * El 19-09, abriendo la pantalla en un navegador por primera vez: arriba decía
 * «133 Total» y las cuatro fichas de al lado sumaban 109. El chip «Arrendado»
 * mostraba 104 mientras la ficha «Arrendadas» decía 105, sobre los mismos
 * datos. Lo que fija este archivo es que el número y el filtro sean el MISMO
 * control, y que los cinco cajones se puedan conciliar a ojo contra «Todos».
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

import { ConsignacionFilters, type ConsignacionFiltersState } from './ConsignacionFilters'
import type { CajonDelInmueble } from '@/lib/inmobiliaria/cajon-del-inmueble'

const FILTROS: ConsignacionFiltersState = {
  search: '',
  cajon: 'all',
  agenteId: 'all',
  propietarioId: 'all',
  city: 'all',
  propertyType: 'all',
}

const CONTEO: Record<CajonDelInmueble, number> = {
  disponible: 3,
  arrendado: 105,
  enProceso: 0,
  mantenimiento: 0,
  sinMandato: 25,
}

let container: HTMLDivElement
let root: Root

function montar(props: Partial<React.ComponentProps<typeof ConsignacionFilters>> = {}) {
  act(() => {
    root.render(
      <ConsignacionFilters
        filters={FILTROS}
        onFiltersChange={vi.fn()}
        consignaciones={[]}
        propietarios={[]}
        agentes={[]}
        conteo={CONTEO}
        total={133}
        {...props}
      />,
    )
  })
}

const chip = (cajon: string) =>
  container.querySelector(`[data-testid="cajon-${cajon}"]`) as HTMLElement | null

const numero = (cajon: string) =>
  Number((chip(cajon)?.textContent ?? '').replace(/\D/g, ''))

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('la franja de cajones de Inmuebles', () => {
  it('hay un chip por cajón, más «Todos»: ninguna fila se queda sin dónde mirarse', () => {
    montar()
    for (const cajon of ['all', 'disponible', 'arrendado', 'enProceso', 'mantenimiento', 'sinMandato']) {
      expect(chip(cajon)).not.toBeNull()
    }
  })

  it('🔴 el número va EN el chip, y los cinco suman «Todos»', () => {
    montar()
    const suma =
      numero('disponible') +
      numero('arrendado') +
      numero('enProceso') +
      numero('mantenimiento') +
      numero('sinMandato')
    expect(suma).toBe(numero('all'))
    expect(numero('all')).toBe(133)
  })

  it('🔴 «Sin mandato» existe: son 25 inmuebles que no estaban en ningún número', () => {
    montar()
    expect(numero('sinMandato')).toBe(25)
  })

  it('🔴 sin conteo los chips NO dicen 0: siguen ahí, sin afirmar nada', () => {
    montar({ conteo: null, total: null })
    expect(chip('arrendado')).not.toBeNull()
    for (const cajon of ['all', 'disponible', 'arrendado', 'sinMandato']) {
      expect(/\d/.test(chip(cajon)!.textContent ?? '')).toBe(false)
    }
  })

  it('tocar un chip cambia el cajón, no la disponibilidad cruda', () => {
    const onFiltersChange = vi.fn()
    montar({ onFiltersChange })
    act(() => {
      chip('sinMandato')!.click()
    })
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ cajon: 'sinMandato' }),
    )
  })

  it('el chip del cajón elegido se ve distinto de los demás', () => {
    montar({ filters: { ...FILTROS, cajon: 'arrendado' } })
    // No se fija la clase exacta —es del design system—, sino que el elegido
    // NO se pinte igual que sus vecinos: si se pintaran igual, la franja no
    // diría cuál filtro está puesto.
    expect(chip('arrendado')!.className).not.toBe(chip('disponible')!.className)
    expect(chip('all')!.className).toBe(chip('disponible')!.className)
  })
})
