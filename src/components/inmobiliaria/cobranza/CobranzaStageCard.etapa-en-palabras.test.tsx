/**
 * QA-IA-95 (05-10-2026, IA-B-09): la tarjeta de etapa de Cobranza decía
 * «Mora administrativa · S2 · 16–45 días · 1 días promedio» al lado de «Los que
 * más pesan» con 34 y 65 días de MORA: el número son días EN LA ETAPA, el «1
 * días» está mal dicho y el código «S2» no le dice nada a la inmobiliaria.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
void React

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

import { CobranzaStageCard } from './CobranzaStageCard'

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

function pintar(avgDaysInStage: number) {
  act(() =>
    root.render(
      <CobranzaStageCard stage="S2" count={3} avgDaysInStage={avgDaysInStage} weeklyDelta={0} onStageClick={() => {}} isLoading={false} />,
    ),
  )
  return container.textContent ?? ''
}

describe('CobranzaStageCard en palabras (QA-IA-95, IA-B-09)', () => {
  it('dice «1 día en la etapa, en promedio», no «1 días promedio»', () => {
    const t = pintar(1.2)
    expect(t).toContain('1 día en la etapa, en promedio')
    expect(t).not.toMatch(/días promedio/)
  })

  it('en plural con más de un día', () => {
    expect(pintar(6.6)).toContain('7 días en la etapa, en promedio')
  })

  it('sin el código crudo de la etapa; el nombre y el rango de mora sí', () => {
    const t = pintar(3)
    expect(t).not.toMatch(/\bS2\b/)
    expect(t).toContain('Mora administrativa')
    expect(t).toContain('16–45 días')
  })
})
