/**
 * Salir del registro tiene que preguntar. Antes no había salida: la única era
 * cerrar la pestaña, y cerrarla no avisa que lo escrito se conserva.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock, back: vi.fn() }),
}))

import { SalirDelRegistro } from './SalirDelRegistro'

let container: HTMLDivElement
let root: Root

const clickPorTexto = (texto: string) => {
  const nodo = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === texto,
  )
  expect(nodo, `no encontré el botón "${texto}"`).toBeTruthy()
  act(() => {
    nodo!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  return nodo!
}

beforeEach(() => {
  replaceMock.mockClear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('<SalirDelRegistro>', () => {
  it('no sale de una: primero pregunta', () => {
    act(() => root.render(<SalirDelRegistro />))

    expect(document.body.textContent).not.toContain('¿Salir del registro?')
    clickPorTexto('Salir')
    expect(document.body.textContent).toContain('¿Salir del registro?')
    // Preguntar no es salir.
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('dice que lo escrito no se pierde, que es lo único que importa antes de irse', () => {
    act(() => root.render(<SalirDelRegistro />))
    clickPorTexto('Salir')
    expect(document.body.textContent).toContain('sigues')
  })

  it('«Seguir aquí» cierra el diálogo sin salir', () => {
    act(() => root.render(<SalirDelRegistro />))
    clickPorTexto('Salir')
    clickPorTexto('Seguir aquí')
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('confirmar suelta el borrador y manda a /auth', async () => {
    const onAntesDeSalir = vi.fn()
    act(() => root.render(<SalirDelRegistro onAntesDeSalir={onAntesDeSalir} />))
    clickPorTexto('Salir')

    // El segundo «Salir» es el del diálogo.
    const confirmar = Array.from(document.querySelectorAll('button')).filter(
      (b) => b.textContent?.trim() === 'Salir',
    )
    await act(async () => {
      confirmar[confirmar.length - 1].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onAntesDeSalir).toHaveBeenCalledTimes(1)
    expect(replaceMock).toHaveBeenCalledWith('/auth')
  })

  it('si limpiar el borrador falla, igual deja salir', async () => {
    const onAntesDeSalir = vi.fn(() => {
      throw new Error('localStorage bloqueado')
    })
    act(() => root.render(<SalirDelRegistro onAntesDeSalir={onAntesDeSalir} />))
    clickPorTexto('Salir')

    const confirmar = Array.from(document.querySelectorAll('button')).filter(
      (b) => b.textContent?.trim() === 'Salir',
    )
    await act(async () => {
      confirmar[confirmar.length - 1].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(replaceMock).toHaveBeenCalledWith('/auth')
  })
})

/**
 * Nico, 01-10-2026: «ese salir lo saca y lo deja en el login, y él necesita
 * editar la razón social; ahí deberíamos tener dos opciones, el devolverse…
 * y también la opción de salir por si se quiere salir del todo».
 */
describe('<SalirDelRegistro> con a dónde volver', () => {
  const volver = (onVolver = vi.fn()) => ({
    etiqueta: 'Volver a los datos de la inmobiliaria',
    descripcion: 'Ahí corriges la razón social.',
    onVolver,
  })

  it('ofrece volver Y salir del todo', () => {
    act(() => root.render(<SalirDelRegistro volver={volver()} />))
    clickPorTexto('Salir')

    expect(document.body.textContent).toContain('¿Qué quieres hacer?')
    expect(document.body.textContent).toContain('Volver a los datos de la inmobiliaria')
    expect(document.body.textContent).toContain('Salir del registro')
  })

  it('volver lleva al paso y NO cierra la sesión', () => {
    const onVolver = vi.fn()
    act(() => root.render(<SalirDelRegistro volver={volver(onVolver)} />))
    clickPorTexto('Salir')
    clickPorTexto('Volver a los datos de la inmobiliaria')

    expect(onVolver).toHaveBeenCalledTimes(1)
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('«Salir del registro» sigue mandando a /auth', async () => {
    act(() => root.render(<SalirDelRegistro volver={volver()} />))
    clickPorTexto('Salir')
    const salir = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Salir del registro',
    )!
    await act(async () => {
      salir.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(replaceMock).toHaveBeenCalledWith('/auth')
  })
})
