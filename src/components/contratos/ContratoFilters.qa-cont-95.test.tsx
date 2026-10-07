/**
 * QA-CONT-95 (I-09, 04-10-2026): axe marcaba «button-name» CRÍTICO en los cinco
 * desplegables de la lista: un lector de pantalla decía «botón» sin decir de
 * qué es el filtro. Cada uno lleva su nombre.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ locale: 'es', t: (k: string) => k }) }))

import { ContratoFilters } from './ContratoFilters'
import { FILTROS_INICIALES } from '@/lib/contratos/filtrar-contratos'

let root: Root | null = null
let container: HTMLDivElement | null = null
afterEach(async () => {
  await act(async () => { root?.unmount() })
  container?.remove()
})

describe('<ContratoFilters> · nombre accesible de cada filtro', () => {
  it('🔴 los cinco desplegables dicen qué filtran', async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root!.render(<ContratoFilters filtros={FILTROS_INICIALES} onFiltros={vi.fn()} totalFiltrado={3} total={3} />)
    })
    const nombre = (id: string) => document.body.querySelector(`[data-testid="${id}"]`)?.getAttribute('aria-label')
    expect(nombre('filtro-estado')).toBe('Filtrar por estado')
    expect(nombre('filtro-vigencia')).toBe('Filtrar por vigencia')
    expect(nombre('filtro-inmueble')).toBe('Filtrar por inmueble')
    expect(nombre('filtro-inquilino')).toBe('Filtrar por la cuenta del inquilino')
    expect(nombre('filtro-canon')).toBe('Filtrar por canon')
  })
})
