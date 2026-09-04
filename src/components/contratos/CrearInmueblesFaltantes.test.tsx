/**
 * «Crear los N inmuebles que faltan».
 *
 * Lo que se protege: (1) el número que promete el botón es el del BACK, no
 * el de la página visible; (2) la confirmación dice qué va a pasar antes de
 * hacerlo y manda el lote entero con la ciudad de respaldo; (3) el resultado
 * no tapa lo que se omitió o falló — sale fila por fila; (4) sin nada que
 * crear, no hay botón.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

vi.mock('@/lib/api/contracts.service', () => ({
  contractsApi: {
    migracion: {
      inmueblesFaltantes: vi.fn(),
      crearInmueblesFaltantes: vi.fn(),
    },
  },
}))

import { contractsApi } from '@/lib/api/contracts.service'
import { CrearInmueblesFaltantes } from './CrearInmueblesFaltantes'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  vi.clearAllMocks()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function render(onListo = vi.fn()) {
  await act(async () => {
    root.render(<CrearInmueblesFaltantes lote="lote-1" onListo={onListo} />)
  })
  // El conteo llega después del primer render.
  await act(async () => {})
  return onListo
}

const boton = (testId: string) =>
  document.querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement | null

describe('CrearInmueblesFaltantes', () => {
  it('sin inmuebles faltantes no muestra nada', async () => {
    vi.mocked(contractsApi.migracion.inmueblesFaltantes).mockResolvedValue({
      candidatas: 0,
      activadas: 0,
      ambiguas: 0,
      sinDireccion: 0,
    })
    await render()
    expect(container.querySelector('[data-testid="crear-inmuebles-faltantes"]')).toBeNull()
  })

  it('si el conteo falla tampoco muestra un botón que promete un número', async () => {
    vi.mocked(contractsApi.migracion.inmueblesFaltantes).mockRejectedValue(new Error('x'))
    await render()
    expect(container.querySelector('[data-testid="crear-inmuebles-faltantes"]')).toBeNull()
  })

  it('el número del botón es el del back, y avisa cuántas ya están activadas', async () => {
    vi.mocked(contractsApi.migracion.inmueblesFaltantes).mockResolvedValue({
      candidatas: 90,
      activadas: 90,
      ambiguas: 2,
      sinDireccion: 1,
    })
    await render()

    expect(contractsApi.migracion.inmueblesFaltantes).toHaveBeenCalledWith('lote-1')
    const abrir = boton('crear-inmuebles-faltantes-abrir')
    expect(abrir?.textContent).toContain('90')
    const texto = container.textContent ?? ''
    expect(texto).toContain('2 filas tienen dos inmuebles')
    expect(texto).toContain('1 sin dirección')
  })

  it('confirmar manda el lote con la ciudad de respaldo, muestra el resultado fila por fila y refresca', async () => {
    vi.mocked(contractsApi.migracion.inmueblesFaltantes)
      .mockResolvedValueOnce({ candidatas: 3, activadas: 3, ambiguas: 0, sinDireccion: 0 })
      .mockResolvedValueOnce({ candidatas: 1, activadas: 1, ambiguas: 0, sinDireccion: 0 })
    vi.mocked(contractsApi.migracion.crearInmueblesFaltantes).mockResolvedValue({
      pedidas: 3,
      creados: 2,
      vinculados: 2,
      consignados: 1,
      omitidas: [{ id: 'f-3', fila: 2, motivo: 'Sin ciudad: decila al crear.' }],
      fallidas: [],
    })
    const onListo = await render()

    await act(async () => {
      boton('crear-inmuebles-faltantes-abrir')?.click()
    })
    const dialogo = document.querySelector('[role="alertdialog"]')
    expect(dialogo?.textContent).toContain('3')
    expect(dialogo?.textContent?.toLowerCase()).toContain('archivo')

    const ciudad = document.querySelector(
      '[data-testid="crear-inmuebles-faltantes-ciudad"]',
    ) as HTMLInputElement
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(ciudad, 'Bello')
      ciudad.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      boton('crear-inmuebles-faltantes-confirmar')?.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(contractsApi.migracion.crearInmueblesFaltantes).toHaveBeenCalledWith(
      { lote: 'lote-1' },
      'Bello',
    )
    const resultado = document.querySelector('[data-testid="crear-inmuebles-faltantes-resultado"]')
    expect(resultado?.textContent).toContain('2 inmuebles creados')
    expect(resultado?.textContent).toContain('1 consignado')
    // La omitida sale con su línea del archivo (+2: encabezado y base 1).
    expect(resultado?.textContent).toContain('Fila 4: Sin ciudad')
    // 2 con inmueble, 1 consignado ⇒ 1 sin propietario, y se dice.
    expect(resultado?.textContent).toContain('1 sin propietario')
    expect(onListo).toHaveBeenCalledTimes(1)
    // Se volvió a contar: quedó 1.
    expect(boton('crear-inmuebles-faltantes-abrir')?.textContent).toContain('1')
    expect(document.querySelector('[role="alertdialog"]')).toBeNull()
  })

  it('un fallo del back se queda en el diálogo y no refresca', async () => {
    vi.mocked(contractsApi.migracion.inmueblesFaltantes).mockResolvedValue({
      candidatas: 5,
      activadas: 0,
      ambiguas: 0,
      sinDireccion: 0,
    })
    vi.mocked(contractsApi.migracion.crearInmueblesFaltantes).mockRejectedValue(
      new Error('Hay que decir el lote o las filas.'),
    )
    const onListo = await render()

    await act(async () => {
      boton('crear-inmuebles-faltantes-abrir')?.click()
    })
    await act(async () => {
      boton('crear-inmuebles-faltantes-confirmar')?.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain(
      'Hay que decir el lote o las filas.',
    )
    expect(onListo).not.toHaveBeenCalled()
  })
})
