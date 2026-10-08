/**
 * PromesaCard — el cierre contra los pagos del back se ve sin abrir la
 * tarjeta (07-10-2026).
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { I18nProvider } from '@/lib/i18n'

import { PromesaCard, type Promesa } from './PromesaCard'

void React

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

function promesa(over: Partial<Promesa> = {}): Promesa {
  return {
    key: 'p1',
    debtorId: 'd1',
    inquilino: 'Ana',
    valorCop: 500000,
    fechaPrometida: '2026-10-07',
    registradaEn: '2026-10-01T15:00:00.000Z',
    estado: 'incumplida',
    quienLaHizo: 'Ana',
    canal: 'voz',
    mensajeOriginal: null,
    seguimiento: null,
    resultado: null,
    ...over,
  }
}

describe('<PromesaCard> con el cierre', () => {
  it('muestra la frase del cierre en la cabecera', () => {
    const frase = 'Incumplida: pagó $ 200.000 de $ 500.000 hasta el 14 oct 2026 (con 7 días de gracia). Sigue debiendo $ 300.000.'
    act(() => root.render(<I18nProvider><ul><PromesaCard promesa={promesa({ resultado: frase })} /></ul></I18nProvider>))
    expect(container.querySelector('[data-testid="promesa-cierre-p1"]')?.textContent).toBe(frase)
  })

  it('sin cierre no pinta nada de más', () => {
    act(() => root.render(<I18nProvider><ul><PromesaCard promesa={promesa()} /></ul></I18nProvider>))
    expect(container.querySelector('[data-testid="promesa-cierre-p1"]')).toBeNull()
  })
})
