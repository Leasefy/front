import { describe, it, expect } from 'vitest'
import { abrirSuSeccion, ubicarTarjeta } from './TourDelPanel'

const VENTANA = { width: 1440, height: 900 }

describe('ubicarTarjeta', () => {
  it('pone la tarjeta debajo del elemento cuando cabe', () => {
    const { top } = ubicarTarjeta({ top: 100, left: 400, width: 200, height: 40 }, VENTANA, 200)
    expect(top).toBeGreaterThan(140)
  })

  it('la sube cuando abajo no cabe', () => {
    const { top } = ubicarTarjeta({ top: 800, left: 400, width: 200, height: 40 }, VENTANA, 200)
    expect(top).toBeLessThan(800)
  })

  it('la centra sobre el elemento', () => {
    const { left } = ubicarTarjeta({ top: 100, left: 600, width: 200, height: 40 }, VENTANA, 200)
    // Centro del elemento = 700; la tarjeta mide 340 ⇒ arranca en 530.
    expect(left).toBe(530)
  })

  it('nunca se sale por la izquierda', () => {
    const { left } = ubicarTarjeta({ top: 100, left: 0, width: 40, height: 40 }, VENTANA, 200)
    expect(left).toBeGreaterThanOrEqual(8)
  })

  it('nunca se sale por la derecha', () => {
    const { left } = ubicarTarjeta(
      { top: 100, left: 1400, width: 40, height: 40 },
      VENTANA,
      200,
    )
    expect(left + 340).toBeLessThanOrEqual(VENTANA.width)
  })

  it('en una ventana más angosta que la tarjeta no devuelve un left negativo', () => {
    const { left } = ubicarTarjeta(
      { top: 100, left: 10, width: 40, height: 40 },
      { width: 320, height: 600 },
      200,
    )
    expect(left).toBeGreaterThanOrEqual(0)
  })

  it('un elemento pegado arriba no empuja la tarjeta fuera de la pantalla', () => {
    const { top } = ubicarTarjeta(
      { top: 0, left: 400, width: 200, height: 20 },
      { width: 1440, height: 200 },
      400,
    )
    expect(top).toBeGreaterThanOrEqual(8)
  })
})

describe('ubicarTarjeta en pantalla angosta', () => {
  const CHICA = { width: 390, height: 780 }

  it('manda la tarjeta abajo, a lo ancho', () => {
    const { top, left, ancho } = ubicarTarjeta({ top: 60, left: 12, width: 300, height: 40 }, CHICA, 220)
    expect(left).toBe(8)
    expect(ancho).toBe(390 - 16)
    expect(top).toBe(780 - 220 - 8)
  })

  it('nunca la empuja fuera por arriba aunque sea más alta que la ventana', () => {
    const { top } = ubicarTarjeta({ top: 10, left: 10, width: 100, height: 20 }, { width: 360, height: 200 }, 400)
    expect(top).toBeGreaterThanOrEqual(8)
  })

  it('en escritorio la tarjeta conserva su ancho fijo', () => {
    const { ancho } = ubicarTarjeta({ top: 100, left: 400, width: 200, height: 40 }, VENTANA, 200)
    expect(ancho).toBe(340)
  })
})

describe('ubicarTarjeta con un ítem del sidebar (Nico, 22-09: pasos 6 y 7)', () => {
  it('la pone AL LADO, a la derecha del sidebar, sin montarse sobre el ítem', () => {
    const item = { top: 449, left: 19, width: 216, height: 53 }
    const { left, top } = ubicarTarjeta(item, VENTANA, 434)
    expect(left).toBeGreaterThanOrEqual(item.left + item.width + 8)
    expect(top).toBeGreaterThanOrEqual(8)
    expect(top + 434).toBeLessThanOrEqual(VENTANA.height - 8)
  })

  it('un ítem pegado abajo (Reportes) no empuja la tarjeta fuera de la ventana', () => {
    const { top } = ubicarTarjeta({ top: 660, left: 4, width: 231, height: 53 }, { width: 1280, height: 720 }, 321)
    expect(top + 321).toBeLessThanOrEqual(720 - 8)
  })

  it('lo que no es de la columna lateral sigue yendo debajo', () => {
    const { top } = ubicarTarjeta({ top: 2, left: 1278, width: 146, height: 60 }, VENTANA, 275)
    expect(top).toBeGreaterThan(62)
  })
})

describe('abrirSuSeccion', () => {
  it('aprieta el botón de la sección plegada que contiene el objetivo', () => {
    document.body.innerHTML = `
      <button aria-controls="menu-seccion-sec-dinero" id="b"></button>
      <div id="menu-seccion-sec-dinero" data-abierta="false"><a data-tour-target="sidebar-pagos">Pagos</a></div>`
    let clics = 0
    document.getElementById('b')!.addEventListener('click', () => { clics += 1 })
    expect(abrirSuSeccion('[data-tour-target="sidebar-pagos"]')).toBe(true)
    expect(clics).toBe(1)
  })

  it('no toca nada si la sección ya está abierta o el objetivo no está en una', () => {
    document.body.innerHTML = `
      <div id="x" data-abierta="true"><a data-tour-target="a">A</a></div>
      <a data-tour-target="b">B</a>`
    expect(abrirSuSeccion('[data-tour-target="a"]')).toBe(false)
    expect(abrirSuSeccion('[data-tour-target="b"]')).toBe(false)
    expect(abrirSuSeccion('[data-tour-target="nada"]')).toBe(false)
  })
})
