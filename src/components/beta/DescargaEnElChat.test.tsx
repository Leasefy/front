import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DescargaEnElChat } from './DescargaEnElChat'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const boton = () => host.querySelector('button') as HTMLButtonElement
const esperar = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('DescargaEnElChat (D1)', () => {
  it('baja el archivo al tocar, no se dispara dos veces y dice qué pasó', async () => {
    let soltar: () => void = () => undefined
    const bajar = vi.fn(() => new Promise<void>((r) => (soltar = r)))
    act(() => root.render(<DescargaEnElChat etiqueta="Descargar exogena.csv" accion="bajar el archivo" bajar={bajar} />))
    expect(boton().textContent).toContain('Descargar exogena.csv')
    act(() => boton().click())
    act(() => boton().click())
    expect(bajar).toHaveBeenCalledTimes(1)
    expect(boton().disabled).toBe(true)
    soltar()
    await esperar()
    expect(host.querySelector('[role="status"]')?.textContent).toContain('Listo: quedó en tus descargas.')
    expect(boton().textContent).toContain('Descargarlo otra vez')
  })

  it('si falla lo dice en palabras y se puede reintentar', async () => {
    const bajar = vi.fn().mockRejectedValue(new Error('x'))
    act(() => root.render(<DescargaEnElChat etiqueta="Descargar el certificado" accion="bajar el certificado" bajar={bajar} />))
    act(() => boton().click())
    await esperar()
    expect(host.querySelector('[role="alert"]')?.textContent?.length).toBeGreaterThan(0)
    expect(host.querySelector('[role="status"]')).toBeNull()
    expect(boton().disabled).toBe(false)
    expect(boton().textContent).toContain('Descargar el certificado')
  })
})
