/**
 * Asegurabilidad — ninguna puerta a una cola que nadie llena (PROMESAS-Y-DIRECTOR, 05-10-2026).
 *
 * «Por revisar» (botón del encabezado y pestaña de la sección) y la sección
 * «Consultas que necesitan atención» del Resumen leían la cola del micro para
 * `agente=cotizador`. Esa cola vuelve vacía SIEMPRE y a propósito:
 * `wt-agent-bugs/src/server/routes/agency-ai-hub-work-items.ts:779-782`
 * («autonomous B2B quoting engine — no operator approve/reject action exists
 * on a quote request»; cabecera del archivo, `:32-35`). El motor resuelve cada
 * cotización solo: no deja nada que aprobar. Un botón que lleva a nada es un
 * botón muerto (Nico), así que las tres entradas se van (main, opción A).
 *
 * La ruta `/cola` sigue viva por URL y su vacío dice eso, en lugar de «Todo al
 * día: ninguna cotización quedó con condiciones» (falso: puede haber
 * cotizaciones con condiciones; la cola nunca las trae).
 */

import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

vi.mock('next/link', () => ({
  default: ({ children, href, ...resto }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href, ...resto }, children),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/panel/inmobiliaria/postulaciones/asegurabilidad',
  useSearchParams: () => new URLSearchParams(),
}))

const { overviewMock, colaMock } = vi.hoisted(() => ({ overviewMock: vi.fn(), colaMock: vi.fn() }))
vi.mock('@/lib/hooks/cotizador/use-cotizador-overview', () => ({
  useCotizadorOverview: () => overviewMock(),
}))
// Lo que el micro devuelve para `agente=cotizador`: la cola vacía (`emptyResponse`).
vi.mock('@/lib/hooks/ai/use-agent-work-items', () => ({
  useAgentWorkItems: () => colaMock(),
}))

import CotizadorOverviewPage from './page'
import CotizadorColaPage from './cola/page'
import { AGENT_WORKSPACES } from '@/lib/nav/agentWorkspaceNav'

const COLA = '/panel/inmobiliaria/postulaciones/asegurabilidad/cola'

const COLA_VACIA = {
  items: [],
  total: 0,
  isLoading: false,
  error: null,
  errorCrudo: null,
  refetch: vi.fn(),
  runAction: vi.fn(),
}

const base = {
  isLoading: false,
  error: null,
  isRealtimeConnected: false,
  realtimeQuotes: [],
  refetch: vi.fn(),
}

const SIN_COTIZACIONES = {
  ...base,
  data: {
    kpis: { quotesHoy: 0, approvalRate: 0, primaPromedioMonthlyCop: 0, costPerQuoteCop: 0 },
    lastQuotes: [],
    carriers: [],
    generatedAt: '2026-10-05T10:00:00-05:00',
  },
}

const CON_COTIZACIONES = {
  ...base,
  data: {
    ...SIN_COTIZACIONES.data,
    kpis: { quotesHoy: 2, approvalRate: 0.5, primaPromedioMonthlyCop: 54600, costPerQuoteCop: 0 },
    lastQuotes: [
      {
        id: 'q-1',
        cedulaHashPrefix8: 'abcd1234',
        canonCop: 1_800_000,
        ciudad: 'Medellín',
        createdAt: '2026-10-05T09:00:00-05:00',
        status: 'final',
        approvedCount: 1,
        totalCarriers: 2,
      },
    ],
  },
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function pintar(el: React.ReactElement): HTMLDivElement {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root!.render(el)
  })
  return host
}

afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  root = null
  host = null
  overviewMock.mockReset()
  colaMock.mockReset()
})

describe('Asegurabilidad — Resumen sin puertas a la cola vacía', () => {
  it.each([
    ['sin cotizaciones', SIN_COTIZACIONES],
    ['con cotizaciones', CON_COTIZACIONES],
  ])('%s: ni «Por revisar» en el encabezado ni enlaces a la cola', (_caso, overview) => {
    overviewMock.mockReturnValue(overview)
    colaMock.mockReturnValue(COLA_VACIA)
    const el = pintar(<CotizadorOverviewPage />)
    expect(el.querySelector(`a[href="${COLA}"]`)).toBeNull()
    expect(el.querySelector('header')!.textContent).not.toContain('Por revisar')
  })

  it.each([
    ['sin cotizaciones', SIN_COTIZACIONES],
    ['con cotizaciones', CON_COTIZACIONES],
  ])('%s: sin la sección «Consultas que necesitan atención», que nunca puede tener nada', (_caso, overview) => {
    overviewMock.mockReturnValue(overview)
    colaMock.mockReturnValue(COLA_VACIA)
    const el = pintar(<CotizadorOverviewPage />)
    expect(el.textContent).not.toContain('Consultas que necesitan atención')
    expect(el.textContent).not.toContain('esperan tu decisión')
  })

  it('«Nueva cotización» y «¿Cómo funciona?» siguen en el encabezado', () => {
    overviewMock.mockReturnValue(CON_COTIZACIONES)
    colaMock.mockReturnValue(COLA_VACIA)
    const el = pintar(<CotizadorOverviewPage />)
    const header = el.querySelector('header')!
    expect(header.querySelector('a[href="/panel/inmobiliaria/postulaciones/asegurabilidad/nueva"]')).not.toBeNull()
    expect(header.textContent).toContain('¿Cómo funciona?')
  })
})

describe('Asegurabilidad — la pestaña «Por revisar» se fue', () => {
  it('la barra de la sección ya no ofrece la cola', () => {
    const ws = AGENT_WORKSPACES.find((w) => w.slug === 'asegurabilidad')!
    expect(ws.items.map((i) => i.href)).not.toContain(COLA)
  })
})

describe('Asegurabilidad — la cola, abierta por URL, dice lo cierto', () => {
  it('no dice «ninguna cotización quedó con condiciones»: dice que el motor resuelve solo y no hay nada que aprobar', () => {
    colaMock.mockReturnValue(COLA_VACIA)
    const el = pintar(<CotizadorColaPage />)
    const texto = el.textContent ?? ''
    expect(texto).not.toContain('ninguna cotización quedó con condiciones')
    expect(texto).not.toContain('elegir aseguradora')
    expect(texto).toContain('motor')
    expect(texto).toContain('nada que aprobar')
  })
})
