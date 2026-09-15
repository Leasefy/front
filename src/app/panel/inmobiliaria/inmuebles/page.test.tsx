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

const { consignacionesMock } = vi.hoisted(() => ({ consignacionesMock: vi.fn() }))

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
vi.mock('@/components/inmobiliaria/ConsignacionFilters', () => ({ ConsignacionFilters: () => null }))
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

describe('Portafolio — los tiles no dicen «0» cuando no saben (L1)', () => {
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
    consignacionesMock.mockReset()
  })

  function tiles() {
    return Array.from(container.querySelectorAll('[data-testid="kpi-valor"]')) as HTMLElement[]
  }

  function montar() {
    act(() => {
      root.render(<PortafolioPage />)
    })
  }

  it('mientras carga, los cinco tiles son un hueco, no un 0 que después salta', () => {
    consignacionesMock.mockReturnValue({ consignaciones: [], isLoading: true, errorCrudo: null, refetch: vi.fn() })
    montar()

    expect(tiles()).toHaveLength(5)
    expect(tiles().every((t) => t.dataset.estado === 'cargando')).toBe(true)
  })

  it('con la carga caída, los cinco tiles dicen «—» y no afirman ningún número', () => {
    consignacionesMock.mockReturnValue({
      consignaciones: [],
      isLoading: false,
      errorCrudo: new ApiError(500, 'Internal server error'),
      refetch: vi.fn(),
    })
    montar()

    expect(tiles()).toHaveLength(5)
    expect(tiles().every((t) => t.dataset.estado === 'fallo')).toBe(true)
    expect(tiles().some((t) => /\d/.test(t.textContent ?? ''))).toBe(false)
    // Y la tabla, en el mismo hueco, dice lo mismo: no se pudo cargar.
    expect(container.querySelector('[data-testid="fallo-de-carga"]')).not.toBeNull()
  })

  it('con datos, los tiles cuentan: el arrendado lo dice el contrato, no la disponibilidad', () => {
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

    expect(tiles().every((t) => t.dataset.estado === 'ok')).toBe(true)
    expect(tiles().map((t) => t.textContent)).toEqual(['3', '1', '1', '0', '1'])
  })

  it('una cartera que de verdad está vacía sí dice 0: ese cero es un dato', () => {
    consignacionesMock.mockReturnValue({ consignaciones: [], isLoading: false, errorCrudo: null, refetch: vi.fn() })
    montar()

    expect(tiles().map((t) => t.textContent)).toEqual(['0', '0', '0', '0', '0'])
  })
})
