/** T-0153 (A3): aviso no bloqueante cuando falta la regla de interés pedida por el archivo. */
import * as React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { AvisoDeReglaDeInteres } from './AvisoDeReglaDeInteres'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const container = document.createElement('div')
document.body.appendChild(container)
const root = createRoot(container)
afterEach(() => act(() => root.render(null)))

const pintar = (avisos?: Array<{ codigo: string; cuantos?: number }>) =>
  act(() => root.render(<AvisoDeReglaDeInteres avisos={avisos} />))

describe('AvisoDeReglaDeInteres', () => {
  it('sin el aviso del back no pinta nada', () => {
    pintar(undefined)
    expect(container.textContent).toBe('')
    pintar([{ codigo: 'otro_aviso' }])
    expect(container.textContent).toBe('')
  })

  it('dice cuántos contratos y qué hacer, como alerta y no como chip', () => {
    pintar([{ codigo: 'regla_de_interes_no_configurada', cuantos: 3 }])
    const a = container.querySelector('[data-testid="aviso-regla-de-interes"]')!
    expect(a.textContent).toContain('3 contratos')
    expect(a.textContent).toContain('configura la regla de interés de mora')
    expect(a.className).not.toMatch(/rounded-full/)
  })

  it('singular', () => {
    pintar([{ codigo: 'regla_de_interes_no_configurada', cuantos: 1 }])
    expect(container.textContent).toContain('1 contrato')
  })
})
