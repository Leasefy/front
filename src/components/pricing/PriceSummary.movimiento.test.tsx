import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { MotionGlobalConfig } from 'framer-motion'

import type { Plan } from '@/lib/types/subscription'
import type { AppliedCoupon } from '@/lib/types/coupon'
import { PriceSummary } from './PriceSummary'

void React

/**
 * MOV-A6 (03-10-2026) · El resumen del checkout con su movimiento: la línea
 * del cupón ENTRA al aplicarlo y SALE (sigue montada mientras se va) al
 * quitarlo; el total cuenta hasta el nuevo precio.
 */

const plan = {
  id: 'pro',
  name: 'Pro',
  description: 'Plan de prueba',
  price: { monthly: 100000, yearly: 1000000 },
} as unknown as Plan

const cupon: AppliedCoupon = {
  code: 'DIEZ',
  type: 'PERCENTAGE',
  discount: 10,
  description: 'Diez por ciento',
}

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
  MotionGlobalConfig.skipAnimations = true
})

const pintar = (appliedCoupon: AppliedCoupon | null) =>
  act(() => {
    root.render(<PriceSummary plan={plan} billingCycle="monthly" appliedCoupon={appliedCoupon} />)
  })

const esperar = (ms: number) =>
  act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })

describe('<PriceSummary> — movimiento', () => {
  it('el total pasa al precio con el cupón (con las animaciones apagadas, de una)', () => {
    pintar(null)
    expect(container.textContent).toContain('100.000')
    pintar(cupon)
    expect(container.textContent).toContain('90.000')
    expect(container.textContent).toContain('Diez por ciento')
  })

  it('al quitar el cupón, su línea SALE animada y después se quita', async () => {
    pintar(cupon)
    expect(container.textContent).toContain('Diez por ciento')

    // Con las animaciones de verdad: la línea sigue montada mientras se va.
    MotionGlobalConfig.skipAnimations = false
    pintar(null)
    expect(container.textContent).toContain('Diez por ciento')

    await esperar(600)
    expect(container.textContent).not.toContain('Diez por ciento')
  })
})
