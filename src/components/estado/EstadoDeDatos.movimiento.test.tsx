/**
 * El movimiento de la base (02-10-2026, «cada interacción con su animación»):
 * `EstadoDeDatos`, `KpiValor` y los vacíos animan los CAMBIOS de estado con el
 * sistema de Cadence, sin agregar nodos alrededor de lo que la pantalla pinta
 * y sin animar lo que ya estaba al montarse.
 *
 * Las animaciones de framer terminan al instante en las pruebas
 * (`vitest.setup.ts`, `skipAnimations`). Para ver que una entrada ARRANCA
 * (opacidad 0 en el primer cuadro) se apaga ese atajo en cada prueba.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { MotionGlobalConfig } from 'framer-motion'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

import { EstadoDeDatos } from './EstadoDeDatos'
import { KpiValor } from './KpiValor'
import { SinDatos } from './SinDatos'

function Tarjeta({ children }: { children: React.ReactNode }) {
  return <article data-testid="tarjeta">{children}</article>
}

describe('EstadoDeDatos — la entrada de un estado nuevo', () => {
  let host: HTMLDivElement
  let root: Root
  const render = (el: React.ReactElement) => act(() => root.render(el))

  beforeEach(() => {
    MotionGlobalConfig.skipAnimations = false
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
  })
  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    MotionGlobalConfig.skipAnimations = true
  })

  const pantalla = (cargando: boolean) => (
    <section className="space-y-4" data-testid="padre">
      <EstadoDeDatos cargando={cargando} esqueleto={<div data-testid="esqueleto" />}>
        <div className="rounded-lg border" data-testid="a">
          A
        </div>
        <Tarjeta>B</Tarjeta>
        {'texto suelto'}
      </EstadoDeDatos>
    </section>
  )

  it('lo que ya estaba al montarse NO entra animado (la página ya entra con su template)', () => {
    render(pantalla(false))
    const a = host.querySelector<HTMLElement>('[data-testid="a"]')!
    expect(a.style.opacity).toBe('')
    expect(host.querySelector('[data-entrada-del-estado]')).toBeNull()
  })

  it('cargando → contenido: lo nuevo arranca invisible y sube, SIN envolver a los hijos que son etiquetas', () => {
    render(pantalla(true))
    expect(host.querySelector('[data-testid="esqueleto"]')).not.toBeNull()
    render(pantalla(false))

    const padre = host.querySelector<HTMLElement>('[data-testid="padre"]')!
    const a = host.querySelector<HTMLElement>('[data-testid="a"]')!
    // La <div> de la pantalla sigue siendo hija DIRECTA del padre: el
    // `space-y-4` le sigue tocando igual que antes.
    expect(a.parentElement).toBe(padre)
    expect(a.className).toBe('rounded-lg border')
    // Y arranca en el primer cuadro de su entrada.
    expect(a.style.opacity).toBe('0')
    expect(a.style.transform).toContain('translateY(4px)')
  })

  it('un componente ENTRE varios hijos queda como está: su padre no cambia', () => {
    render(pantalla(true))
    render(pantalla(false))
    const tarjeta = host.querySelector<HTMLElement>('[data-testid="tarjeta"]')!
    expect(tarjeta.parentElement).toBe(host.querySelector('[data-testid="padre"]'))
    expect(host.querySelector('[data-entrada-del-estado]')).toBeNull()
    expect(host.textContent).toContain('texto suelto')
  })

  it('un solo componente como contenido entra en una caja que se esconde si queda vacía', () => {
    const Nada = () => null
    const solo = (cargando: boolean, hijo: React.ReactNode) => (
      <EstadoDeDatos cargando={cargando}>{hijo}</EstadoDeDatos>
    )
    render(solo(true, <Tarjeta>B</Tarjeta>))
    render(solo(false, <Tarjeta>B</Tarjeta>))
    const caja = host.querySelector<HTMLElement>('[data-testid="tarjeta"]')!.parentElement!
    expect(caja.hasAttribute('data-entrada-del-estado')).toBe(true)
    expect(caja.style.opacity).toBe('0')
    expect(caja.className).toContain('empty:hidden')

    act(() => root.unmount())
    root = createRoot(host)
    render(solo(true, <Nada />))
    render(solo(false, <Nada />))
    const vacia = host.querySelector<HTMLElement>('[data-entrada-del-estado]')!
    expect(vacia.childNodes).toHaveLength(0)
    expect(vacia.className).toContain('empty:hidden')
  })

  it('una etiqueta con su propio transform entra sólo con el fundido', () => {
    const conTransform = (cargando: boolean) => (
      <EstadoDeDatos cargando={cargando}>
        <div className="-translate-x-1/2" data-testid="centrada" />
      </EstadoDeDatos>
    )
    render(conTransform(true))
    render(conTransform(false))
    const centrada = host.querySelector<HTMLElement>('[data-testid="centrada"]')!
    expect(centrada.style.opacity).toBe('0')
    expect(centrada.style.transform).toBe('')
  })

  it('el vacío que llega dentro de EstadoDeDatos no suma una segunda entrada', () => {
    const conVacio = (cargando: boolean) => (
      <EstadoDeDatos cargando={cargando} vacio cuandoVacio={<SinDatos queSon="contratos" />}>
        <p>nunca</p>
      </EstadoDeDatos>
    )
    render(conVacio(true))
    render(conVacio(false))
    const vacio = host.querySelector<HTMLElement>('[data-testid="sin-datos"]')!
    // La caja de afuera (la de EstadoDeDatos) entra; la del vacío, quieta.
    expect(vacio.style.opacity).toBe('')
    expect(vacio.parentElement!.hasAttribute('data-entrada-del-estado')).toBe(true)
  })

  it('un vacío suelto (sin EstadoDeDatos) entra con Appear', () => {
    render(<SinDatos queSon="contratos" />)
    const vacio = host.querySelector<HTMLElement>('[data-testid="sin-datos"]')!
    expect(vacio.style.opacity).toBe('0')
  })
})

describe('KpiValor — la cifra que llega', () => {
  let host: HTMLDivElement
  let root: Root
  const render = (el: React.ReactElement) => act(() => root.render(el))

  beforeEach(() => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
  })
  afterEach(() => {
    act(() => root.unmount())
    host.remove()
  })

  it('el texto final es el mismo de antes: sin separador de miles agregado y con sus decimales', () => {
    render(
      <>
        <KpiValor cargando={false}>{1234}</KpiValor>
        <KpiValor cargando={false}>{4.5}</KpiValor>
        <KpiValor cargando={false}>{'$ 1.200.000'}</KpiValor>
      </>,
    )
    const valores = [...host.querySelectorAll('[data-testid="kpi-valor"]')].map((n) => n.textContent)
    expect(valores).toEqual(['1234', '4.5', '$ 1.200.000'])
  })

  it('un número que llega después de cargar cuenta desde 0 (arranca en 0 en el primer cuadro)', () => {
    MotionGlobalConfig.skipAnimations = false
    try {
      render(<KpiValor cargando>{37}</KpiValor>)
      render(<KpiValor cargando={false}>{37}</KpiValor>)
      const valor = host.querySelector<HTMLElement>('[data-testid="kpi-valor"]')!
      expect(valor.dataset.estado).toBe('ok')
      expect(valor.textContent).toBe('0')
      expect(valor.style.opacity).toBe('0')
    } finally {
      MotionGlobalConfig.skipAnimations = true
    }
  })

  it('lo que ya estaba al montarse no cuenta', () => {
    MotionGlobalConfig.skipAnimations = false
    try {
      render(<KpiValor cargando={false}>{37}</KpiValor>)
      const valor = host.querySelector<HTMLElement>('[data-testid="kpi-valor"]')!
      expect(valor.textContent).toBe('37')
      expect(valor.style.opacity).toBe('')
    } finally {
      MotionGlobalConfig.skipAnimations = true
    }
  })
})
