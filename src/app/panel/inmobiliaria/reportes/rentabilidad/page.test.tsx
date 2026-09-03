/**
 * page.test.tsx — Rentabilidad por inmueble.
 *
 * El hook está mockeado: acá se prueba lo que la pantalla hace con la
 * respuesta (totales, filas, orden por columna, vacío, error, rango inválido
 * y el CSV del mismo rango), no el back.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { RentabilidadFila, RentabilidadReport } from '@/lib/types/inmobiliaria'
import { formatCurrency } from '@/lib/format'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { useReportMock, pushMock, getBlobMock, descargarBlobMock, toastMock } = vi.hoisted(() => ({
  useReportMock: vi.fn(),
  pushMock: vi.fn(),
  getBlobMock: vi.fn(),
  descargarBlobMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  usePathname: () => '/panel/inmobiliaria/reportes/rentabilidad',
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: Record<string, unknown> & { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href, ...props }, children),
}))

vi.mock('sonner', () => ({ toast: toastMock }))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k }),
}))

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}))

vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useRentabilidadReport: (desde?: string, hasta?: string) => useReportMock(desde, hasta),
}))

vi.mock('@/lib/api/client', () => ({
  apiClient: { getBlob: getBlobMock },
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number) {
      super('api')
      this.status = status
    }
  },
}))

vi.mock('@/lib/reportes/exportables', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/reportes/exportables')>()),
  descargarBlob: descargarBlobMock,
}))

vi.mock('@/components/inmobiliaria/reports/GraficoDeRentabilidad', () => ({
  TOP_DEL_GRAFICO: 10,
  GraficoDeRentabilidad: ({ filas }: { filas: unknown[] }) =>
    React.createElement('div', { 'data-testid': 'grafico', 'data-barras': filas.length }),
}))

vi.mock('@/components/estado/EstadoDeDatos', () => ({
  EstadoDeDatos: ({
    cargando,
    error,
    vacio,
    esqueleto,
    cuandoVacio,
    children,
  }: {
    cargando: boolean
    error?: unknown
    vacio?: boolean
    esqueleto?: React.ReactNode
    cuandoVacio?: React.ReactNode
    children: React.ReactNode
  }) => {
    if (cargando) return React.createElement('div', { 'data-testid': 'cargando' }, esqueleto)
    if (error) return React.createElement('div', { 'data-testid': 'fallo-de-carga' }, String(error))
    if (vacio) return React.createElement(React.Fragment, null, cuandoVacio)
    return React.createElement(React.Fragment, null, children)
  },
}))

vi.mock('@/components/estado/SinDatos', () => ({
  SinDatos: ({ titulo }: { titulo: string }) => React.createElement('div', { 'data-testid': 'sin-datos' }, titulo),
}))

vi.mock('@/components/estado/EsqueletoTabla', () => ({
  EsqueletoTabla: () => React.createElement('div', { 'data-testid': 'esqueleto-tabla' }),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, variant, size, hideArrow, asChild, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
    void variant; void size; void hideArrow; void asChild
    return React.createElement('button', props, children)
  },
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => React.createElement('input', props),
}))

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => React.createElement('label', props, children),
}))

vi.mock('@/components/ui/section-label', () => ({
  SectionLabel: ({ children }: { children?: React.ReactNode }) => React.createElement('p', null, children),
}))

vi.mock('@/components/ui/pagination', () => ({
  TablePagination: () => React.createElement('div', { 'data-testid': 'pagination' }),
}))

vi.mock('@leasefy/cadence', () => ({
  SegmentedControl: ({ options, value, onChange }: { options: Array<{ value: string; label: React.ReactNode }>; value: string; onChange: (v: string) => void }) =>
    React.createElement(
      'div',
      { role: 'radiogroup' },
      options.map((o) =>
        React.createElement(
          'button',
          { key: o.value, type: 'button', role: 'radio', 'aria-checked': o.value === value, onClick: () => onChange(o.value), 'data-preset': o.value },
          o.label,
        ),
      ),
    ),
  Stat: ({ label, value, delta }: { label: string; value: string; delta?: string }) =>
    React.createElement('div', { 'data-testid': 'stat', 'data-label': label }, React.createElement('strong', null, value), delta ? React.createElement('span', null, delta) : null),
  StatStrip: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement('div', props, children),
}))

vi.mock('@/components/ui/table', () => {
  const el = (tag: string) => {
    const MockEl = ({ children, numeric, muted, ...props }: { children?: React.ReactNode; numeric?: boolean; muted?: boolean }) => {
      void numeric; void muted
      return React.createElement(tag, props, children)
    }
    MockEl.displayName = `MockTable_${tag}`
    return MockEl
  }
  return {
    Table: el('table'),
    TableHeader: el('thead'),
    TableBody: el('tbody'),
    TableFooter: el('tfoot'),
    TableRow: el('tr'),
    TableHead: el('th'),
    TableCell: el('td'),
  }
})

// ── Import page AFTER mocks ───────────────────────────────────────────────
import RentabilidadPage from './page'

function fila(o: Partial<RentabilidadFila>): RentabilidadFila {
  return {
    consignacionId: 'c-1',
    propertyId: 'p-1',
    codigo: 14,
    propertyTitle: 'Apto 302 Chapinero',
    propertyAddress: 'Cra 7 # 45-10',
    propertyCity: 'Bogotá',
    propertyZone: 'Chapinero',
    propietarioId: 'o-1',
    propietarioNombre: 'Ana Díaz',
    canonCop: 2_000_000,
    canonDesconocido: false,
    mesesEnRango: 12,
    mesesConCobro: 12,
    esperadoCop: 24_000_000,
    recaudadoCop: 23_000_000,
    pendienteCop: 1_000_000,
    enMoraCop: 0,
    tasaDeRecaudoPct: 95.83,
    comisionCop: 2_300_000,
    retencionesYCargosCop: 100_000,
    gastosMantenimientoCop: 400_000,
    netoPropietarioCop: 20_200_000,
    margenNetoPct: 87.83,
    ocupacionPct: 100,
    ocupacionFuente: 'leases',
    diasEnRango: 365,
    diasVacantes: 0,
    ingresoPerdidoPorVacanciaCop: 0,
    valorInmuebleCop: 300_000_000,
    rentabilidadBrutaAnualPct: 8,
    rentabilidadNetaAnualPct: 6.73,
    estado: 'ACTIVE',
    availability: 'RENTED',
    ...o,
  }
}

function reporte(filas: RentabilidadFila[], notas: string[] = []): RentabilidadReport {
  return {
    desde: '2025-10',
    hasta: '2026-09',
    meses: 12,
    generatedAt: '2026-09-02T12:00:00Z',
    filas,
    totales: {
      inmuebles: filas.length,
      esperadoCop: 30_000_000,
      recaudadoCop: 27_000_000,
      pendienteCop: 3_000_000,
      enMoraCop: 500_000,
      tasaDeRecaudoPct: 90,
      comisionCop: 2_700_000,
      retencionesYCargosCop: 100_000,
      gastosMantenimientoCop: 400_000,
      netoPropietarioCop: 23_800_000,
      ocupacionPromedioPct: 91.5,
      ingresoPerdidoPorVacanciaCop: 1_200_000,
      conValor: 1,
      gastosDescontadosEnElReporte: true,
    },
    notas,
  }
}

function conReporte(report: RentabilidadReport | null, overrides: Record<string, unknown> = {}) {
  useReportMock.mockReturnValue({ report, isLoading: false, error: null, errorCrudo: null, refetch: vi.fn(), ...overrides })
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  useReportMock.mockReset()
  pushMock.mockReset()
  getBlobMock.mockReset()
  descargarBlobMock.mockReset()
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
  vi.clearAllMocks()
})

async function renderPage() {
  await act(async () => {
    root.render(React.createElement(RentabilidadPage))
  })
}

const filas = () => Array.from(container.querySelectorAll('[data-testid="fila-de-rentabilidad"]'))
const primeraFila = () => filas()[0].querySelector('td')?.textContent ?? ''
const click = async (el: Element | null) => {
  await act(async () => {
    el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

const DOS = [
  fila({ consignacionId: 'c-alto', propertyTitle: 'Zapote', netoPropietarioCop: 20_200_000 }),
  fila({ consignacionId: 'c-bajo', propertyTitle: 'Ábaco', codigo: null, netoPropietarioCop: 5_000_000, rentabilidadNetaAnualPct: null, valorInmuebleCop: null }),
]

describe('RentabilidadPage — totales y filas', () => {
  it('pinta los seis totales con la plata formateada', async () => {
    conReporte(reporte(DOS))
    await renderPage()

    const stats = Array.from(container.querySelectorAll('[data-testid="stat"]'))
    expect(stats).toHaveLength(6)
    expect(stats[0].textContent).toContain(formatCurrency(30_000_000))
    expect(stats[1].textContent).toContain(formatCurrency(27_000_000))
    expect(stats[3].textContent).toContain(formatCurrency(23_800_000))
    expect(stats[4].textContent).toContain('91,5')
  })

  it('pinta una fila por inmueble, con propietario y enlace a la ficha', async () => {
    conReporte(reporte(DOS))
    await renderPage()

    expect(filas()).toHaveLength(2)
    const primera = filas()[0]
    expect(primera.textContent).toContain('Zapote')
    expect(primera.textContent).toContain('#14')
    expect(primera.textContent).toContain('Ana Díaz')
    expect(primera.querySelector('a')?.getAttribute('href')).toBe('/panel/inmobiliaria/inmuebles/c-alto')
    expect(primera.textContent).toContain(formatCurrency(20_200_000))
  })

  it('sin valor comercial no inventa rentabilidad: «—» con su explicación', async () => {
    conReporte(reporte(DOS))
    await renderPage()

    const segunda = filas()[1]
    const celdas = segunda.querySelectorAll('td')
    const ultima = celdas[celdas.length - 1]
    expect(ultima.textContent?.trim()).toBe('—')
    expect(ultima.querySelector('[title]')?.getAttribute('title')).toBe('inmobiliaria.reportes.rentabilidad.table.noValue')
  })

  it('pinta la fila de totales y las notas del back', async () => {
    conReporte(reporte(DOS, ['Los gastos se descuentan del neto.']))
    await renderPage()

    expect(container.querySelector('[data-testid="fila-de-totales"]')?.textContent).toContain(formatCurrency(23_800_000))
    expect(container.querySelector('[data-testid="notas-del-reporte"]')?.textContent).toContain('Los gastos se descuentan del neto.')
    expect(container.querySelector('[data-testid="grafico"]')?.getAttribute('data-barras')).toBe('2')
  })
})

describe('RentabilidadPage — orden por columna', () => {
  it('arranca por neto descendente y el clic en el mismo encabezado lo invierte', async () => {
    conReporte(reporte(DOS))
    await renderPage()

    const neto = container.querySelector('[data-testid="ordenar-neto"]')
    expect(neto?.closest('th')?.getAttribute('aria-sort')).toBe('descending')
    expect(primeraFila()).toContain('Zapote')

    await click(neto)
    expect(neto?.closest('th')?.getAttribute('aria-sort')).toBe('ascending')
    expect(primeraFila()).toContain('Ábaco')
  })

  it('otra columna arranca en su orden natural: inmueble por título ascendente', async () => {
    conReporte(reporte(DOS))
    await renderPage()

    await click(container.querySelector('[data-testid="ordenar-inmueble"]'))
    expect(container.querySelector('[data-testid="ordenar-inmueble"]')?.closest('th')?.getAttribute('aria-sort')).toBe('ascending')
    expect(container.querySelector('[data-testid="ordenar-neto"]')?.closest('th')?.getAttribute('aria-sort')).toBe('none')
    expect(primeraFila()).toContain('Ábaco')
  })
})

describe('RentabilidadPage — estados', () => {
  it('vacío: sin filas muestra el vacío y no la tabla', async () => {
    conReporte(reporte([]))
    await renderPage()

    expect(container.querySelector('[data-testid="sin-datos"]')?.textContent).toBe('inmobiliaria.reportes.rentabilidad.empty.title')
    expect(filas()).toHaveLength(0)
  })

  it('error: muestra el fallo', async () => {
    conReporte(null, { errorCrudo: new Error('se cayó') })
    await renderPage()

    expect(container.querySelector('[data-testid="fallo-de-carga"]')).not.toBeNull()
  })

  it('cargando: esqueleto', async () => {
    conReporte(null, { isLoading: true })
    await renderPage()

    expect(container.querySelector('[data-testid="esqueleto-tabla"]')).not.toBeNull()
  })
})

describe('RentabilidadPage — periodo', () => {
  it('pide al back los últimos 12 meses por defecto y el preset cambia la consulta', async () => {
    conReporte(reporte(DOS))
    await renderPage()

    const [desde, hasta] = useReportMock.mock.calls[0]
    expect(hasta).toMatch(/^\d{4}-\d{2}$/)
    expect(desde < hasta).toBe(true)

    await click(container.querySelector('[data-preset="3m"]'))
    const ultima = useReportMock.mock.calls.at(-1)!
    expect(ultima[1]).toBe(hasta)
    expect(ultima[0] > desde).toBe(true)
  })

  it('un rango inválido avisa al lado del control y NO se pide', async () => {
    conReporte(reporte(DOS))
    await renderPage()
    const llamadasAntes = useReportMock.mock.calls.length
    const [, hasta] = useReportMock.mock.calls[0]

    const input = container.querySelector<HTMLInputElement>('#rentabilidad-desde')!
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(input, '2099-01')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(container.querySelector('[role="alert"]')?.textContent).toMatch(/anterior o igual/)
    expect(container.querySelector<HTMLButtonElement>('[data-testid="descargar-csv"]')?.disabled).toBe(true)
    const nuevas = useReportMock.mock.calls.slice(llamadasAntes)
    expect(nuevas.every(([d, h]) => d !== '2099-01' && h === hasta)).toBe(true)
  })
})

describe('RentabilidadPage — CSV', () => {
  it('baja el CSV del mismo rango que se está mirando', async () => {
    conReporte(reporte(DOS))
    getBlobMock.mockResolvedValue(new Blob(['a,b']))
    await renderPage()
    const [desde, hasta] = useReportMock.mock.calls[0]

    await click(container.querySelector('[data-testid="descargar-csv"]'))

    expect(getBlobMock).toHaveBeenCalledWith(
      `/inmobiliaria/reports/export?type=rentabilidad-inmueble&desde=${desde}&hasta=${hasta}`,
    )
    expect(descargarBlobMock).toHaveBeenCalledWith(expect.any(Blob), expect.stringMatching(/^rentabilidad-inmueble-\d{4}-\d{2}-\d{2}\.csv$/))
    expect(toastMock.success).toHaveBeenCalled()
  })
})
