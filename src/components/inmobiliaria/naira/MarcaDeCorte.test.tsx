/**
 * @vitest-environment happy-dom
 *
 * MarcaDeCorte — el corte en America/Bogota con su edad, fail-closed, y «DATO DE EJEMPLO» con datos de ejemplo (D13-8,
 * FG13-5, UI-SPEC §6.1). La máquina está en Bogotá: la prueba de zona pone el proceso en Tokio (P15).
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

import { MarcaDeCorte } from './MarcaDeCorte'
import { ProveedorDeOrigen } from './OrigenDeNaira'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const ASOF = '2026-10-05T11:15:00.000Z'
const MINUTO = 60_000
const HORA = 60 * MINUTO

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

function montar(asOf: string, ahora: Date, origen: 'agente' | 'ejemplo' = 'agente'): void {
  act(() => {
    root.render(
      <ProveedorDeOrigen origen={origen}>
        <MarcaDeCorte asOf={asOf} ahora={ahora} />
      </ProveedorDeOrigen>,
    )
  })
}

const texto = () => (container.textContent ?? '').replace(/\s+/g, ' ')

describe('<MarcaDeCorte>', () => {
  it('[N13:control-positivo] pinta el corte con su ISO, su time y la edad («hace 13 h»), en rótulo mono', () => {
    montar(ASOF, new Date('2026-10-06T00:15:00.000Z'))
    const marca = container.querySelector('[data-naira-asof]')
    expect(marca?.getAttribute('data-naira-asof')).toBe(ASOF)
    const tiempo = container.querySelector('time')
    expect(tiempo?.getAttribute('datetime')).toBe(ASOF)
    expect(tiempo?.getAttribute('aria-label')).toContain('hora de Colombia')
    expect(texto()).toContain('Corte')
    expect(texto()).toContain('hace 13 h')
    const clases = (marca?.getAttribute('class') ?? '').split(/\s+/)
    expect(clases).toContain('text-overline')
    expect(clases).toContain('tabular-nums')
    expect(clases).not.toContain('text-xs')
  })

  describe('en otra zona horaria', () => {
    let tzPrevio: string | undefined
    beforeAll(() => {
      tzPrevio = process.env.TZ
      process.env.TZ = 'Asia/Tokyo'
    })
    afterAll(() => {
      if (tzPrevio === undefined) delete process.env.TZ
      else process.env.TZ = tzPrevio
    })

    it('[N13:asof-bogota] con el proceso en Tokio el corte se escribe en hora de Colombia', () => {
      // Control: la zona del proceso cambió de verdad (en Bogotá esto daría 4).
      expect(new Date('2026-10-05T03:30:00.000Z').getDate()).toBe(5)
      montar('2026-10-05T03:30:00.000Z', new Date('2026-10-05T04:00:00.000Z'))
      expect(texto()).toContain('4 de oct')
      expect(texto()).toContain('10:30')
      expect(texto()).not.toContain('5 de oct')
    })
  })

  it('[N13:asof-edad] la edad baja a minutos, horas y días; un corte futuro es «hace menos de 1 min»', () => {
    const base = new Date(ASOF).getTime()
    const casos: [number, string][] = [
      [30 * 1000, 'hace menos de 1 min'],
      [20 * MINUTO, 'hace 20 min'],
      [13 * HORA, 'hace 13 h'],
      [3 * 24 * HORA, 'hace 3 d'],
      [-2 * HORA, 'hace menos de 1 min'],
    ]
    for (const [delta, esperado] of casos) {
      montar(ASOF, new Date(base + delta))
      expect(texto(), String(delta)).toContain(esperado)
      act(() => root.unmount())
      root = createRoot(container)
    }
  })

  it('[N13:asof-invalido] un corte sin fecha completa, vacío o en prosa no tiene marca y lo dice', () => {
    for (const malo of ['2026-10-05', '', 'ayer']) {
      montar(malo, new Date('2026-10-06T00:15:00.000Z'))
      expect(container.querySelector('[data-naira-asof]'), JSON.stringify(malo)).toBeNull()
      expect(container.querySelector('time'), JSON.stringify(malo)).toBeNull()
      expect(texto(), JSON.stringify(malo)).toContain('Dato sin corte: no lo mostramos')
      act(() => root.unmount())
      root = createRoot(container)
    }
  })

  it('[N13:simulado-visible] con datos de ejemplo dice DATO DE EJEMPLO, sin fecha', () => {
    montar(ASOF, new Date('2026-10-06T00:15:00.000Z'), 'ejemplo')
    expect(texto()).toContain('DATO DE EJEMPLO')
    expect(container.querySelector('time')).toBeNull()
    const marca = container.querySelector('[data-naira-asof]')
    expect(marca?.getAttribute('data-naira-ejemplo')).toBe('true')
    expect(marca?.getAttribute('data-naira-asof')).toBe(ASOF)
  })
})
