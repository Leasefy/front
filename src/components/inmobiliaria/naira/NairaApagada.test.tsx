/**
 * @vitest-environment happy-dom
 *
 * NairaApagada — Naira sin habilitar para la agencia (UI-SPEC §8.3): EmptyState con la copy del es.json REAL (FG13-17)
 * y sin CTA.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

import { NairaApagada } from './NairaApagada'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

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

function montar(): void {
  act(() => {
    root.render(<NairaApagada />)
  })
}

describe('<NairaApagada>', () => {
  it('[N13:control-positivo] dice que Naira no está activa y qué verá cuando se active', () => {
    montar()
    const caja = container.querySelector('[data-testid="naira-apagada"]')
    expect(caja).not.toBeNull()
    expect(caja?.textContent).toContain('Naira todavía no está activa para tu inmobiliaria')
    expect(caja?.textContent).toContain(
      'Cuando se active, aquí verás su briefing diario, lo que sigue de cerca y lo que te propone hacer.',
    )
  })

  it('[N13:apagada-sin-cta] no tiene botones ni enlaces', () => {
    montar()
    const caja = container.querySelector('[data-testid="naira-apagada"]')
    expect(caja).not.toBeNull()
    expect(caja?.querySelector('button')).toBeNull()
    expect(caja?.querySelector('a')).toBeNull()
  })
})
