/**
 * Movimiento de los portales (ola F, MOV-A5, 03-10-2026): las piezas que
 * deciden CUÁNDO algo entra.
 *
 * - `useEntradaTrasCargar` / `useHuboEsqueleto`: el contenido que reemplaza a
 *   un esqueleto entra (4 px); el que ya estaba al montarse NO (la entrada de
 *   la página es del `template.tsx`).
 * - `EntraAlCambiar`: al cambiar la clave, lo viejo se va AL INSTANTE (una fila
 *   de otra pestaña no puede quedar en pantalla) y lo nuevo entra.
 * - `AparecerSi`: la tarjeta que llega después de cargar aparece; la que ya
 *   estaba es una caja quieta.
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { useEntradaTrasCargar, useHuboEsqueleto, type EntradaTrasCargar } from './use-entrada-tras-cargar'
import { EntraAlCambiar } from './EntraAlCambiar'
import { AparecerSi } from './AparecerSi'

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

function render(el: React.ReactElement) {
  act(() => root.render(el))
}

describe('useEntradaTrasCargar', () => {
  const vistas: EntradaTrasCargar[] = []
  function Sonda({ cargando }: { cargando: boolean }) {
    vistas.push(useEntradaTrasCargar(cargando))
    return null
  }

  beforeEach(() => {
    vistas.length = 0
  })

  it('con los datos ya puestos al montarse, NO anima: la entrada es del template', () => {
    render(<Sonda cargando={false} />)
    render(<Sonda cargando={false} />)
    expect(vistas.every((v) => v.initial === false)).toBe(true)
  })

  it('si se vio el esqueleto, el contenido que llega entra con fundido y 4 px', () => {
    render(<Sonda cargando />)
    render(<Sonda cargando={false} />)
    const ultima = vistas.at(-1)!
    expect(ultima.initial).toEqual({ opacity: 0, y: 4 })
    expect('animate' in ultima && ultima.animate).toEqual({ opacity: 1, y: 0 })
  })

  it('una vez que hubo esqueleto, se recuerda (un reintento que vuelve a cargar también entra)', () => {
    render(<Sonda cargando />)
    render(<Sonda cargando={false} />)
    render(<Sonda cargando={false} />)
    expect(vistas.at(-1)!.initial).not.toBe(false)
  })
})

describe('useHuboEsqueleto', () => {
  const valores: boolean[] = []
  function Sonda({ cargando }: { cargando: boolean }) {
    valores.push(useHuboEsqueleto(cargando))
    return null
  }

  it('es falso hasta que algo carga, y de ahí en adelante verdadero (las cifras cuentan desde 0)', () => {
    valores.length = 0
    render(<Sonda cargando={false} />)
    render(<Sonda cargando />)
    render(<Sonda cargando={false} />)
    expect(valores).toEqual([false, true, true])
  })
})

describe('EntraAlCambiar', () => {
  it('al cambiar de clave, lo viejo se va al instante y lo nuevo ya está', () => {
    render(
      <EntraAlCambiar clave="propietarios" as="ul">
        <li data-testid="fila-propietario">Ana</li>
      </EntraAlCambiar>,
    )
    expect(container.querySelector('[data-testid="fila-propietario"]')).not.toBeNull()

    render(
      <EntraAlCambiar clave="inquilinos" as="ul">
        <li data-testid="fila-inquilino">Luis</li>
      </EntraAlCambiar>,
    )
    // Sin esperar ningún cuadro: la fila de la otra pestaña ya no está.
    expect(container.querySelector('[data-testid="fila-propietario"]')).toBeNull()
    expect(container.querySelector('[data-testid="fila-inquilino"]')).not.toBeNull()
    expect(container.querySelectorAll('ul')).toHaveLength(1)
  })

  it('lo que ya estaba al montarse se pinta quieto (sin opacidad en línea)', () => {
    render(
      <EntraAlCambiar clave="cargando" className="caja">
        <p>Cargando</p>
      </EntraAlCambiar>,
    )
    const caja = container.querySelector<HTMLElement>('.caja')!
    expect(caja.style.opacity === '' || caja.style.opacity === '1').toBe(true)
  })
})

describe('AparecerSi', () => {
  it('sin carga previa es una caja quieta, con su clase y su contenido', () => {
    render(
      <AparecerSi si={false} className="tarjeta">
        <span>Próximas visitas</span>
      </AparecerSi>,
    )
    const tarjeta = container.querySelector<HTMLElement>('.tarjeta')!
    expect(tarjeta.textContent).toBe('Próximas visitas')
    expect(tarjeta.getAttribute('style')).toBeNull()
  })

  it('si llegó después de cargar, aparece (y el contenido es el mismo)', () => {
    render(
      <AparecerSi si className="tarjeta">
        <span>Próximas visitas</span>
      </AparecerSi>,
    )
    expect(container.querySelector('.tarjeta')!.textContent).toBe('Próximas visitas')
  })
})
