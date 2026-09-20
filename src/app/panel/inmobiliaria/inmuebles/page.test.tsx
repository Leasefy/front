/**
 * @vitest-environment happy-dom
 *
 * L1: los tiles del portafolio se pintaban FUERA del `EstadoDeDatos` de la
 * tabla. Con el back caído la tabla decía «no se pudo cargar» y un renglón
 * arriba los tiles afirmaban «0 totales · 0 arrendados»; mientras cargaba, un
 * «0» que después saltaba al número real.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { ApiError } from '@/lib/api/client'
import type { Consignacion } from '@/lib/types/inmobiliaria'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { consignacionesMock, filtrosSpy } = vi.hoisted(() => ({
  consignacionesMock: vi.fn(),
  /** Con qué conteo se llama a la franja de filtros. */
  filtrosSpy: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/panel/inmobiliaria/inmuebles',
}))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))
vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_t, tag: string) =>
        ({ children, initial, animate, exit, transition, whileHover, whileTap, layout, ...rest }: Record<string, unknown> & { children?: React.ReactNode }) =>
          React.createElement(tag, rest, children),
    },
  ),
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}))
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}))
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: () => true, isLoading: false }),
}))
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useConsignaciones: () => consignacionesMock(),
  useInmueblesSinConsignacion: () => ({ inmuebles: [], errorCrudo: null, refetch: vi.fn() }),
  usePropietarios: () => ({ propietarios: [] }),
  useAgentes: () => ({ agentes: [] }),
}))
vi.mock('@/lib/api/inmobiliaria.service', () => ({ consignacionesApi: { delete: vi.fn() } }))
vi.mock('@/lib/inventario/copia-de-inmueble', () => ({ guardarCopia: vi.fn() }))
vi.mock('@/lib/inventario/sw-inventario', () => ({ prepararRutaSinSenal: vi.fn() }))
vi.mock('@leasefy/cadence', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  SegmentedControl: () => null,
}))
vi.mock('@/components/ui/pagination', () => ({ TablePagination: () => null }))
vi.mock('@/components/inmobiliaria/ConsignacionTable', () => ({ ConsignacionTable: () => null }))
vi.mock('@/components/inmobiliaria/ConsignacionCard', () => ({ ConsignacionCard: () => null }))
vi.mock('@/components/inmobiliaria/InmuebleSinMandatoCard', () => ({ InmuebleSinMandatoCard: () => null }))
vi.mock('@/components/inmobiliaria/DisponiblesSinSenal', () => ({ DisponiblesSinSenal: () => null }))
vi.mock('@/components/inmobiliaria/ConsignacionFilters', () => ({
  ConsignacionFilters: (props: Record<string, unknown>) => {
    filtrosSpy(props)
    return null
  },
}))
vi.mock('@/components/inmobiliaria/agenda/PedirCitaModal', () => ({ PedirCitaModal: () => null }))
vi.mock('@/components/inmobiliaria/CompletarMandatoDialog', () => ({ CompletarMandatoDialog: () => null }))

import PortafolioPage from './page'

function consignacion(id: string, extra: Partial<Consignacion> = {}): Consignacion {
  return {
    id,
    propertyId: `prop-${id}`,
    propietarioId: 'owner-1',
    copropietarios: [{ propietarioId: 'owner-1', participacionBps: 10000 }],
    agenteId: 'agente-1',
    propertyTitle: `Inmueble ${id}`,
    propertyAddress: 'Cra 1 #1-1',
    propertyCity: 'Medellín',
    propertyZone: 'Laureles',
    propertyType: 'apartment',
    monthlyRent: 2_000_000,
    commissionPercent: 10,
    listingType: 'rent',
    saleCommissionPercent: null,
    propertyCode: null,
    contractDate: '2026-01-01',
    status: 'active',
    availability: 'available',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...extra,
  }
}

describe('Portafolio — los conteos que la franja recibe', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    filtrosSpy.mockClear()
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    consignacionesMock.mockReset()
  })

  /*
   * 🔴 19-09 · Los cinco números vivían en fichas de sólo lectura ENCIMA de la
   * tabla, y el filtro era otro control con otra cuenta. Eso produjo tres
   * defectos a la vez, vistos en el navegador con los 133 de la agencia de QA:
   * la franja decía «133 Total» y las cuatro fichas sumaban 109; un inmueble
   * arrendado Y en mantenimiento se contaba dos veces; y la ficha
   * «Arrendadas 105» no coincidía con el chip «Arrendado 104».
   *
   * Ahora el número y la forma de ver ese número son el MISMO control —es lo
   * que Nico ya pidió dos veces este mes: «esto tiene que hacer parte de la
   * tabla»— y salen de una partición exhaustiva (`cajon-del-inmueble.ts`).
   * Lo que se mira acá es lo que la PÁGINA calcula; que los chips lo pinten
   * bien lo fija `ConsignacionFilters.test.tsx`.
   */
  function montar() {
    act(() => {
      root.render(<PortafolioPage />)
    })
  }

  const ultimo = () =>
    filtrosSpy.mock.calls.at(-1)![0] as {
      conteo: Record<string, number> | null
      total: number | null
    }

  it('🔴 mientras carga, el conteo es `null`: un cero es un dato, «no sé» no es cero', () => {
    consignacionesMock.mockReturnValue({ consignaciones: [], isLoading: true, errorCrudo: null, refetch: vi.fn() })
    montar()
    expect(ultimo().conteo).toBeNull()
    expect(ultimo().total).toBeNull()
  })

  it('🔴 con la carga caída tampoco se afirma ningún número', () => {
    consignacionesMock.mockReturnValue({
      consignaciones: [],
      isLoading: false,
      errorCrudo: new ApiError(500, 'Internal server error'),
      refetch: vi.fn(),
    })
    montar()
    expect(ultimo().conteo).toBeNull()
    // Y la tabla, en el mismo hueco, dice lo mismo: no se pudo cargar.
    expect(container.querySelector('[data-testid="fallo-de-carga"]')).not.toBeNull()
  })

  it('🔴 el arrendado lo dice el CONTRATO, no la disponibilidad del mandato', () => {
    consignacionesMock.mockReturnValue({
      consignaciones: [
        consignacion('a', { availability: 'available', arrendado: false }),
        // Mandato que sigue diciendo «disponible» con un contrato vigente.
        consignacion('b', { availability: 'available', arrendado: true }),
        consignacion('c', { availability: 'maintenance', arrendado: false }),
      ],
      isLoading: false,
      errorCrudo: null,
      refetch: vi.fn(),
    })
    montar()
    expect(ultimo().conteo).toEqual({
      disponible: 1,
      arrendado: 1,
      enProceso: 0,
      mantenimiento: 1,
      sinMandato: 0,
    })
    expect(ultimo().total).toBe(3)
  })

  it('🔴 LOS CINCO CAJONES SUMAN EL TOTAL: se puede conciliar a ojo', () => {
    consignacionesMock.mockReturnValue({
      consignaciones: [
        consignacion('a', { availability: 'available', arrendado: false }),
        consignacion('b', { availability: 'available', arrendado: true }),
        // Arrendado Y en mantenimiento: antes sumaba en las DOS fichas y
        // hacía que 3 + 105 + 0 + 1 diera 109 sobre 108 mandatos.
        consignacion('c', { availability: 'maintenance', arrendado: true }),
      ],
      isLoading: false,
      errorCrudo: null,
      refetch: vi.fn(),
    })
    montar()
    const { conteo, total } = ultimo()
    const suma = Object.values(conteo!).reduce((s, n) => s + n, 0)
    expect(suma).toBe(total)
    expect(conteo!.arrendado).toBe(2)
    expect(conteo!.mantenimiento).toBe(0)
  })

  it('una cartera que de verdad está vacía sí dice 0: ese cero es un dato', () => {
    consignacionesMock.mockReturnValue({ consignaciones: [], isLoading: false, errorCrudo: null, refetch: vi.fn() })
    montar()
    expect(ultimo().total).toBe(0)
    expect(ultimo().conteo).toEqual({
      disponible: 0,
      arrendado: 0,
      enProceso: 0,
      mantenimiento: 0,
      sinMandato: 0,
    })
  })
})
