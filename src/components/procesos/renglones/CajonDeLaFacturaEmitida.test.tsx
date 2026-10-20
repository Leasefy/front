/**
 * El cajón de una factura que emitió un proceso (QA en el lab, 20-10-2026): la
 * lista decía «SETP-1» y el cajón «Factura 1», con el mes en «2026-10».
 *
 * Lo que se protege:
 *  1. El título lleva el número como en la lista: prefijo + consecutivo.
 *  2. El mes se lee en palabras.
 *  3. Sin prefijo, el número pelado; ya con prefijo, no se repite.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/api/facturacion-por-mes.service', () => ({
  facturacionPorMesService: { factura: vi.fn(), pdfDeLaFactura: vi.fn() },
}))

import { facturacionPorMesService } from '@/lib/api/facturacion-por-mes.service'
import { CajonDeLaFacturaEmitida, numeroDeLaFacturaEmitida } from './CajonDeLaFacturaEmitida'

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
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

const esperar = () => new Promise((r) => setTimeout(r, 0))

describe('CajonDeLaFacturaEmitida', () => {
  it('el título lleva el prefijo y el mes va en palabras', async () => {
    vi.mocked(facturacionPorMesService.factura).mockResolvedValue({
      id: 'f-1',
      mes: '2026-10',
      destinatario: 'INQUILINO',
      numeroDian: 1,
      prefijo: 'SETP',
      terceroNombre: 'Prueba Cobri Dos',
      terceroDocumento: '1099000778',
      inmueble: 'CL 122 SUR 50 - 62 AP 405',
      subtotalCop: 980_000,
      descuentoCop: 0,
      ivaCop: 0,
      retencionesCop: 0,
      totalCop: 980_000,
      lineas: [],
      estado: 'EMITIDA',
      createdAt: '2026-10-20T23:19:00.000Z',
      notaCredito: null,
    } as never)

    await act(async () => {
      root.render(<CajonDeLaFacturaEmitida id="f-1" onCerrar={() => {}} />)
      await esperar()
      await esperar()
    })

    const texto = document.body.textContent ?? ''
    expect(texto).toContain('Factura SETP-1')
    expect(texto).toContain('Octubre de 2026')
    expect(texto).not.toContain('2026-10')
  })

  it('sin prefijo, el número pelado; ya con prefijo, no se repite', () => {
    expect(numeroDeLaFacturaEmitida({ numeroDian: 1203, prefijo: '' })).toBe('1203')
    expect(numeroDeLaFacturaEmitida({ numeroDian: 'FE-1203', prefijo: 'FE' })).toBe('FE-1203')
    expect(numeroDeLaFacturaEmitida({ numeroDian: 7, prefijo: ' FE ' })).toBe('FE-7')
    expect(numeroDeLaFacturaEmitida({ numeroDian: null, prefijo: 'FE' })).toBeNull()
  })
})
