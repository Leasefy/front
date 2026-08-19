/**
 * AnimatedAmount.test.tsx — la cifra del héroe: la copia visible lleva el
 * símbolo pegado («$519.853.230»), la copia `sr-only` conserva el texto exacto
 * del escalar («$ 519.853.230») y ninguna de las dos puede partirse.
 */

import * as React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

void React // jsx-preserve

import { AnimatedAmount, glueCurrencySymbol } from './AnimatedAmount'

describe('glueCurrencySymbol', () => {
  it('pega el símbolo a la cifra (espacio normal o NBSP)', () => {
    expect(glueCurrencySymbol('$ 519.853.230')).toBe('$519.853.230')
    expect(glueCurrencySymbol('$ 519.853.230')).toBe('$519.853.230')
  })

  it('no toca lo que ya está pegado ni lo que no es plata', () => {
    expect(glueCurrencySymbol('$519.853.230')).toBe('$519.853.230')
    expect(glueCurrencySymbol('80 %')).toBe('80 %')
    expect(glueCurrencySymbol('$ —')).toBe('$ —')
  })
})

describe('AnimatedAmount', () => {
  let root: Root | null = null
  let host: HTMLDivElement | null = null

  afterEach(() => {
    act(() => root?.unmount())
    host?.remove()
    root = null
    host = null
  })

  it('copia visible pegada + sr-only exacta, las dos sin partir', () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => {
      root?.render(<AnimatedAmount value={519853230} text="$ 519.853.230" />)
    })
    const visible = host.querySelector('[data-count-up]')
    const sr = host.querySelector('.sr-only')
    expect(visible?.getAttribute('aria-hidden')).toBe('true')
    expect(visible?.className).toContain('whitespace-nowrap')
    expect(sr?.textContent).toBe('$ 519.853.230')
    // El count-up escribe `textContent` por frame; al terminar (o sin motion)
    // queda el texto pegado. En happy-dom no hay rAF real: basta con que el
    // marcado inicial ya salga pegado.
    expect(host.textContent).toContain('$519.853.230')
  })
})
