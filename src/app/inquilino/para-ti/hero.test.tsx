/**
 * El hero de "Propiedades para ti".
 *
 * Lo que se protege acá no es el diseño, son dos cosas que ya salieron mal:
 *
 *  1. **El número tiene que ser el conteo real.** Antes salía de
 *     `getAccessiblePropertiesPercentage(riskLevel)`, una tabla fija por letra
 *     (A=95, B=85, C=60, D=30) que no mira el catálogo. La pantalla anunciaba
 *     "95% de propiedades accesibles" justo encima de "0 propiedades
 *     encontradas": se desmentía sola.
 *
 *  2. **La superficie de marca no puede pintarse con `bg-primary`.** En tema
 *     oscuro `--primary` se vuelve `--indigo-300` (#8A9FFF) y el texto blanco
 *     encima queda en 2,48:1. `--brand` es cobalto fijo en los dos temas.
 *     De la misma familia: los iconos iban en `text-success` (1,32:1) y
 *     `text-primary` (1,00:1 — el escudo era literalmente invisible).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { recomendaciones } = vi.hoisted(() => ({
  recomendaciones: { actuales: [] as unknown[] },
}))

const propiedad = (id: string, monthlyRent: number) => ({
  property: { id, monthlyRent, title: `Inmueble ${id}` },
  matchScore: 80,
  acceptanceProbability: 'alta' as const,
  recommendation: 'ok',
})

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
  useOptionalI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

vi.mock('@/lib/hooks/useRecommendations', () => ({
  useRecommendations: () => ({
    recommendations: recomendaciones.actuales,
    isLoading: false,
    errorCrudo: null,
    refetch: () => {},
  }),
}))

vi.mock('@/lib/hooks/use-aprobacion', () => ({
  useAprobacion: () => ({ aprobacion: null, vigente: false, cargando: false, error: null, recargar: () => {} }),
}))

vi.mock('@/lib/context/TenantProfileContext', () => ({
  useTenantProfile: () => ({
    hasVerifiedProfile: true,
    isLoading: false,
    profile: {
      fullName: 'María Restrepo',
      availableForRent: 2_500_000,
      contractType: 'indefinite',
      hasIncomeProof: true,
      hasEmploymentLetter: true,
      riskLevel: 'A',
    },
  }),
  RISK_LEVEL_LABELS: { A: 'Excelente', B: 'Bueno', C: 'Moderado', D: 'Bajo' },
  // Los dos que usaba el hero viejo. Se conservan en el doble para poder
  // correr este test contra la versión anterior y verlo fallar de verdad.
  RISK_LEVEL_COLORS: { A: {}, B: {}, C: {}, D: {} },
  getAccessiblePropertiesPercentage: (n: 'A' | 'B' | 'C' | 'D') =>
    ({ A: 95, B: 85, C: 60, D: 30 })[n],
}))

// Hijos pesados: el hero no depende de ninguno.
vi.mock('@/components/tenant/PropertyMatchCard', () => ({ PropertyMatchCard: () => null }))
vi.mock('@/components/tenant/TopeAprobadoBanner', () => ({ TopeAprobadoBanner: () => null }))
vi.mock('@/components/tenant/QueSignificaPostularse', () => ({ QueSignificaPostularse: () => null }))
vi.mock('@/components/tenant/CatalogoPorAprobacion', () => ({ CatalogoPorAprobacion: () => null }))
vi.mock('@/components/tenant/PropertyDetailSheet', () => ({ PropertyDetailSheet: () => null }))
vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SelectContent: () => null,
  SelectItem: () => null,
  SelectValue: () => null,
}))

import ParaTiPage from './page'

let host: HTMLDivElement
let root: Root

const pintar = async () => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(<ParaTiPage />)
  })
}

beforeEach(() => {
  recomendaciones.actuales = []
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

/** El bloque de marca: es el único `<section>` de la página. */
const hero = () => host.querySelector('section') as HTMLElement

describe('hero de Propiedades para ti', () => {
  it('muestra el conteo real, no un porcentaje de tabla', async () => {
    recomendaciones.actuales = Array.from({ length: 12 }, (_, i) => propiedad(`p${i}`, 1_800_000))
    await pintar()

    expect(hero().textContent).toContain('12')
    expect(hero().textContent).toContain('propiedades caben en tu tope')
    // La tabla fija daba 95 para un score A. Ese número ya no puede aparecer.
    expect(hero().textContent).not.toContain('95')
    expect(hero().textContent).not.toContain('%')
  })

  it('con catálogo vacío dice cero en vez de presumir', async () => {
    await pintar()

    const conteo = hero().querySelector('.text-5xl') as HTMLElement
    expect(conteo.textContent).toBe('0')
    expect(hero().textContent).toContain('propiedades caben en tu tope')
  })

  it('singulariza cuando cabe una sola', async () => {
    recomendaciones.actuales = [propiedad('p1', 1_500_000)]
    await pintar()

    expect(hero().textContent).toContain('propiedad cabe en tu tope')
    expect(hero().textContent).not.toContain('propiedades caben')
  })

  it('pinta la marca con un cobalto que no cambia con el tema', async () => {
    await pintar()

    // `bg-primary` se vuelve #8A9FFF en oscuro y deja el blanco en 2,48:1.
    expect(hero().className).toContain('bg-brand')
    expect(hero().className).not.toContain('bg-primary')
  })

  it('no usa acentos semánticos sobre el cobalto', async () => {
    await pintar()

    // text-success mide 1,32:1 sobre este fondo; text-primary, 1,00:1.
    const infractores = Array.from(hero().querySelectorAll<HTMLElement>('*')).filter((el) =>
      /(^|\s)(text|bg)-(success|warning|danger)(\s|$)/.test(el.className) ||
      /(^|\s)text-primary(\s|$)/.test(el.className),
    )
    expect(infractores.map((el) => el.className)).toEqual([])
  })
})
