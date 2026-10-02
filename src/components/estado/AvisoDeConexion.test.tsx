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
import { AvisoDeConexion } from './AvisoDeConexion'

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
