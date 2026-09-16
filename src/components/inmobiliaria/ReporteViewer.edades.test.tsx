/**
 * 🔴 El informe «Cartera por Edades» (bug B de la prueba en navegador, 16-09).
 *
 * Lo que se veía: el total decía $3.003.910.850 —la cartera, siniestro
 * incluido— y los cuatro tramos sumaban $364.795.650, porque sólo contaban la
 * cartera viva. Como en QA el siniestro empieza a los 30 días, los tramos de
 * más de 30 daban siempre $0. Y decía «885 cobros pendientes» cuando son
 * cuotas.
 *
 * Lo que se fija: los tramos que se PINTAN suman el total que se pinta, el
 * siniestro es un tramo explícito, y se habla de cuotas.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import type { CarteraReport } from '@/lib/types/inmobiliaria'
import es from '@/lib/i18n/locales/es.json'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const reportMock = vi.fn()
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useCarteraReport: () => reportMock(),
  useOcupacionReport: () => ({}),
  useComisionesReport: () => ({}),
  useFlujoCajaReport: () => ({}),
  useVencimientosReport: () => ({}),
}))

import { CarteraEdadesPreview, tramosDelInformeDeEdades } from './ReporteViewer'

/** Los números de QA del 16-09, con el siniestro a los 30 días. */
const SUMMARY: CarteraReport['summary'] = {
  deudaTotalCop: 5_326_247_800,
  porVencerCop: 2_200_000_000,
  vencidaEnPlazoCop: 122_336_950,
  carteraCop: 3_003_910_850,
  carteraVivaCop: 364_795_650,
  enSiniestroCop: 2_639_115_200,
  bucket0to30: 364_795_650,
  bucket31to60: 0,
  bucket61to90: 0,
  bucket90plus: 0,
  cuotas: 2_000,
  cuotasPorVencer: 1_000,
  cuotasVencidasEnPlazo: 115,
  cuotasEnCartera: 885,
  cuotasEnSiniestro: 700,
}

/** `t` que interpola sobre el diccionario REAL en castellano. */
function t(clave: string, params?: Record<string, string | number>): string {
  const texto = clave
    .split('.')
    .reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], es)
  if (typeof texto !== 'string') return clave
  return texto.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(params?.[k] ?? `{{${k}}}`))
}

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  reportMock.mockReset()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const pesos = (texto: string | null | undefined) => Number((texto ?? '').replace(/[^0-9]/g, ''))

describe('🔴 «Cartera por Edades»: los tramos suman el total', () => {
  it('la regla pura: cinco tramos, el quinto es el siniestro, y suman la cartera', () => {
    const tramos = tramosDelInformeDeEdades(SUMMARY)
    expect(tramos.map((x) => x.clave)).toEqual([
      'days0to30',
      'days31to60',
      'days61to90',
      'days90plus',
      'claimsBucket',
    ])
    expect(tramos.reduce((s, x) => s + x.monto, 0)).toBe(SUMMARY.carteraCop)
  })

  it('lo que se PINTA cuadra: total, cinco tramos que lo suman, y «cuotas»', () => {
    reportMock.mockReturnValue({ report: { items: [], summary: SUMMARY } })
    act(() => {
      root.render(<CarteraEdadesPreview t={t} />)
    })

    const tramos = Array.from(host.querySelectorAll('[data-testid^="edades-tramo-"]'))
    expect(tramos).toHaveLength(5)
    const suma = tramos.reduce((s, el) => s + pesos(el.querySelector('p')?.textContent), 0)
    const total = pesos(host.querySelector('.text-2xl')?.textContent)
    expect(total).toBe(SUMMARY.carteraCop)
    expect(suma).toBe(total)

    expect(host.querySelector('[data-testid="edades-tramo-claimsBucket"]')?.textContent).toContain(
      'En siniestro',
    )
    const cuotas = host.querySelector('[data-testid="edades-cuotas"]')?.textContent ?? ''
    expect(cuotas).toBe('885 cuotas en cartera')
    expect(host.textContent).not.toContain('cobros pendientes')
  })
})
