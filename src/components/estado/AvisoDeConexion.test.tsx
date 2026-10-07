/**
 * @vitest-environment happy-dom
 *
 * La franja de «Leasefy no está respondiendo» / «Estás sin internet»
 * (01-10-2026): aparece con la caída, le pregunta a `/health` con espera
 * creciente y se va sola con el primer 200. Sin internet no pregunta.
 */
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  avisarFallaDeRed,
  avisarQueLeasefyNoResponde,
  avisarQueLeasefyRespondio,
  estadoDeConexion,
  reiniciarEstadoDeConexion,
} from '@/lib/conexion/estado-de-conexion'
import { AvisoDeConexion, cuantoSubirSobreElPie } from './AvisoDeConexion'

void React

let container: HTMLDivElement
let root: Root

function ponerEnLinea(enLinea: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { value: enLinea, configurable: true })
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.useFakeTimers()
  ponerEnLinea(true)
  reiniciarEstadoDeConexion()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<AvisoDeConexion />))
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  ponerEnLinea(true)
  reiniciarEstadoDeConexion()
})

const region = () => container.querySelector('[data-testid="aviso-de-conexion"]') as HTMLElement
const texto = () => region().textContent ?? ''

/** Avanza el reloj y deja que se resuelva la pregunta a /health. */
async function pasar(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

describe('<AvisoDeConexion>', () => {
  it('con la conexión bien no muestra nada, pero la región viva ya existe', () => {
    expect(region()).not.toBeNull()
    expect(region().getAttribute('role')).toBe('status')
    expect(region().getAttribute('aria-live')).toBe('polite')
    expect(texto()).toBe('')
  })

  it('aparece cuando Leasefy no responde, sin código ni jerga', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 503 }))
    act(() => avisarQueLeasefyNoResponde())
    expect(texto()).toContain('Leasefy no está respondiendo en este momento.')
    expect(texto()).toContain('Lo que ya guardaste está a salvo')
    expect(texto()).not.toMatch(/50\d|c[óo]digo|error/i)
  })

  it('pregunta a /health a los 5 s, 10 s, 20 s… y se va sola con el primer 200', async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce({ status: 503 })
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({ status: 200 })
    vi.stubGlobal('fetch', f)
    act(() => avisarQueLeasefyNoResponde())

    await pasar(4_999)
    expect(f).toHaveBeenCalledTimes(0)
    await pasar(1)
    expect(f).toHaveBeenCalledTimes(1)
    expect(String(f.mock.calls[0][0])).toMatch(/\/health$/)
    expect(texto()).toContain('Leasefy no está respondiendo')

    await pasar(9_999)
    expect(f).toHaveBeenCalledTimes(1)
    await pasar(1)
    expect(f).toHaveBeenCalledTimes(2)
    expect(texto()).toContain('Leasefy no está respondiendo')

    await pasar(20_000)
    expect(f).toHaveBeenCalledTimes(3)
    expect(estadoDeConexion()).toBe('bien')
    expect(texto()).toBe('')

    // Ya bien: no sigue preguntando.
    await pasar(120_000)
    expect(f).toHaveBeenCalledTimes(3)
  })

  it('si otra petición vuelve bien antes, se va y deja de preguntar', async () => {
    const f = vi.fn().mockResolvedValue({ status: 503 })
    vi.stubGlobal('fetch', f)
    act(() => avisarFallaDeRed())
    expect(texto()).toContain('Leasefy no está respondiendo')
    act(() => avisarQueLeasefyRespondio())
    expect(texto()).toBe('')
    await pasar(60_000)
    expect(f).not.toHaveBeenCalled()
  })

  it('sin internet dice eso y no le pregunta a nadie', async () => {
    const f = vi.fn()
    vi.stubGlobal('fetch', f)
    ponerEnLinea(false)
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(texto()).toContain('Estás sin internet.')
    expect(texto()).toContain('seguimos apenas vuelva la conexión')
    expect(region().getAttribute('data-estado')).toBe('sin-internet')
    await pasar(120_000)
    expect(f).not.toHaveBeenCalled()

    ponerEnLinea(true)
    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(texto()).toBe('')
  })

  it('no tapa la pantalla: no bloquea clics', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 503 }))
    act(() => avisarQueLeasefyNoResponde())
    const franja = region().firstElementChild as HTMLElement
    expect(franja.className).toContain('pointer-events-none')
    expect(franja.className).toContain('inset-x-4')
  })

  it('va abajo, no arriba: arriba tapaba el encabezado (en el celular, el menú)', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 503 }))
    act(() => avisarQueLeasefyNoResponde())
    const franja = region().firstElementChild as HTMLElement
    expect(franja.className).toMatch(/\bbottom-\[/)
    expect(franja.className).not.toMatch(/(^|\s)top-/)
  })
})

/*
 * Va encima de los cajones (z-[350] > z-[300]) y el pie de un cajón es donde
 * están sus acciones: en la Candidatura tapaba «Rechazar». Nico, 02-10: que no
 * tape el pie cuando hay un cajón abierto.
 */
describe('cuantoSubirSobreElPie — la cuenta', () => {
  // Una ventana de 800 de alto; la franja abajo, de 736 a 776 (24 px del borde).
  const FRANJA = { top: 736, bottom: 776, left: 300, right: 876 }

  it('sin cajones abiertos no sube', () => {
    expect(cuantoSubirSobreElPie(FRANJA, [])).toBe(0)
  })

  it('🔴 con el pie de un cajón debajo, sube hasta 12 px por encima de su filete', () => {
    // El pie del cajón flotante: de 714 a 784 (16 px del borde).
    const pie = { top: 714, bottom: 784, left: 560, right: 1424 }
    expect(cuantoSubirSobreElPie(FRANJA, [pie])).toBe(776 - 714 + 12)
  })

  it('un cajón angosto que no se cruza a lo ancho no la mueve', () => {
    const pie = { top: 714, bottom: 784, left: 900, right: 1424 }
    expect(cuantoSubirSobreElPie(FRANJA, [pie])).toBe(0)
  })

  it('un pie que queda arriba de la franja (no se cruzan a lo alto) no la mueve', () => {
    const pie = { top: 400, bottom: 470, left: 300, right: 876 }
    expect(cuantoSubirSobreElPie(FRANJA, [pie])).toBe(0)
  })

  it('con dos cajones, esquiva el pie más alto', () => {
    const bajo = { top: 730, bottom: 784, left: 300, right: 876 }
    const alto = { top: 700, bottom: 784, left: 300, right: 876 }
    expect(cuantoSubirSobreElPie(FRANJA, [bajo, alto])).toBe(776 - 700 + 12)
  })
})

describe('<AvisoDeConexion> con un cajón abierto', () => {
  function cajonAbierto(rect: { top: number; bottom: number; left: number; right: number }) {
    const cajon = document.createElement('div')
    cajon.setAttribute('role', 'dialog')
    cajon.setAttribute('data-sheet-side', 'right')
    cajon.setAttribute('data-state', 'open')
    const pie = document.createElement('div')
    pie.setAttribute('data-sheet-band', 'footer')
    pie.getBoundingClientRect = () =>
      ({ ...rect, width: rect.right - rect.left, height: rect.bottom - rect.top, x: rect.left, y: rect.top, toJSON: () => ({}) }) as DOMRect
    cajon.appendChild(pie)
    document.body.appendChild(cajon)
    return cajon
  }

  function franjaEn(rect: { top: number; bottom: number; left: number; right: number }) {
    const franja = region().querySelector('[data-testid="aviso-de-conexion-franja"]') as HTMLElement
    franja.getBoundingClientRect = () =>
      ({ ...rect, width: rect.right - rect.left, height: rect.bottom - rect.top, x: rect.left, y: rect.top, toJSON: () => ({}) }) as DOMRect
    return franja
  }

  afterEach(() => {
    document.querySelectorAll('[data-sheet-side]').forEach((n) => n.remove())
  })

  it('🔴 sube por encima del pie del cajón, con transform (no mueve el layout)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 503 }))
    act(() => avisarQueLeasefyNoResponde())
    const franja = franjaEn({ top: 736, bottom: 776, left: 300, right: 876 })
    expect(franja.style.transform).toBe('')

    // Se abre la Candidatura: el observador lo ve y vuelve a medir.
    await act(async () => {
      cajonAbierto({ top: 714, bottom: 784, left: 560, right: 1424 })
      await Promise.resolve()
    })
    expect(franja.style.transform).toBe(`translateY(-${776 - 714 + 12}px)`)
    expect(franja.getAttribute('data-sobre-el-pie')).toBe('true')
  })

  it('al cerrarse el cajón vuelve a su lugar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 503 }))
    act(() => avisarQueLeasefyNoResponde())
    const franja = franjaEn({ top: 736, bottom: 776, left: 300, right: 876 })
    let cajon: HTMLElement
    await act(async () => {
      cajon = cajonAbierto({ top: 714, bottom: 784, left: 560, right: 1424 })
      await Promise.resolve()
    })
    expect(franja.style.transform).not.toBe('')

    // Mientras sube, getBoundingClientRect ya la ve corrida: la cuenta debe
    // reconstruir dónde quedaría sin subir.
    franjaEn({ top: 736 - 74, bottom: 776 - 74, left: 300, right: 876 })
    await act(async () => {
      cajon!.setAttribute('data-state', 'closed')
      await Promise.resolve()
    })
    expect(franja.style.transform).toBe('')
  })
})
