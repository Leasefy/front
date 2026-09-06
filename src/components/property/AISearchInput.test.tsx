/**
 * AISearchInput — la barra de búsqueda en lenguaje natural del catálogo.
 * Lo que fija: Enter busca con el texto recortado, vacío no busca, el ✕ limpia
 * y avisa, y mientras interpreta el campo no acepta otra búsqueda.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

import { AISearchInput } from './AISearchInput'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

function montar(props: Partial<React.ComponentProps<typeof AISearchInput>> = {}) {
  const base = { value: '', onChange: vi.fn(), onMagnifyingGlass: vi.fn(), ...props }
  act(() => {
    root.render(<AISearchInput {...base} />)
  })
  return base
}

const campo = () => container.querySelector('input[aria-label="Búsqueda inteligente de propiedades"]') as HTMLInputElement

describe('<AISearchInput>', () => {
  it('Enter busca con el texto recortado', () => {
    const p = montar({ value: '  apto en laureles  ' })
    act(() => {
      campo().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(p.onMagnifyingGlass).toHaveBeenCalledWith('apto en laureles')
  })

  it('vacío no busca y el botón está deshabilitado', () => {
    const p = montar({ value: '   ' })
    const boton = container.querySelector('button[aria-label="Buscar"]') as HTMLButtonElement
    expect(boton.disabled).toBe(true)
    act(() => {
      campo().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(p.onMagnifyingGlass).not.toHaveBeenCalled()
  })

  it('el ✕ aparece con texto, limpia y avisa', () => {
    const onClear = vi.fn()
    const p = montar({ value: 'casa', onClear })
    const limpiar = container.querySelector('button[aria-label="Limpiar búsqueda"]') as HTMLButtonElement
    expect(limpiar).toBeTruthy()
    act(() => {
      limpiar.click()
    })
    expect(p.onChange).toHaveBeenCalledWith('')
    expect(onClear).toHaveBeenCalled()
  })

  it('sin texto no hay ✕', () => {
    montar({ value: '' })
    expect(container.querySelector('button[aria-label="Limpiar búsqueda"]')).toBeNull()
  })

  it('mientras interpreta, el campo se bloquea y el aviso cambia', () => {
    const p = montar({ value: 'casa', isMagnifyingGlassing: true })
    expect(campo().disabled).toBe(true)
    expect(container.textContent).toContain('Interpretando')
    act(() => {
      campo().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(p.onMagnifyingGlass).not.toHaveBeenCalled()
  })

  it('lleva la chispa del DS como firma de IA', () => {
    montar()
    // Phosphor pinta un <svg>; el contenedor de la teja lleva el tinte suave.
    expect(container.querySelector('[data-testid="ai-search"] svg')).toBeTruthy()
    expect(container.textContent).toContain('Pulsa Enter para buscar')
  })
})
