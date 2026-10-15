/**
 * @vitest-environment happy-dom
 *
 * CompositorDePregunta — donde se escribe la pregunta para Naira (13-06, Tarea 3; P10, UI-SPEC §7.7, §10.1, §11.2).
 *
 * Qué prueba: «Enviar pregunta» es visible y su propio nombre accesible; Enter envía, Shift+Enter no y durante la
 * composición IME tampoco; vacío no envía; mientras responde el botón se deshabilita y el campo queda de solo lectura; el
 * contador aparece desde 1800 con el máximo del contrato; con datos de ejemplo se sigue enviando. Marcador en el TÍTULO.
 */

import * as React from 'react'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

import { CompositorDePregunta } from './CompositorDePregunta'
import { ProveedorDeOrigen } from './OrigenDeNaira'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const onEnviar = vi.fn()

function Envoltorio({ ocupado = false }: { readonly ocupado?: boolean }) {
  const [valor, setValor] = useState('')
  return <CompositorDePregunta valor={valor} onCambiar={setValor} onEnviar={onEnviar} ocupado={ocupado} />
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  onEnviar.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function montar(nodo: React.ReactNode) {
  act(() => {
    root.render(nodo)
  })
}

const campo = () => container.querySelector('textarea')!
const boton = () => container.querySelector('button[type="submit"]') as HTMLButtonElement

function escribir(texto: string) {
  const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  act(() => {
    set.call(campo(), texto)
    campo().dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function tecla(init: KeyboardEventInit) {
  act(() => {
    campo().dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }))
  })
}

function clic() {
  act(() => boton().click())
}

describe('CompositorDePregunta', () => {
  it('[N13:control-positivo] escribir y hacer clic en Enviar pregunta envía el texto', () => {
    montar(<Envoltorio />)
    escribir('Hola (ejemplo)')
    clic()
    expect(onEnviar).toHaveBeenCalledTimes(1)
    expect(onEnviar).toHaveBeenCalledWith('Hola (ejemplo)')
  })

  it('[N13:enviar-visible] el botón dice Enviar pregunta sin aria-label, el campo tiene su label y se ven los atajos', () => {
    montar(<Envoltorio />)
    expect(boton().textContent).toBe('Enviar pregunta')
    expect(boton().hasAttribute('aria-label')).toBe(false)
    expect(boton().querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    const id = campo().id
    expect(id).not.toBe('')
    const label = container.querySelector(`label[for="${id}"]`)
    expect(label?.textContent).toBe('Tu pregunta para Naira')
    expect(campo().getAttribute('placeholder')).toBe('Pregúntale a Naira por una métrica…')
    expect(container.textContent).toContain('Enter envía · Shift+Enter nueva línea')
  })

  it('[N13:enter-envia] Enter envía recortado; Shift+Enter y la composición IME no', () => {
    montar(<Envoltorio />)
    escribir('  una pregunta (ejemplo)  ')
    tecla({ key: 'Enter', shiftKey: true })
    tecla({ key: 'Enter', isComposing: true })
    expect(onEnviar).not.toHaveBeenCalled()
    tecla({ key: 'Enter' })
    expect(onEnviar).toHaveBeenCalledTimes(1)
    expect(onEnviar).toHaveBeenCalledWith('una pregunta (ejemplo)')
  })

  it('[N13:no-envia-vacio] con solo espacios el botón está deshabilitado y Enter no envía', () => {
    montar(<Envoltorio />)
    escribir('   ')
    expect(boton().disabled).toBe(true)
    tecla({ key: 'Enter' })
    clic()
    expect(onEnviar).not.toHaveBeenCalled()
  })

  it('[N13:ocupado] mientras responde, el botón se deshabilita y el campo queda de solo lectura (no deshabilitado)', () => {
    montar(<Envoltorio ocupado />)
    escribir('una pregunta (ejemplo)')
    expect(boton().disabled).toBe(true)
    expect(campo().readOnly).toBe(true)
    expect(campo().disabled).toBe(false)
    tecla({ key: 'Enter' })
    clic()
    expect(onEnviar).not.toHaveBeenCalled()
  })

  it('[N13:contador] el contador aparece desde 1800 caracteres y el máximo es el del contrato', () => {
    montar(<Envoltorio />)
    escribir('x'.repeat(1799))
    expect(container.querySelector('[data-naira-contador]')).toBeNull()
    escribir('x'.repeat(1800))
    expect(container.querySelector('[data-naira-contador]')?.textContent).toBe('Te quedan 200 caracteres')
    expect(campo().maxLength).toBe(2000)
  })

  it('[N13:ejemplo-envio-habilitado] con datos de ejemplo se sigue pudiendo enviar', () => {
    montar(
      <ProveedorDeOrigen origen="ejemplo">
        <Envoltorio />
      </ProveedorDeOrigen>,
    )
    escribir('una pregunta (ejemplo)')
    expect(boton().disabled).toBe(false)
    clic()
    expect(onEnviar).toHaveBeenCalledTimes(1)
  })
})
