/** CONC-12 (QA de agentes 17-10): la línea que paga el arriendo de dos inquilinos. */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { ParDeLaLinea } from './ParDeLaLinea'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const par = {
  partes: [
    { contractId: 'v', tenantId: 't-v', tenantName: 'Valentina Restrepo Vasquez', propertyTitle: 'Apto 1', cuotaIds: ['v-11'], meses: ['2026-11'], valorCop: 1_700_000 },
    { contractId: 'm', tenantId: 't-m', tenantName: 'Mateo Cardona Acevedo', propertyTitle: 'Apto 2', cuotaIds: ['m-11'], meses: ['2026-11'], valorCop: 1_050_000 },
  ],
  porQue: ['La línea nombra a Valentina Restrepo Vasquez y a Mateo Cardona Acevedo.'],
}

describe('ParDeLaLinea', () => {
  it('muestra a los dos con su parte, dice por qué y concilia con un clic', () => {
    const onConciliar = vi.fn()
    act(() => root.render(<ParDeLaLinea movimientoId="m-1" par={par} deshabilitado={false} onConciliar={onConciliar} />))
    expect(host.textContent).toContain('Pago de 2 inquilinos')
    expect(host.textContent).toContain('Valentina Restrepo Vasquez')
    expect(host.textContent).toContain('Mateo Cardona Acevedo')
    expect(host.textContent).toContain('La línea nombra a')
    const boton = host.querySelector('[data-testid="conciliar-par-m-1"]') as HTMLButtonElement
    expect(boton.textContent).toContain('Conciliar con los 2')
    act(() => boton.click())
    expect(onConciliar).toHaveBeenCalledTimes(1)
  })

  it('sin permiso, el botón queda apagado', () => {
    act(() => root.render(<ParDeLaLinea movimientoId="m-1" par={par} deshabilitado onConciliar={() => {}} />))
    expect((host.querySelector('[data-testid="conciliar-par-m-1"]') as HTMLButtonElement).disabled).toBe(true)
  })
})
