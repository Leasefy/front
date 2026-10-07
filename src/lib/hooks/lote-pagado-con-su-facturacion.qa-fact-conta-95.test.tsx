/**
 * 🔴 QA-FACT-CONTA-95 r2 · FA-E-11: «Lote pagado con facturar ahora: el detalle
 * dice cuántas». La respuesta de «Marcar pagado» trae `facturacion`; el mismo
 * POST invalida `lotes-de-dispersion` y el refresco automático volvía a pedir
 * el lote (`ver`, que no la trae): el detalle perdía «N facturas emitidas»
 * antes de que nadie lo leyera. En el clon: LABC-9 y LABC-10 emitidas y el
 * detalle callado.
 */
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { VistaDelLote } from '@/lib/api/lotes-de-dispersion.service'
import { invalidar } from '@/lib/api/refresco-de-datos'

const vistaDelVer = (): VistaDelLote =>
  ({
    lote: { id: 'lote-1', estado: 'PAGADO', items: [], facturacion: undefined },
    excluidos: [],
  }) as unknown as VistaDelLote

const ver = vi.fn(async () => vistaDelVer())
vi.mock('@/lib/api/lotes-de-dispersion.service', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/api/lotes-de-dispersion.service')>()
  return { ...real, lotesDeDispersionApi: { ...real.lotesDeDispersionApi, ver: () => ver() } }
})

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let raiz: Root | null = null
let contenedor: HTMLDivElement | null = null
afterEach(() => {
  act(() => raiz?.unmount())
  contenedor?.remove()
  raiz = null
  contenedor = null
  ver.mockClear()
})

const esperar = (ms = 20) => act(async () => { await new Promise((r) => setTimeout(r, ms)) })

describe('🔴 FA-E-11 · el resultado de la facturación del lote sobrevive al refresco', () => {
  it('después de «Marcar pagado», el refresco automático no borra «2 facturas emitidas»', async () => {
    const { useLoteDeDispersion } = await import('./use-lotes-de-dispersion')
    let api: ReturnType<typeof useLoteDeDispersion> | null = null
    function Prueba() {
      api = useLoteDeDispersion('lote-1')
      return <p data-testid="emitidas">{api.vista?.lote.facturacion ? `${api.vista.lote.facturacion.emitidas} facturas emitidas` : 'sin resultado'}</p>
    }
    contenedor = document.createElement('div')
    document.body.appendChild(contenedor)
    raiz = createRoot(contenedor)
    await act(async () => { raiz!.render(<Prueba />) })
    await esperar()
    // «Marcar pagado» devuelve el lote con su facturación y la pantalla lo aplica.
    const pagado = vistaDelVer()
    ;(pagado.lote as { facturacion?: unknown }).facturacion = { pedida: true, candidatas: 2, emitidas: 2, yaEstaban: 0, sinNumero: 0, totalCop: 1_275_680, numeros: ['LABC-9', 'LABC-10'], fallas: [] }
    await act(async () => { api!.setVista(pagado) })
    expect(document.querySelector('[data-testid="emitidas"]')!.textContent).toBe('2 facturas emitidas')
    // El mismo POST invalidó el recurso: el lote se vuelve a pedir (sin `facturacion`).
    const antes = ver.mock.calls.length
    await act(async () => { invalidar('lotes-de-dispersion') })
    await esperar(50)
    expect(ver.mock.calls.length).toBeGreaterThan(antes)
    expect(document.querySelector('[data-testid="emitidas"]')!.textContent).toBe('2 facturas emitidas')
  })
})
