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
  useRouter: () => ({ push, replace: () => {}, back: () => {} }),
  usePathname: () => '/panel/inmobiliaria/reportes',
  useSearchParams: () => new URLSearchParams(),
}))

const { toast, exportarReportes, abrirCentroDeProcesos, push } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), loading: vi.fn(), warning: vi.fn() },
  exportarReportes: vi.fn(),
  abrirCentroDeProcesos: vi.fn(),
  push: vi.fn(),
}))

vi.mock('@/components/ui/toast', () => ({ toast }))

vi.mock('@/lib/api/procesos.service', () => ({
  procesosApi: { exportarReportes },
  abrirCentroDeProcesos,
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
  // Una CUOTA del contrato: la unidad del informe desde el 16-09. `cajon`
  // dice de qué lado de la frontera está y `diasDeMora` son los días DESPUÉS
  // del plazo del contrato.
  const item = (n: number, dias: number, cajon = 'CARTERA') => ({
    cuotaId: 'q' + n, cobroId: null, contractId: 'ct' + n, contrato: '#' + n,
    contratoDeLeasefy: null, propertyId: 'i' + n, consignacionId: 'c' + n,
    propertyTitle: 'Apto ' + n, propertyAddress: 'Cra 1',
    tenantName: 'Inq ' + n, tenantPhone: '3000', tenantDocument: '10' + n,
    propietarioId: 'p', propietarioName: 'Pro',
    agenteId: 'a', agenteName: 'Ana', month: '2026-09', vence: '2026-09-05',
    estado: 'PENDIENTE', cajon, diasDeMora: dias, diasDePlazo: 3, esVencida: cajon !== 'POR_VENCER',
    totalAmount: 1000000, paidAmount: 0, pendingAmount: 1000000 - n,
    remindersSent: 2, lastReminderDate: null,
  })
  const CARTERA = {
    generadoEn: '2026-09-05T00:00:00.000Z',
    hoy: '2026-09-05',
    items: [item(1, 12), item(2, 40), item(3, 0, 'POR_VENCER')],
    summary: {
      deudaTotalCop: 2999994, porVencerCop: 999997, vencidaEnPlazoCop: 0,
      carteraCop: 1999997, carteraVivaCop: 1999997, enSiniestroCop: 0,
      bucket0to30: 999999, bucket31to60: 999998, bucket61to90: 0, bucket90plus: 0,
      cuotas: 3, cuotasPorVencer: 1, cuotasVencidasEnPlazo: 0, cuotasEnCartera: 2,
      cuotasEnSiniestro: 0,
    },
    byMonth: [
      { month: '2026-08', total: 5000000, collected: 4000000, overdue: 1000000, cuotas: 5, collectionRate: 80 },
      { month: '2026-09', total: 5000000, collected: 2000000, overdue: 3000000, cuotas: 5, collectionRate: 40 },
    ],
    siniestros: { cantidad: 0, totalCop: 0, diasParaSiniestro: 30, items: [] },
    sinCamino: { sinInmueble: 0, sinMandato: 0, sinPropietario: 0, sinAgente: 0, sinDireccion: 0, sinTelefono: 0 },
    contratosSinCuotas: 0,
    avisos: [],
  }
  // 17-09: el informe ya no le atribuye pesos a ningún asesor — la comisión es
  // de la inmobiliaria y por asesor sólo quedan los arriendos cerrados.
  const COMISIONES = {
    period: '2026-09',
    comisionDeLaAgenciaCop: 900000,
    contratosConComision: 7,
    totalClosedDeals: 4,
    topAgentUserId: 'a1',
    agentes: [
      { userId: 'a1', closedDeals: 3 },
      { userId: 'a2', closedDeals: 1 },
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
  const fila = (n: number, neto: number) => ({
    consignacionId: 'c' + n, propertyId: 'i' + n, inmueble: 'Apto ' + n, zona: 'Sabaneta',
    canonCop: 2000000, mesesArrendado: 12, mesesEnElRango: 12, ocupacionPct: 100,
    esperadoCop: 24000000, recaudadoCop: 24000000, pendienteCop: 0, enMoraCop: 0, tasaDeRecaudoPct: 100,
    comisionCop: 2400000, retencionesYCargosCop: 0, gastosMantenimientoCop: 0,
    netoPropietarioCop: neto, ingresoPerdidoPorVacanciaCop: 0, valorComercialCop: null, rentabilidadAnualPct: null,
  })
  const RENTABILIDAD = {
    desde: '2025-10', hasta: '2026-09', meses: 12, generatedAt: '2026-09-05T00:00:00.000Z',
    filas: [fila(1, 21600000), fila(2, 20000000)],
    totales: {
      inmuebles: 2, esperadoCop: 48000000, recaudadoCop: 48000000, pendienteCop: 0, enMoraCop: 0,
      tasaDeRecaudoPct: 100, comisionCop: 4800000, retencionesYCargosCop: 0, gastosMantenimientoCop: 0,
      netoPropietarioCop: 41600000, ocupacionPromedioPct: 100, ingresoPerdidoPorVacanciaCop: 0, conValor: 0,
      gastosDescontadosEnElReporte: true,
    },
    notas: [],
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
    useRentabilidadReport: h(RENTABILIDAD),
  }
})

// El gráfico de rentabilidad es de recharts: en happy-dom no hay layout, mide
// 0×0 y avisa en consola. En el navegador tiene su tamaño. Mismo doble que la
// prueba de la pantalla de rentabilidad.
vi.mock('@/components/inmobiliaria/reports/GraficoDeRentabilidad', () => ({
  GraficoDeRentabilidad: ({ filas }: { filas: unknown[] }) => (
    <div data-testid="grafico-rentabilidad">{filas.length} inmuebles</div>
  ),
}))

vi.mock('@/lib/hooks/useAgencyPlan', () => ({
  useAgencyPlan: () => ({ hasAdvancedReports: true, hasFeature: () => true, plan: 'pro' }),
}))

import ReportesPage from './page'
import { ApiError } from '@/lib/api/client'

let container: HTMLDivElement
let root: Root
const capturado: string[] = []
let origError: typeof console.error
let origWarn: typeof console.warn

/**
 * Ver el ⚠️ del encabezado: artefacto del harness, no del navegador. Desde
 * React 19 el aviso ya no trae el nombre del componente en el texto (va en la
 * pila aparte), así que se reconoce por los DOS atributos de styled-jsx, `jsx`
 * y `global`, que son los únicos que puede nombrar.
 */
const ES_ARTEFACTO_DE_STYLED_JSX = (aviso: string) =>
  aviso.includes('for a non-boolean attribute') && /\b(jsx|global)\b/.test(aviso)

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

const TITULOS = [
  'Extractos Propietarios', 'Cartera por Edades', 'Comisiones por Agente',
  // 20-09: el catálogo se escribió sin tildes («Ocupacion», «Analisis de mora
  // segmentado por antiguedad», «proximos 90 dias») y se lee así en pantalla.
  'Ocupación del Portafolio', 'Vencimientos de Contratos', 'Rendimiento de Agentes',
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
  it('al montar', async () => {
    await montar()
    expect(avisosReales(), 'al montar').toEqual([])
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

/** Abre el cajón de la tarjeta con ese título y devuelve el cajón. */
async function abrirCajon(titulo: string): Promise<HTMLElement> {
  const tarjeta = Array.from(container.querySelectorAll('div')).find(
    (d) => d.querySelector('h3')?.textContent?.trim() === titulo,
  )
  const ver = tarjeta
    ? Array.from(tarjeta.querySelectorAll('button')).find((b) => /vista previa/i.test(b.textContent ?? ''))
    : undefined
  expect(ver, `no encontré «Vista previa» de «${titulo}»`).toBeTruthy()
  await act(async () => { ver!.click() })
  await act(async () => { await Promise.resolve() })
  const cajon = document.querySelector<HTMLElement>('[role="dialog"]')
  expect(cajon, `no se abrió el cajón de «${titulo}»`).toBeTruthy()
  return cajon!
}

describe('«Reportes» — un reporte a la vez (Nico, 01-10)', () => {
  beforeEach(() => {
    exportarReportes.mockReset()
    abrirCentroDeProcesos.mockReset()
    push.mockReset()
    toast.loading.mockReset()
    toast.success.mockReset()
  })

  it('🔴 la página ya no apila las tablas de «Reportes Avanzados» debajo del catálogo', async () => {
    await montar()
    expect(container.textContent).not.toContain('Reportes Avanzados')
    expect(container.textContent).not.toContain('Detalle por propiedad')
  })

  it('🔴 la vista completa vive en el cajón: ocupación trae su detalle por propiedad', async () => {
    await montar()
    const cajon = await abrirCajon('Ocupación del Portafolio')
    expect(cajon.textContent).toContain('Detalle por propiedad')
    expect(cajon.textContent).toContain('Apto 101')
  })

  it('🔴 «Vista previa» de rentabilidad muestra la vista en el cajón y NO navega', async () => {
    await montar()
    const cajon = await abrirCajon('Rentabilidad por inmueble')
    expect(push).not.toHaveBeenCalled()
    expect(cajon.textContent).toContain('Neto al propietario')
    const completa = cajon.querySelector<HTMLElement>('[data-testid="ver-rentabilidad-completa"]')
    expect(completa).not.toBeNull()
    await act(async () => { completa!.click() })
    expect(push).toHaveBeenCalledWith('/panel/inmobiliaria/reportes/rentabilidad')
  })

  it('los extractos dicen dónde están, y su cajón no ofrece un «Descargar CSV» que no baja nada', async () => {
    await montar()
    const cajon = await abrirCajon('Extractos Propietarios')
    expect(cajon.textContent).toContain('Ir a dispersiones')
    expect(cajon.textContent).not.toContain('Descargar CSV')
  })

  it('cada cajón dice qué hace el archivo con el período elegido, al lado del botón', async () => {
    await montar()
    const cajon = await abrirCajon('Cartera por Edades')
    expect(cajon.querySelector('[data-testid="nota-del-archivo"]')?.textContent).toContain('foto de hoy')
  })

  it('🔴 «Generar todos» manda UN pedido al centro de procesos y lo abre: sin pila de avisos', async () => {
    exportarReportes.mockResolvedValue({ procesoId: 'proc-1' })
    await montar()
    const generar = botonPorTexto('generar')
    expect(generar).toBeTruthy()
    await act(async () => { generar!.click() })
    await act(async () => { await Promise.resolve() })

    expect(exportarReportes).toHaveBeenCalledTimes(1)
    const pedidos = exportarReportes.mock.calls[0]![0] as Array<{ tipo: string }>
    // Los seis que el back sabe armar; los extractos y el rendimiento no.
    expect(pedidos.map((p) => p.tipo).sort()).toEqual([
      'cartera-edades', 'comisiones-agente', 'flujo-caja', 'ocupacion-portafolio',
      'rentabilidad-inmueble', 'vencimientos',
    ])
    expect(abrirCentroDeProcesos).toHaveBeenCalledWith({ procesoId: 'proc-1' })
    expect(toast.loading).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })
})

/*
 * 02-10-2026 · «Generar todos» con la regla de oro: el 403 conserva su texto
 * propio; lo demás ya no es «Prueba de nuevo en un momento» para todo. Un 5xx
 * dice «de nuestro lado» con la referencia; «conexión», sólo sin respuesta.
 */
describe('«Generar todos» — los fallos (02-10)', () => {
  beforeEach(() => {
    exportarReportes.mockReset()
    toast.error.mockReset()
  })

  async function generarCon(error: unknown) {
    exportarReportes.mockRejectedValue(error)
    await montar()
    await act(async () => { botonPorTexto('generar')!.click() })
    await act(async () => { await Promise.resolve() })
    const [titulo, opciones] = toast.error.mock.calls.at(-1) as [string, { description: string }]
    return { titulo, descripcion: opciones.description }
  }

  it('🔴 un 5xx: «de nuestro lado» con la referencia', async () => {
    const { titulo, descripcion } = await generarCon(
      new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        referencia: 'ab12cd34',
      }),
    )
    expect(titulo).toBe('No pudimos armar el archivo')
    expect(descripcion).toContain('No pudimos armar el archivo de los reportes: algo falló de nuestro lado')
    expect(descripcion).toContain('ab12cd34')
  })

  it('el 403 conserva su texto propio', async () => {
    const { descripcion } = await generarCon(new ApiError(403, 'Esta acción es para administradores.'))
    expect(descripcion).toBe('Tu rol no incluye descargar reportes.')
  })

  it('sin respuesta: ahí sí habla de la conexión', async () => {
    const { descripcion } = await generarCon(new ApiError(0, 'Failed to fetch'))
    expect(descripcion).toMatch(/conexi[oó]n/)
  })
})
