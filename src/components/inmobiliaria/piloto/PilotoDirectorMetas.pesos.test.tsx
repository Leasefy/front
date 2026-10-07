/**
 * MANDO-DATOS (05-10-2026) · la meta en pesos (lo recuperado, la sexta por
 * defecto) en su tarjeta: las tres cifras («$ 14.302.500,75») no caben en tres
 * columnas del cajón; van una por renglón y se leen enteras (la pasada visible
 * del 05-10 las vio cortadas: «$ 14…»). Las otras unidades siguen en tres columnas.
 */
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, vars?: Record<string, string>) => (vars ? `${k}(${Object.values(vars).join(',')})` : k),
    locale: 'es',
  }),
}))
vi.mock('sonner', () => ({ toast: { success: () => undefined, error: () => undefined } }))

import { PilotoDirectorMetas } from './PilotoDirectorMetas'
import { normalizarMetas, type DirectorMetas } from '@/lib/api/piloto-director'

const METAS = normalizarMetas({
  encendido: true,
  metas: [
    {
      id: 'm-6', metrica: 'recuperado', nombre: 'Plata recuperada (30 días)', estado: 'activa', direccion: 'subir',
      unidad: 'pesos', lineaBase: 14302500.75, objetivo: 14302500.75, actual: 26755002, serie: [], historial: [],
    },
    {
      id: 'm-2', metrica: 'mora_30', nombre: 'Mora de más de 30 días', estado: 'activa', direccion: 'bajar',
      unidad: 'dias', lineaBase: 13.3, objetivo: 13.3, actual: 13, serie: [], historial: [],
    },
  ],
})

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
})

describe('la meta en pesos en su tarjeta', () => {
  it('una cifra por renglón, entera; las otras unidades en tres columnas', () => {
    act(() => {
      root.render(
        <PilotoDirectorMetas
          lectura={{ data: METAS as DirectorMetas, isLoading: false, error: null, notAvailable: false, refetch: vi.fn(async () => {}) }}
          isAdmin
          enVuelo={null}
          onActuar={vi.fn(async () => ({ ok: false as const, status: 500, error: 'x' }))}
        />,
      )
    })
    const tarjeta = container.querySelector('[data-testid="piloto-director-meta-recuperado"]')!
    expect(tarjeta.querySelector('dl')?.className).toContain('grid-cols-1')
    expect(container.querySelector('[data-testid="piloto-director-meta-recuperado-actual"]')?.textContent).toMatch(/^\$\s26\.755\.002$/)
    expect(container.querySelector('[data-testid="piloto-director-meta-mora_30"] dl')?.className).toContain('grid-cols-3')
  })
})
