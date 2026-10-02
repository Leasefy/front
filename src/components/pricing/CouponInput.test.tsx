import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

/**
 * 02-10-2026 · Validar un cupón con el sistema de errores. Antes un fallo
 * pintaba `err.message` crudo («Error interno del servidor.», «Failed to
 * fetch») en un `<p>` hecho a mano.
 */

const { validateCouponMock } = vi.hoisted(() => ({ validateCouponMock: vi.fn() }))
vi.mock('@/lib/api/subscriptions.service', () => ({
  subscriptionsApi: { validateCoupon: (...a: unknown[]) => validateCouponMock(...a) },
}))

import { ApiError } from '@/lib/api/client'
import { CouponInput } from './CouponInput'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  validateCouponMock.mockReset()
  act(() => {
    root.render(<CouponInput planId="pro" price={149_000} appliedCoupon={null} onApplyCoupon={vi.fn()} />)
  })
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function aplicar(codigo: string) {
  const input = container.querySelector('#coupon-code') as HTMLInputElement
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(input, codigo)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  const boton = [...container.querySelectorAll('button')].find((b) => b.textContent?.includes('Aplicar'))!
  await act(async () => {
    boton.click()
    await Promise.resolve()
  })
  return input
}

describe('CouponInput — errores', () => {
  it('🔴 un 5xx dice que fue nuestro, con la referencia, bajo el campo', async () => {
    validateCouponMock.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', { referencia: 'ab12cd34' }),
    )
    const input = await aplicar('VERANO20')
    const aviso = container.querySelector('#coupon-code-error')
    expect(aviso?.textContent).toMatch(/^No pudimos verificar el cupón: algo falló de nuestro lado/)
    expect(aviso?.textContent).toContain('ab12cd34')
    expect(aviso?.textContent).not.toMatch(/conexi[oó]n/)
    expect(input.getAttribute('aria-describedby')).toBe('coupon-code-error')
    expect(input.getAttribute('aria-invalid')).toBe('true')
  })

  it('sin respuesta (la red): ahí sí se habla de la conexión', async () => {
    validateCouponMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await aplicar('VERANO20')
    expect(container.querySelector('#coupon-code-error')?.textContent).toMatch(/conexión/)
  })

  it('un cupón que no vale dice el motivo del back', async () => {
    validateCouponMock.mockResolvedValue({ valid: false, error: 'El cupón ya venció.' })
    await aplicar('VIEJO')
    expect(container.querySelector('#coupon-code-error')?.textContent).toBe('El cupón ya venció.')
  })
})
