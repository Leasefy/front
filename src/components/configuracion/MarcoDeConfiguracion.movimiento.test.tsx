import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { Gear, Users } from '@phosphor-icons/react'

void React

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

import { MarcoDeConfiguracion, type GrupoDeEntradas } from './MarcoDeConfiguracion'

/**
 * MOV-A6 (03-10-2026) · El marco de Configuración con su movimiento: la marca
 * de la sección activa es UNA y se mueve a la nueva (`MotionIndicator`), y la
 * sección nueva se vuelve a montar (entra con su transición) sin que cambie el
 * marcado de los enlaces.
 */

const menu: GrupoDeEntradas[] = [
  {
    id: 'cuenta',
    label: 'Cuenta',
    entradas: [
      { id: 'perfil', href: '/c/perfil', label: 'Perfil', desc: 'Tus datos', icon: Gear },
      { id: 'equipo', href: '/c/equipo', label: 'Equipo', desc: 'Tu gente', icon: Users },
    ],
  },
]

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

let montajes = 0
function Contenido({ id }: { id: string }) {
  React.useEffect(() => {
    montajes += 1
  }, [])
  return <p data-testid="contenido">{id}</p>
}

const pintar = (activaId: string) =>
  act(() => {
    root.render(
      <MarcoDeConfiguracion titulo="Configuración" subtitulo="Todo" navAria="Secciones" menu={menu} activaId={activaId}>
        <Contenido id={activaId} />
      </MarcoDeConfiguracion>,
    )
  })

const marcas = () => [...container.querySelectorAll('[data-indicador-de-la-activa]')]
const enlaceDeLaMarca = () => marcas()[0]?.closest('a')?.getAttribute('href')

describe('<MarcoDeConfiguracion> — movimiento', () => {
  it('hay UNA marca, dentro del enlace activo, y se pasa al nuevo', () => {
    pintar('perfil')
    expect(marcas()).toHaveLength(1)
    expect(enlaceDeLaMarca()).toBe('/c/perfil')

    pintar('equipo')
    expect(marcas()).toHaveLength(1)
    expect(enlaceDeLaMarca()).toBe('/c/equipo')
    // El enlace activo sigue marcado igual que antes para el lector de pantalla.
    expect(container.querySelector('nav a[aria-current="page"]')?.getAttribute('href')).toBe('/c/equipo')
  })

  it('cambiar de sección vuelve a montar la sección (entra con su transición); la misma sección, no', () => {
    montajes = 0
    pintar('perfil')
    expect(montajes).toBe(1)
    pintar('perfil')
    expect(montajes).toBe(1)
    pintar('equipo')
    expect(montajes).toBe(2)
    expect(container.querySelector('[data-testid="contenido"]')?.textContent).toBe('equipo')
  })
})
