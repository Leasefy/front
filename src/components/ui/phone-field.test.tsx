/**
 * El celular se escribe como la gente lo escribe: con espacios, con el +57
 * delante, pegado del portapapeles. El largo lo pone el país DESPUÉS de
 * limpiar; un `maxLength` del navegador cortaba antes y dejaba 8 dígitos
 * (encontrado probando en el navegador, 01-10-2026).
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act, useState } from 'react'
import { PhoneField } from './phone-field'

void React
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

function Campo() {
  const [v, setV] = useState('')
  return <PhoneField value={v} onChange={setV} />
}

function escribir(valor: string) {
  const input = container.querySelector('input') as HTMLInputElement
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(input, valor)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  return input.value
}

describe('<PhoneField>', () => {
  beforeEach(() => {
    act(() => root.render(<Campo />))
  })

  it('no le pone tope de caracteres al navegador: el tope es de dígitos', () => {
    expect(container.querySelector('input')?.hasAttribute('maxlength')).toBe(false)
  })

  it('con espacios quedan los 10 dígitos', () => {
    expect(escribir('300 123 4567')).toBe('3001234567')
  })

  it('pegado con el indicativo, se le quita el +57', () => {
    expect(escribir('+57 300 123 4567')).toBe('3001234567')
  })

  it('símbolos y letras no entran, y nunca pasa de 10', () => {
    expect(escribir('!@#$.   %^&*')).toBe('')
    expect(escribir('3001234567999')).toBe('3001234567')
  })
})
