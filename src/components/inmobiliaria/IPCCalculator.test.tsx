/**
 * Calculadora de IPC — el resultado se calcula en vivo, la tasa propia avisa
 * si supera la ley y la tendencia es un gráfico con los doce meses.
 * Nico (2026-09-03): «calcular el incremento no sirve», «esa tendencia no se
 * entiende», «todo en scroll es muy jodido».
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, unknown>) => {
      const base = k.split('.').pop() as string
      return p ? `${base}(${Object.values(p).join(',')})` : base
    },
    locale: 'es',
    formatDate: (d: Date) => d.toISOString().slice(0, 10),
  }),
}))

import {
  IPCCalculator,
  escalaDelEje,
  fechaLocal,
  parsearCanon,
  parsearTasa,
  primerDiaDelMesQueViene,
} from './IPCCalculator'
import { IPC_HISTORICAL, getCurrentIPC } from '@/lib/constants/inmobiliaria-data'

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function escribir(el: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(el, valor)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('helpers', () => {
  it('parsearCanon sólo mira los dígitos y rechaza el cero', () => {
    expect(parsearCanon('2.500.000')).toBe(2500000)
    expect(parsearCanon('$ 1,200,000')).toBe(1200000)
    expect(parsearCanon('')).toBeNull()
    expect(parsearCanon('0')).toBeNull()
  })
  it('parsearTasa acepta coma o punto y rechaza lo que no es número', () => {
    expect(parsearTasa('5,10')).toBe(5.1)
    expect(parsearTasa('5.10')).toBe(5.1)
    expect(parsearTasa('abc')).toBeNull()
    expect(parsearTasa('-1')).toBeNull()
  })
  it('primerDiaDelMesQueViene no inventa el mes 13', () => {
    expect(primerDiaDelMesQueViene(new Date(2026, 11, 15))).toBe('2027-01-01')
    expect(primerDiaDelMesQueViene(new Date(2026, 8, 3))).toBe('2026-10-01')
  })
  it('fechaLocal no corre la fecha un día por la zona horaria', () => {
    const d = fechaLocal('2026-10-01')!
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 1])
    expect(fechaLocal('nada')).toBeNull()
  })
  it('escalaDelEje elige un paso lindo con a lo sumo cinco tramos', () => {
    const e = escalaDelEje([4.82, 5.51, 5.1])
    expect(e.paso).toBe(0.25)
    expect(e.min).toBeLessThanOrEqual(4.82)
    expect(e.max).toBeGreaterThanOrEqual(5.51)
    expect((e.max - e.min) / e.paso).toBeLessThanOrEqual(5)
  })
})

describe('IPCCalculator', () => {
  it('la tabla del IPC arranca en el diciembre más reciente y trae 12 meses del año', () => {
    const vigente = getCurrentIPC()
    expect(vigente.month).toBe(12)
    const serie = IPC_HISTORICAL.slice(0, 12)
    expect(new Set(serie.map((r) => r.year)).size).toBe(1)
    expect(serie.map((r) => r.month)).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
  })

  it('sin canon dice qué falta; con canon calcula en vivo, sin botón', () => {
    act(() => root.render(<IPCCalculator />))
    expect(container.querySelector('[data-testid="ipc-resultado-vacio"]')?.textContent).toBe('emptyHint')
    expect(container.querySelector('button[type="submit"]')).toBeNull()

    const canon = container.querySelector<HTMLInputElement>('[data-testid="ipc-canon"]')!
    escribir(canon, '2500000')
    expect(canon.value).toBe('2.500.000')
    const rate = getCurrentIPC().rate
    const esperado = Math.round(2500000 * (1 + rate / 100))
    expect(container.querySelector('[data-testid="ipc-nuevo-canon"]')?.textContent).toBe(
      '$' + new Intl.NumberFormat('es-CO').format(esperado),
    )
    expect(container.querySelector('[data-testid="ipc-incremento"]')?.textContent).toContain(
      '$' + new Intl.NumberFormat('es-CO').format(esperado - 2500000),
    )
    expect(container.querySelector('[data-testid="ipc-rige-desde"]')?.textContent).toMatch(/^\d{4}-\d{2}-01$/)
  })

  it('la tasa personalizada por encima de la oficial avisa que la ley no lo permite', () => {
    act(() => root.render(<IPCCalculator currentRent={1000000} />))
    const chip = container.querySelector<HTMLButtonElement>('[data-testid="ipc-personalizar"]')!
    act(() => chip.click())
    const tasa = container.querySelector<HTMLInputElement>('[data-testid="ipc-tasa"]')!
    escribir(tasa, '9,5')
    expect(container.querySelector('[data-testid="ipc-tasa-aviso"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="ipc-nuevo-canon"]')?.textContent).toBe('$1.095.000')

    escribir(tasa, 'abc')
    expect(container.querySelector('[data-testid="ipc-resultado-vacio"]')?.textContent).toBe('invalidRate')
  })

  it('la tendencia es un gráfico con las doce barras, sus valores y sus meses', () => {
    act(() => root.render(<IPCCalculator />))
    const svg = container.querySelector('[data-testid="ipc-grafico"]')!
    const barras = svg.querySelectorAll('g[data-mes]')
    expect(barras.length).toBe(12)
    expect(svg.querySelectorAll('g[data-vigente]').length).toBe(1)
    const ultima = barras[11]!
    expect(ultima.getAttribute('data-mes')).toBe('12')
    expect(ultima.textContent).toContain('Dic')
    expect(ultima.textContent).toContain(getCurrentIPC().rate.toFixed(2).replace('.', ','))
    // Eje con valores: al menos dos líneas de referencia rotuladas.
    expect(svg.querySelectorAll('line').length).toBeGreaterThanOrEqual(2)
  })

  it('el enlace al DANE es un enlace real que abre en otra pestaña', () => {
    act(() => root.render(<IPCCalculator />))
    const a = container.querySelector<HTMLAnchorElement>('[data-testid="ipc-link-dane"]')!
    expect(a.getAttribute('href')).toMatch(/^https:\/\/www\.dane\.gov\.co\//)
    expect(a.getAttribute('target')).toBe('_blank')
  })
})
