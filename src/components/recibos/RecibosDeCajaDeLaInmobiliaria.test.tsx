/**
 * 🔴 Juan (Portofino, 15-10-2026): «¿dónde se ven los recibos de caja que se
 * generaron?». La lista de la inmobiliaria: a quién, qué inmueble, el anulado
 * dicho, el PDF y anular sólo para el administrador.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { ListaDeRecibos } from '@/lib/api/lista-de-recibos.service'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const lista = vi.fn()
const bajarPdf = vi.fn()
vi.mock('@/lib/api/lista-de-recibos.service', async (original) => ({
  ...(await original<typeof import('@/lib/api/lista-de-recibos.service')>()),
  listaDeRecibosApi: {
    lista: (...a: unknown[]) => lista(...a) as unknown,
    bajarPdf: (...a: unknown[]) => bajarPdf(...a) as unknown,
  },
}))
const permisos = { value: null as null | { isAdmin: boolean; agencyRole: string } }
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => permisos.value,
}))

import { RecibosDeCajaDeLaInmobiliaria } from './RecibosDeCajaDeLaInmobiliaria'
import { consultaDeLaLista } from '@/lib/api/lista-de-recibos.service'

function respuesta(): ListaDeRecibos {
  return {
    recibos: [
      {
        id: 'r-2', numero: 2, fecha: '2026-10-05', valorCop: 1_500_000, interesesCop: 0, medio: 'pse',
        medioLegible: 'Pago en línea', referencia: 'W-1', mes: '2026-10', anulado: false, anuladoAt: null,
        motivoDeLaAnulacion: null, inquilino: 'Ana Pérez', documento: '71234567', inmueble: 'Cra 1 # 2-3',
        contrato: { id: 'k-1', numero: 7, externalId: '1839' }, cobroId: null, cuotaId: 'c-1',
      },
      {
        id: 'r-1', numero: 1, fecha: '2026-10-01', valorCop: 900_000, interesesCop: 0, medio: 'efectivo',
        medioLegible: 'Efectivo', referencia: null, mes: null, anulado: true, anuladoAt: '2026-10-02T10:00:00Z',
        motivoDeLaAnulacion: 'Se registró dos veces', inquilino: null, documento: null, inmueble: null,
        contrato: null, cobroId: null, cuotaId: null,
      },
    ],
    total: 2,
    pagina: 1,
    porPagina: 25,
    totalCop: 1_500_000,
  }
}

let contenedor: HTMLDivElement
let raiz: Root

async function montar() {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
  await act(async () => {
    raiz.render(<RecibosDeCajaDeLaInmobiliaria />)
  })
  await act(async () => {
    await new Promise((r) => setTimeout(r, 350))
  })
}

beforeEach(() => {
  lista.mockReset().mockResolvedValue(respuesta())
  bajarPdf.mockReset().mockResolvedValue(undefined)
  permisos.value = null
})
afterEach(() => {
  act(() => raiz.unmount())
  contenedor.remove()
})

describe('los recibos de la inmobiliaria', () => {
  it('dice a quién, qué inmueble y qué contrato; el anulado con su motivo', async () => {
    await montar()
    const fila2 = contenedor.querySelector('[data-testid="recibo-2"]')!.textContent!
    expect(fila2).toContain('Ana Pérez')
    expect(fila2).toContain('71234567')
    expect(fila2).toContain('Contrato #7')
    expect(fila2).toContain('Pago en línea')
    const fila1 = contenedor.querySelector('[data-testid="recibo-1"]')!.textContent!
    expect(fila1).toContain('Anulado')
    expect(fila1).toContain('Se registró dos veces')
    expect(fila1).toContain('Sin nombre registrado')
    // Ronda 26: el conteo va en la pestaña abierta («Todos 2»), no en la línea del resumen.
    expect(contenedor.querySelector('[data-testid="recibos-todos"]')!.textContent).toBe('Todos2')
    expect(contenedor.querySelector('[data-testid="recibos-todos"]')!.getAttribute('aria-pressed')).toBe('true')
    expect(contenedor.querySelector('[data-testid="resumen-de-los-recibos"]')!.textContent).toContain('recibidos')
  })

  it('el anulado no se vuelve a anular', async () => {
    await montar()
    // Ronda 26: «Anular» vive en el «⋯» de la fila; el anulado no lo lleva.
    expect(contenedor.querySelector('[data-testid="acciones-del-recibo-2"]')).not.toBeNull()
    expect(contenedor.querySelector('[data-testid="acciones-del-recibo-1"]')).toBeNull()
  })

  it('🔴 al contador no se le ofrece anular (sólo el administrador, PG-R06)', async () => {
    permisos.value = { isAdmin: false, agencyRole: 'CONTADOR' }
    await montar()
    expect(contenedor.querySelector('[data-testid^="anular-recibo-"]')).toBeNull()
    expect(contenedor.querySelector('[data-testid^="acciones-del-recibo-"]')).toBeNull()
    // El PDF sí.
    expect(contenedor.querySelector('[data-testid="pdf-del-recibo-2"]')).not.toBeNull()
  })

  it('el PDF baja el recibo de esa fila', async () => {
    await montar()
    await act(async () => {
      ;(contenedor.querySelector('[data-testid="pdf-del-recibo-2"]') as HTMLButtonElement).click()
    })
    expect(bajarPdf).toHaveBeenCalledWith(expect.objectContaining({ id: 'r-2', numero: 2 }))
  })
})

describe('la consulta de la lista', () => {
  it('sólo manda lo que hay, sin «todos» ni la página 1', () => {
    expect(consultaDeLaLista({ pagina: 1, estado: 'todos' })).toBe('')
    expect(consultaDeLaLista({ pagina: 3, porPagina: 50, q: '  Pérez ', estado: 'anulados' })).toBe(
      '?pagina=3&porPagina=50&q=P%C3%A9rez&estado=anulados',
    )
  })
})
