/**
 * Nico, 14-10-2026 (39 inmuebles de Portofino sin tipo): «hacerle la experiencia
 * lo más fácil posible». Tres ayudas, cada una con un clic de la persona.
 */
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const resolverPorFiltro = vi.fn()
vi.mock('@/lib/api/inmuebles-importacion.service', () => ({
  inmueblesImportacionApi: { resolverPorFiltro: (...a: unknown[]) => resolverPorFiltro(...a) },
}))

import { TipoDeLasFilasSinTipo } from './TipoDeLasFilasSinTipo'
import { FilaImportacionRow } from './FilaImportacionRow'
import type { FilaDeImportacion } from '@/lib/api/inmuebles-importacion.service'

const SIN_TIPO = {
  porClase: [
    { clase: null, filas: 28 },
    { clase: 'Amoblados', filas: 11 },
  ],
  conSugerencia: 15,
  noSonInmuebles: { filas: 11, clases: ['Queja', 'Reclamos'] },
}

describe('Las filas sin tipo (Nico 14-10)', () => {
  let contenedor: HTMLDivElement
  let root: Root
  const onCambio = vi.fn()

  beforeEach(() => {
    resolverPorFiltro.mockReset().mockResolvedValue({ aplicadas: 11, procesadas: 11, totalAlEmpezar: 11, sinCambios: 0, listasAhora: 11, fallidas: [] })
    onCambio.mockReset()
    contenedor = document.createElement('div')
    document.body.appendChild(contenedor)
    root = createRoot(contenedor)
  })
  afterEach(() => {
    act(() => root.unmount())
    contenedor.remove()
  })

  const boton = (texto: RegExp) =>
    [...contenedor.querySelectorAll('button')].find((b) => texto.test(b.textContent ?? ''))!
  async function clic(b: HTMLElement) {
    await act(async () => {
      b.click()
      await new Promise((r) => setTimeout(r, 0))
    })
  }

  it('usar lo que dice la dirección manda la sugerencia de cada fila, sólo en las que la traen', async () => {
    act(() => root.render(<TipoDeLasFilasSinTipo lote="lote-1" sinTipo={SIN_TIPO} onCambio={onCambio} />))
    expect(contenedor.textContent).toContain('39 filas sin tipo de inmueble')
    expect(contenedor.textContent).toContain('15 filas dicen el tipo en la dirección')

    await clic(boton(/Usar lo que dice la dirección/))

    expect(resolverPorFiltro).toHaveBeenCalledWith(
      'lote-1',
      { motivo: 'tipo', conSugerenciaDeTipo: true },
      { usarSugerenciaDeTipo: true },
    )
    expect(onCambio).toHaveBeenCalled()
  })

  it('el tipo de un grupo se pone a todas las de esa clase, y sin elegirlo el botón no se aprieta', async () => {
    act(() => root.render(<TipoDeLasFilasSinTipo lote="lote-1" sinTipo={SIN_TIPO} onCambio={onCambio} />))
    const select = contenedor.querySelector<HTMLSelectElement>('select[aria-label="Tipo para «Amoblados»"]')!
    const poner = boton(/Poner a las 11/)
    expect(poner.disabled).toBe(true)

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!
      setter.call(select, 'APARTMENT')
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await clic(boton(/Poner a las 11/))

    expect(resolverPorFiltro).toHaveBeenCalledWith(
      'lote-1',
      { motivo: 'tipo', clase: 'Amoblados', noEsInmueble: false },
      { campos: { type: 'APARTMENT' } },
    )
    expect(contenedor.querySelector('[data-testid="tipo-aviso"]')?.textContent).toContain('11 filas como apartamento')
  })

  it('las que no son inmuebles se dicen con lo que trae el archivo y salen de un clic', async () => {
    act(() => root.render(<TipoDeLasFilasSinTipo lote="lote-1" sinTipo={SIN_TIPO} onCambio={onCambio} />))
    expect(contenedor.querySelector('[data-testid="no-son-inmuebles"]')?.textContent).toContain('«Queja», «Reclamos»')

    await clic(boton(/No traer estas 11/))

    expect(resolverPorFiltro).toHaveBeenCalledWith(
      'lote-1',
      { motivo: 'tipo', noEsInmueble: true },
      { descartar: true },
    )
  })

  it('un back anterior (sin `sinTipo`) no pinta nada', () => {
    act(() => root.render(<TipoDeLasFilasSinTipo lote="lote-1" sinTipo={undefined} onCambio={onCambio} />))
    expect(contenedor.querySelector('[data-testid="tipo-de-las-filas-sin-tipo"]')).toBeNull()
  })

  it('en la fila, el tipo que dice la dirección se confirma de un clic', async () => {
    const onResolver = vi.fn().mockResolvedValue(undefined)
    const fila = {
      id: 'f1', lote: 'lote-1', fila: 12, estado: 'PENDIENTE', faltantes: ['tipo'], overrides: [], candidatos: [],
      propertyId: null, datos: { address: 'CORTIJO DE SAN JOSÉ CASA 51' }, datosPendientes: [], ubicacion: 'UBICADA',
      errorDeActivacion: null, claseDelArchivo: null, noEsInmueble: false,
      sugerenciaDeTipo: { tipo: 'HOUSE', porque: 'CASA 51' },
    } as unknown as FilaDeImportacion
    act(() => root.render(<FilaImportacionRow fila={fila} onResolver={onResolver} onDescartar={vi.fn()} isBusy={false} />))
    expect(contenedor.querySelector('[data-testid="fila-sugerencia-de-tipo"]')?.textContent).toContain('«CASA 51»')

    await clic(boton(/^Es casa$/))

    expect(onResolver).toHaveBeenCalledWith('f1', { type: 'HOUSE' })
  })
})
