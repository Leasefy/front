/**
 * @vitest-environment happy-dom
 *
 * EstadoDeDatos ordena los cuatro estados y —esto es lo que se prueba acá—
 * decide cómo se ven dentro del hueco de contenido que la página ya envolvió.
 *
 * El defecto que motivó estas pruebas: el fallo pintaba su propia tarjeta
 * (`rounded-lg border bg-card`) adentro de la tarjeta de la tabla, mientras el
 * vacío iba sin marco en ese mismo lugar. Se veía un borde redondeado adentro
 * de otro, y los dos estados no coincidían entre sí.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { ApiError, setAccessToken } from '@/lib/api/client'

import { EstadoDeDatos } from './EstadoDeDatos'
import { SinDatos } from './SinDatos'

describe('<EstadoDeDatos>', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    setAccessToken(null)
  })

  const render = (el: React.ReactElement) => act(() => root.render(el))

  const contenido = <table><tbody><tr><td>una fila</td></tr></tbody></table>

  it('el fallo va SIN marco: la página ya lo envolvió en una tarjeta', () => {
    render(
      <EstadoDeDatos cargando={false} error={new ApiError(500, 'boom')} queEs="los propietarios">
        {contenido}
      </EstadoDeDatos>,
    )
    const fallo = container.querySelector('[data-testid="fallo-de-carga"]') as HTMLElement
    expect(fallo).not.toBeNull()
    expect(fallo.getAttribute('data-enmarcado')).toBe('no')
    expect(fallo.className).not.toContain('border')
  })

  it('el fallo y el vacío ocupan la misma caja: no saltan al cambiar de estado', () => {
    render(
      <EstadoDeDatos cargando={false} error={new ApiError(500, 'boom')}>
        {contenido}
      </EstadoDeDatos>,
    )
    const claseDelFallo = (
      container.querySelector('[data-testid="fallo-de-carga"]') as HTMLElement
    ).className.trim()

    render(
      <EstadoDeDatos
        cargando={false}
        vacio
        cuandoVacio={<SinDatos queSon="propietarios" />}
      >
        {contenido}
      </EstadoDeDatos>,
    )
    const claseDelVacio = (
      container.querySelector('[data-testid="sin-datos"]') as HTMLElement
    ).className.trim()

    expect(claseDelFallo).toBe(claseDelVacio)
  })

  it('el orden es cargando → falló → vacío → datos, no al revés', () => {
    // Si el vacío se evaluara antes que la carga, la pantalla afirmaría «no
    // hay nada» durante el rato en que todavía no sabe.
    render(
      <EstadoDeDatos
        cargando
        vacio
        error={new ApiError(500, 'boom')}
        cuandoVacio={<SinDatos queSon="propietarios" />}
      >
        {contenido}
      </EstadoDeDatos>,
    )
    expect(container.querySelector('[data-testid="sin-datos"]')).toBeNull()
    expect(container.querySelector('[data-testid="fallo-de-carga"]')).toBeNull()
  })

  it('con contenido ya mostrado, un fallo de refresco no lo borra', () => {
    // Primero se muestra bien —esto es lo que la prueba anterior NO hacía—…
    render(
      <EstadoDeDatos cargando={false} conservarContenido>
        {contenido}
      </EstadoDeDatos>,
    )
    expect(container.textContent).toContain('una fila')
    // …y recién entonces falla el refresco.
    render(
      <EstadoDeDatos cargando={false} error={new ApiError(500, 'boom')} conservarContenido>
        {contenido}
      </EstadoDeDatos>,
    )
    expect(container.querySelector('[data-testid="fallo-de-carga"]')).toBeNull()
    expect(container.textContent).toContain('una fila')
  })

  it('🔴 pero en la PRIMERA carga sí muestra el fallo, aunque conserve', () => {
    // El defecto (Nico, 18-09-2026: «¿esto realmente sí está conectado?»):
    // `conservarContenido` se tragaba el error SIEMPRE, incluso cuando no había
    // nada que conservar. La pantalla pintaba la lista vacía y quedaba una
    // tarjeta en blanco, sin mensaje y sin «Intentar de nuevo». Un fallo que se
    // ve idéntico a «no hay nada» es peor que un error: nadie lo reporta.
    // Son 20 pantallas con la bandera puesta.
    render(
      <EstadoDeDatos cargando={false} error={new ApiError(500, 'boom')} conservarContenido>
        {contenido}
      </EstadoDeDatos>,
    )
    expect(container.querySelector('[data-testid="fallo-de-carga"]')).not.toBeNull()
  })
})
