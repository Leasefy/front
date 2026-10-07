/**
 * QA-IA-A (04-10-2026), medido a 1440 px: en la columna central del detalle la
 * tarjeta medía ~155 px; la píldora «1101ms» se comía el nombre de la
 * aseguradora y la prima (con `stat-number`, text-7xl) se salía: «$ 54».
 */
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

void React

vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k.split('.').pop() }) }))

import { CarrierCard } from './CarrierCard'

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

describe('CarrierCard', () => {
  it('dice el nombre de la aseguradora (con mayúscula), sin la píldora de milisegundos ni la clase gigante', () => {
    act(() =>
      root.render(
        <CarrierCard
          carrier={{ carrier: 'sura', status: 'approved', primaMensualCop: 54_600, condiciones: ['Ratio ingreso/canon ≥ 2x'], motivoRechazo: null, latencyMs: 1101, isStub: true, startedAtMs: 0 }}
        />,
      ),
    )
    expect(container.textContent).toContain('Sura')
    expect(container.textContent).not.toContain('1101')
    expect(container.querySelector('.stat-number')).toBeNull()
  })
})
