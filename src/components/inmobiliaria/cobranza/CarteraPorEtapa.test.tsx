/**
 * «Tu cartera» en UNA barra y UNA lista (Nico, 21-10-2026: «cosas que no
 * escalan en lectura»): sólo las etapas con casos llevan fila; las demás van
 * juntas en una línea; tocar una etapa abre sus deudores.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

import { CarteraPorEtapa } from './CarteraPorEtapa'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
function montar(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
}
const $ = (id: string) => document.querySelector(`[data-testid="${id}"]`)

afterEach(() => {
  if (root) act(() => root!.unmount())
  root = null
  document.body.innerHTML = ''
})

describe('CarteraPorEtapa', () => {
  it('con un caso: una fila (la de su etapa), la barra de un tramo y las demás en una línea', () => {
    montar(
      <CarteraPorEtapa
        etapas={[
          { stage: 'S0', count: 0, avgDaysInStage: 0, weeklyDelta: 0 },
          { stage: 'S3', count: 1, avgDaysInStage: 5, weeklyDelta: 1 },
        ]}
        onEtapa={() => {}}
      />,
    )
    expect(document.querySelectorAll('[data-testid^="cartera-etapa-"]')).toHaveLength(1)
    expect($('cartera-etapa-S3')?.textContent).toContain('Mora pre-jurídica')
    expect($('cartera-etapa-S3')?.textContent).toContain('5 días en promedio')
    expect($('cartera-barra')?.querySelectorAll('[data-etapa]')).toHaveLength(1)
    expect($('cartera-sin-casos')?.textContent).toContain('Pre-vencimiento')
    expect($('cartera-sin-casos')?.textContent).not.toContain('pre-jurídica')
    expect($('cartera-por-etapa')?.textContent).toContain('1 caso en cobranza')
  })

  it('cada tramo de la barra mide su parte del total', () => {
    montar(
      <CarteraPorEtapa
        etapas={[
          { stage: 'S1', count: 3 },
          { stage: 'S5', count: 1 },
        ]}
        onEtapa={() => {}}
      />,
    )
    const tramos = Array.from($('cartera-barra')!.querySelectorAll<HTMLElement>('[data-etapa]'))
    expect(tramos.map((t) => t.style.width)).toEqual(['75%', '25%'])
  })

  it('sin casos lo dice en una línea, sin barra ni lista', () => {
    montar(<CarteraPorEtapa etapas={[{ stage: 'S1', count: 0 }]} onEtapa={() => {}} />)
    expect($('cartera-por-etapa-vacia')?.textContent).toContain('Nadie en cobranza')
    expect($('cartera-barra')).toBeNull()
  })

  it('tocar una etapa abre sus deudores', () => {
    const onEtapa = vi.fn()
    montar(<CarteraPorEtapa etapas={[{ stage: 'S2', count: 4 }]} onEtapa={onEtapa} />)
    act(() => ($('cartera-etapa-S2') as HTMLButtonElement).click())
    expect(onEtapa).toHaveBeenCalledWith('S2')
  })

  it('el cambio de la semana sólo aparece si cambió', () => {
    montar(<CarteraPorEtapa etapas={[{ stage: 'S2', count: 4, weeklyDelta: 0 }]} onEtapa={() => {}} />)
    expect($('cartera-etapa-S2')?.textContent).not.toMatch(/[+−-]\d/)
  })
})
