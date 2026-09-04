/**
 * La tarjeta de Revisión AI muestra las fotos que trajo el enlace.
 * Nico (2026-09-02): la migración por link sí traía las imágenes y la
 * revisión no las pintaba. Se prueba que salen (máx. 6 + contador) y que
 * sin fotos no se pinta la tira.
 */
import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { ImportProperty } from '../lib/importTypes'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k, locale: 'es' }) }))

import { AISuggestionCard } from './AISuggestionCard'

let container: HTMLDivElement
let root: Root
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function render(extra: Partial<ImportProperty>) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  const property = {
    id: 'p-1',
    propertyTitle: 'Contree Las Palmas',
    propertyAddress: 'Túnel de Oriente',
    propertyCity: 'Medellín',
    propertyType: 'apartment',
    listingType: 'sale',
    salePrice: 1_125_585_055,
    selected: true,
    hasErrors: false,
    errorMessages: [],
    // Con una sugerencia la tarjeta arranca expandida (así se ve en la Revisión AI).
    suggestions: [{ campo: 'commissionPercent', valor: '10', confianza: 'alta', motivo: 'Estándar del mercado', isAccepted: false, isManual: false }],
    ...extra,
  } as unknown as ImportProperty
  act(() => {
    root.render(
      <AISuggestionCard
        property={property}
        index={0}
        onToggleSelect={() => {}}
        onAcceptSuggestion={() => {}}
        onRejectSuggestion={() => {}}
        onAcceptAll={() => {}}
        onEditField={() => {}}
      />,
    )
  })
}

describe('AISuggestionCard — fotos del enlace', () => {
  it('pinta hasta 6 fotos y cuenta el resto', () => {
    render({ imagenes: Array.from({ length: 8 }, (_, i) => `https://cdn.example/${i}.jpg`) })
    const tira = container.querySelector('[data-testid="import-fotos"]')
    expect(tira).not.toBeNull()
    expect(tira?.querySelectorAll('img')).toHaveLength(6)
    expect(tira?.textContent).toContain('+2')
  })

  it('sin fotos no hay tira', () => {
    render({ imagenes: [] })
    expect(container.querySelector('[data-testid="import-fotos"]')).toBeNull()
  })
})
