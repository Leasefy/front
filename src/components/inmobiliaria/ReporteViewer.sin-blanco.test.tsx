/**
 * Nico, 01-10: «alguno como estos no muestra la vista previa».
 *
 * Cada vista del cajón hacía `if (!data) return null`: mientras el reporte
 * cargaba, si el pedido fallaba o si venía vacío, el cajón quedaba con una
 * caja en blanco. Y «Rentabilidad por inmueble» ni siquiera abría el cajón:
 * navegaba a su pantalla. Ahora ninguno queda en blanco.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { estado } = vi.hoisted(() => ({
  estado: { isLoading: false, errorCrudo: null as unknown },
}))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/lib/hooks/useInmobiliaria', () => {
  const sinReporte = () => ({
    report: null,
    isLoading: estado.isLoading,
    error: null,
    errorCrudo: estado.errorCrudo,
    refetch: () => Promise.resolve(null),
  })
  return {
    useCarteraReport: sinReporte,
    useOcupacionReport: sinReporte,
    useComisionesReport: sinReporte,
    useFlujoCajaReport: sinReporte,
    useRendimientoAgentesReport: sinReporte,
    useVencimientosReport: sinReporte,
    useRentabilidadReport: sinReporte,
  }
})

import { ReporteViewer } from './ReporteViewer'
import type { ReportDefinition, ReportId } from '@/lib/types/inmobiliaria'

const FILTROS = {
  period: { start: '2026-09-01', end: '2026-09-30' },
  zone: null,
  category: 'all' as const,
  search: '',
  favoritesOnly: false,
}

const reporte = (id: ReportId): ReportDefinition => ({
  id,
  title: id,
  description: 'descripción',
  category: 'financiero',
  icon: 'ChartBar',
  format: 'excel',
  frequency: 'monthly',
  isFavorite: false,
})

const CON_DATOS: ReportId[] = [
  'cartera-edades',
  'comisiones-agente',
  'rendimiento-agentes',
  'ocupacion-portafolio',
  'vencimientos',
  'flujo-caja',
  'rentabilidad-inmueble',
]

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  estado.isLoading = false
  estado.errorCrudo = null
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function abrir(id: ReportId): Promise<HTMLElement> {
  await act(async () => {
    root.render(<ReporteViewer isOpen onClose={() => {}} report={reporte(id)} filters={FILTROS} />)
  })
  await act(async () => {
    await Promise.resolve()
  })
  return document.querySelector<HTMLElement>('[role="dialog"]')!
}

describe('ReporteViewer — ningún cajón queda en blanco', () => {
  it.each(CON_DATOS)('🔴 %s sin datos dice que no hay nada que mostrar', async (id) => {
    const cajon = await abrir(id)
    expect(cajon.textContent).toContain('Todavía no hay nada que mostrar')
  })

  it.each(CON_DATOS)('🔴 %s con el pedido caído ofrece reintentar', async (id) => {
    estado.errorCrudo = new Error('sin red')
    const cajon = await abrir(id)
    expect(cajon.querySelector('[data-testid="fallo-de-carga"]')).not.toBeNull()
    expect(cajon.querySelector('[data-testid="reintentar"]')).not.toBeNull()
  })

  it('los extractos dicen dónde están, sin botón de descarga', async () => {
    const cajon = await abrir('extractos-propietarios')
    expect(cajon.textContent).toContain('Ir a dispersiones')
    expect(cajon.textContent).not.toContain('Descargar')
  })
})
