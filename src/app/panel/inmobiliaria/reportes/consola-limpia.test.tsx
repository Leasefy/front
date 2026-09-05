/**
 * La consola del navegador es parte de la pantalla.
 *
 * En `/panel/inmobiliaria/reportes` la vista se veía bien —ocho reportes, tres
 * favoritos, filtros, tarjetas con sus botones— y al mismo tiempo dejaba
 * avisos en consola. Uno era real y salía POR CADA apertura del cajón de vista
 * previa, en los ocho reportes: el `SheetContent` es un diálogo de Radix y no
 * tenía descripción registrada («Missing `Description` … for {DialogContent}»),
 * así que el lector de pantalla anunciaba el título y nada más.
 *
 * Este archivo monta la pantalla entera —en `StrictMode`, que es como corre en
 * desarrollo— y recorre lo que un usuario recorre: las cuatro pestañas
 * avanzadas, el cajón de los OCHO reportes, la vista de lista y una búsqueda
 * sin resultados. Cualquier `console.error`/`console.warn` de React, de Radix o
 * de framer-motion en cualquiera de esos pasos deja el test en rojo con el
 * texto del aviso, que es la única forma de que no vuelvan a acumularse sin que
 * nadie se entere.
 *
 * ⚠️ La ÚNICA excepción, y por qué no es un defecto del producto:
 * `ReportPDFExport` usa `<style jsx global>`. Ese atributo lo consume el
 * compilador de Next (SWC transforma styled-jsx; verificado en el bundle real:
 * `.next/static/chunks/app/panel/inmobiliaria/reportes/page.js` importa
 * `styled-jsx/style`). Vitest no corre esa transformación, así que acá —y SÓLO
 * acá— React ve un `<style jsx global>` literal y avisa por los dos atributos.
 * En el navegador ese aviso no existe. Se filtra por texto exacto, no por
 * componente, para que cualquier otro aviso siga mordiendo.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {} }),
  usePathname: () => '/panel/inmobiliaria/reportes',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/components/ui/toast', () => ({
  toast: { success: () => {}, error: () => {}, info: () => {}, loading: () => {} },
}))

vi.mock('@/lib/hooks/useInmobiliaria', () => {
  const OCUPACION = {
    generatedAt: '2026-09-05T00:00:00.000Z',
    totalProperties: 12, totalOccupied: 10, totalInProcess: 0, totalAvailable: 2,
    overallOccupancyRate: 0.8333, previousMonthOccupancyRate: 0.75,
    zones: [
      { zone: 'Chapinero', totalProperties: 6, occupied: 5, inProcess: 0, available: 1, occupancyRate: 0.8333 },
      { zone: 'Usaquen', totalProperties: 6, occupied: 5, inProcess: 0, available: 1, occupancyRate: 0.8333 },
    ],
    byProperty: [
      { consignacionId: 'c1', propertyTitle: 'Apto 101', propertyZone: 'Chapinero', availability: 'RENTED', tenantName: 'Juan', monthlyRent: 2000000 },
      { consignacionId: 'c2', propertyTitle: 'Apto 102', propertyZone: 'Usaquen', availability: 'AVAILABLE', monthlyRent: 1800000 },
    ],
    monthlyTrend: [ { month: '2026-08', rate: 80 }, { month: '2026-09', rate: 83.3 } ],
  }
  const item = (n: number, dias: number) => ({
    cobroId: 'k' + n, consignacionId: 'c' + n, propertyTitle: 'Apto ' + n, propertyAddress: 'Cra 1',
    tenantName: 'Inq ' + n, tenantPhone: '3000', propietarioId: 'p', propietarioName: 'Pro',
    agenteId: 'a', agenteName: 'Ana', month: '2026-09', dueDate: '2026-09-05',
    totalAmount: 1000000, paidAmount: 0, pendingAmount: 1000000 - n, daysLate: dias,
    status: 'PENDING', remindersSent: 2, lastReminderDate: null,
  })
  const CARTERA = {
    generatedAt: '2026-09-05T00:00:00.000Z',
    items: [item(1, 12), item(2, 40), item(3, 0)],
    summary: { totalPending: 3000000, bucket0to30: 1000000, bucket31to60: 1000000, bucket61to90: 0, bucket90plus: 0 },
    byMonth: [
      { month: '2026-08', total: 5000000, collected: 4000000, overdue: 1000000, collectionRate: 80 },
      { month: '2026-09', total: 5000000, collected: 2000000, overdue: 3000000, collectionRate: 40 },
    ],
  }
  const COMISIONES = {
    generatedAt: '2026-09-05T00:00:00.000Z', period: '2026-09',
    totalCommissions: 900000, avgCommissionPerAgent: 450000, totalClosedDeals: 4, topAgentName: 'Ana',
    agentes: [
      { agenteId: 'a1', agenteName: 'Ana', closedDeals: 3, totalCommission: 600000, avgCommissionPerDeal: 200000, trend: 'up' },
      { agenteId: 'a2', agenteName: 'Beto', closedDeals: 1, totalCommission: 300000, avgCommissionPerDeal: 300000, trend: 'stable' },
    ],
  }
  const FLUJO = {
    generatedAt: '2026-09-05T00:00:00.000Z', period: 'semester',
    months: [
      { month: '2026-08', ingresos: 5000000, dispersiones: 3000000, comisiones: 500000, balance: 1500000 },
      { month: '2026-09', ingresos: 4000000, dispersiones: 2500000, comisiones: 400000, balance: 1100000 },
    ],
    totals: { totalIngresos: 9000000, totalDispersiones: 5500000, totalComisiones: 900000, netBalance: 2600000 },
  }
  const RENDIMIENTO = {
    generatedAt: '2026-09-05T00:00:00.000Z', period: '2026-09',
    agentes: [
      { userId: 'a1', agenteName: 'Ana', activeLeads: 5, completedDeals: 3, conversionRate: 60, avgDaysToClose: 12 },
      { userId: 'a2', agenteName: 'Beto', activeLeads: 2, completedDeals: 1, conversionRate: 33, avgDaysToClose: 20 },
    ],
  }
  const VENCIMIENTOS = {
    generatedAt: '2026-09-05T00:00:00.000Z',
    summary: { totalVencimientos: 2, bucket0to30: 1, bucket31to60: 1, bucket61to90: 0, bucket90plus: 0 },
    items: [
      { consignacionId: 'c1', propertyId: 'p1', propertyTitle: 'Apto 101', propertyAddress: 'Cra 1', tenantName: 'Juan', tenantPhone: '300', propietarioName: 'Pro', contractEndDate: '2026-10-01', daysUntilExpiry: 26, renewalStatus: 'pending', bucket: '0-30' },
      { consignacionId: 'c2', propertyId: 'p2', propertyTitle: 'Apto 102', propertyAddress: 'Cra 2', tenantName: 'Ana', tenantPhone: '301', propietarioName: 'Pro', contractEndDate: '2026-11-01', daysUntilExpiry: 57, renewalStatus: 'negotiating', bucket: '31-60' },
    ],
  }
  const h = (report: unknown) => () => ({
    report, isLoading: false, error: null, errorCrudo: null,
    refetch: () => Promise.resolve(report),
  })
  return {
    useCarteraReport: h(CARTERA),
    useOcupacionReport: h(OCUPACION),
    useComisionesReport: h(COMISIONES),
    useFlujoCajaReport: h(FLUJO),
    useRendimientoAgentesReport: h(RENDIMIENTO),
    useVencimientosReport: h(VENCIMIENTOS),
  }
})

vi.mock('@/lib/hooks/useAgencyPlan', () => ({
  useAgencyPlan: () => ({ hasAdvancedReports: true, hasFeature: () => true, plan: 'pro' }),
}))

import ReportesPage from './page'

let container: HTMLDivElement
let root: Root
const capturado: string[] = []
let origError: typeof console.error
let origWarn: typeof console.warn

/** Ver el ⚠️ del encabezado: artefacto del harness, no del navegador. */
const ES_ARTEFACTO_DE_STYLED_JSX = (aviso: string) =>
  aviso.includes('for a non-boolean attribute') && aviso.includes('ReportPDFExport')

function avisosReales(): string[] {
  return capturado.filter((a) => !ES_ARTEFACTO_DE_STYLED_JSX(a))
}

beforeEach(() => {
  capturado.length = 0
  origError = console.error
  origWarn = console.warn
  console.error = (...a: unknown[]) => { capturado.push(a.map(String).join(' ')) }
  console.warn = (...a: unknown[]) => { capturado.push(a.map(String).join(' ')) }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  console.error = origError
  console.warn = origWarn
})

const TABS = ['ocupacion', 'cobros', 'agentes', 'ejecutivo']
const TITULOS = [
  'Extractos Propietarios', 'Cartera por Edades', 'Comisiones por Agente',
  'Ocupacion del Portafolio', 'Vencimientos de Contratos', 'Rendimiento de Agentes',
  'Flujo de Caja', 'Rentabilidad por inmueble',
]

async function montar() {
  await act(async () => { root.render(<React.StrictMode><ReportesPage /></React.StrictMode>) })
  await act(async () => { await Promise.resolve() })
}

function botonPorTexto(txt: string) {
  return Array.from(container.querySelectorAll('button')).find(
    (b) => (b.textContent ?? '').toLowerCase().includes(txt.toLowerCase()),
  )
}

describe('/reportes — la consola queda limpia', () => {
  it('al montar y al recorrer las cuatro pestañas avanzadas', async () => {
    await montar()
    expect(avisosReales(), 'al montar').toEqual([])

    for (const tab of TABS) {
      const b = botonPorTexto(tab.slice(0, 6))
      expect(b, `no encontré la pestaña ${tab}`).toBeTruthy()
      await act(async () => { b!.click() })
      await act(async () => { await Promise.resolve() })
      expect(avisosReales(), `pestaña ${tab}`).toEqual([])
    }
  })

  it('al abrir el cajón de vista previa de los ocho reportes', async () => {
    await montar()

    let abiertos = 0
    for (const titulo of TITULOS) {
      const tarjeta = Array.from(container.querySelectorAll('div')).find(
        (d) => d.querySelector('h3')?.textContent?.trim() === titulo,
      )
      const ver = tarjeta
        ? Array.from(tarjeta.querySelectorAll('button')).find((b) => /vista previa|previa|ver/i.test(b.textContent ?? ''))
        : undefined
      expect(ver, `no encontré cómo abrir «${titulo}»`).toBeTruthy()

      await act(async () => { ver!.click() })
      await act(async () => { await Promise.resolve() })
      abiertos += 1
      expect(avisosReales(), `cajón de «${titulo}»`).toEqual([])

      const cerrar = Array.from(document.querySelectorAll('button')).find(
        (b) => /cerrar|close/i.test(b.getAttribute('aria-label') ?? ''),
      )
      if (cerrar) {
        await act(async () => { cerrar.click() })
        await act(async () => { await Promise.resolve() })
      }
      capturado.length = 0
    }

    // Si mañana cambian los títulos y el bucle no abre nada, el test tiene que
    // ponerse en rojo en vez de pasar sin haber probado nada.
    expect(abiertos).toBe(TITULOS.length)
  })

  it('en vista de lista y con una búsqueda sin resultados', async () => {
    await montar()

    const lista = botonPorTexto('lista')
    expect(lista, 'no encontré el cambio a vista de lista').toBeTruthy()
    await act(async () => { lista!.click() })
    await act(async () => { await Promise.resolve() })
    expect(avisosReales(), 'vista de lista').toEqual([])

    const input = container.querySelector('input') as HTMLInputElement | null
    expect(input, 'no encontré el buscador').toBeTruthy()
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      setter?.call(input!, 'zzzzz')
      input!.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => { await new Promise((r) => setTimeout(r, 400)) })

    expect(container.textContent).not.toContain('Cartera por Edades')
    expect(avisosReales(), 'búsqueda sin resultados').toEqual([])
  })
})
