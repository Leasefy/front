/**
 * SidebarThemeToggle — segmentado claro/oscuro del pie del sidebar.
 *
 * Lo que se fija acá:
 *  · cada opción es un destino explícito (`setTheme('light'|'dark')`), no un
 *    "invertí lo que haya" — así el botón hace lo que dice aunque el tema
 *    venga de `system`;
 *  · `system` se resuelve al valor real vía `resolvedTheme`;
 *  · el rail colapsado sí alterna, porque solo hay lugar para un botón.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { SidebarThemeToggle } from './SidebarThemeToggle'

// react-dom/client needs this flag to recognize our act() wrapping.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const setTheme = vi.fn()
let resolvedTheme: string | undefined = 'light'

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme, setTheme }),
}))

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  resolvedTheme = 'light'
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

function render(props: { collapsed?: boolean } = {}) {
  act(() => {
    root.render(<SidebarThemeToggle {...props} />)
  })
}

const boton = (label: string) =>
  container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)

describe('SidebarThemeToggle', () => {
  it('marca como activa la opción que corresponde al tema resuelto', () => {
    resolvedTheme = 'dark'
    render()
    expect(boton('Tema oscuro')?.getAttribute('aria-pressed')).toBe('true')
    expect(boton('Tema claro')?.getAttribute('aria-pressed')).toBe('false')
  })

  it('resuelve `system` al valor real en vez de tratarlo como un tercer estado', () => {
    // next-themes ya resuelve system → resolvedTheme; el componente no debe
    // inventar un estado intermedio ni dejar las dos opciones apagadas.
    resolvedTheme = 'dark'
    render()
    const activos = Array.from(container.querySelectorAll('button')).filter(
      (b) => b.getAttribute('aria-pressed') === 'true',
    )
    expect(activos).toHaveLength(1)
  })

  it('cada opción pide SU tema, no el opuesto al actual', () => {
    resolvedTheme = 'dark'
    render()
    act(() => boton('Tema oscuro')!.click())
    // Ya está en oscuro: pedir oscuro debe seguir pidiendo 'dark' (idempotente),
    // nunca alternar a claro.
    expect(setTheme).toHaveBeenCalledWith('dark')
  })

  it('cambia a claro al elegir la opción clara', () => {
    resolvedTheme = 'dark'
    render()
    act(() => boton('Tema claro')!.click())
    expect(setTheme).toHaveBeenCalledWith('light')
  })

  it('colapsado ofrece un único botón que alterna al tema contrario', () => {
    resolvedTheme = 'dark'
    render({ collapsed: true })
    const botones = container.querySelectorAll('button')
    expect(botones).toHaveLength(1)
    act(() => botones[0].click())
    expect(setTheme).toHaveBeenCalledWith('light')
  })

  it('expone el grupo con nombre accesible', () => {
    render()
    const grupo = container.querySelector('[role="group"]')
    expect(grupo?.getAttribute('aria-label')).toBe('Tema de la interfaz')
  })
})
