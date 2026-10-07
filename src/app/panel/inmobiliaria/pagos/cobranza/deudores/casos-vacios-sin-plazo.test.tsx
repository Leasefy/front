/**
 * 🔴 CONSISTENCIA (04-10-2026, CR-31): con el plazo sin fijar es correcto que
 * Cobranza → Casos esté vacía, pero el vacío decía «Aún no hay deudores.
 * Importa una cartera CSV» y mandaba a importar lo que Leasefy ya sabe. Ahora
 * dice POR QUÉ (plazo sin fijar) y no ofrece el CSV; con el plazo fijado, como
 * siempre.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

const h = vi.hoisted(() => ({ sinFijar: true }))

vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/lib/hooks/cobranza/use-debtor-list', () => ({
  useDebtorList: () => ({
    pages: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    hasMore: false,
    loadMore: vi.fn(),
    refetch: vi.fn(),
  }),
}))
vi.mock('@/lib/hooks/use-plazo-sin-fijar', () => ({ usePlazoSinFijar: () => h.sinFijar }))
vi.mock('@/components/inmobiliaria/cobranza/AvisoPlazoSinFijarEnCobranza', () => ({
  AvisoPlazoSinFijarEnCobranza: () => null,
}))
vi.mock('@/components/inmobiliaria/cobranza/CobranzaImportCard', () => ({
  CobranzaImportCard: () => <div data-testid="importar-cartera-csv" />,
}))
vi.mock('@/components/cobranza-manual/TraerLaCartera', () => ({
  TraerLaCartera: ({ compacto }: { compacto?: boolean }) => (
    <div data-testid={compacto ? 'traer-compacto' : 'traer-la-cartera'} />
  ),
}))
vi.mock('@/components/data-display/EmptyState', () => ({
  EmptyState: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="vacio">
      {title} · {description}
    </div>
  ),
}))

import DeudoresListClient from './DeudoresListClient'

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

function pintar() {
  act(() => {
    root.render(<DeudoresListClient />)
  })
}

describe('Cobranza → Casos vacía', () => {
  it('sin plazo fijado: dice por qué y no manda a importar un CSV', () => {
    h.sinFijar = true
    pintar()
    expect(container.querySelector('[data-testid="casos-vacio-sin-plazo"]')?.textContent).toContain(
      'sin días de plazo fijados',
    )
    expect(container.textContent).not.toContain('inmobiliaria.ai.cobranza.deudores.empty.description')
    expect(container.querySelector('[data-testid="importar-cartera-csv"]')).toBeNull()
  })

  it('con el plazo fijado: la puerta es la cartera de los contratos; el CSV, una opción extra abajo', () => {
    h.sinFijar = false
    pintar()
    expect(container.querySelector('[data-testid="casos-vacio-sin-plazo"]')).toBeNull()
    // COBRANZA-MANUAL (04-10-2026): «Cobranza se llena con la cartera de los
    // contratos». El vacío ya no manda a importar un CSV como única puerta.
    const vacio = container.querySelector('[data-testid="casos-vacio-de-la-cartera"]')
    expect(vacio?.textContent).toContain('Todavía no hay deudores en Cobranza')
    expect(container.textContent).not.toContain('Importa una cartera CSV')
    const traer = container.querySelector('[data-testid="traer-la-cartera"]')
    const csv = container.querySelector('[data-testid="importar-cartera-csv"]')
    expect(traer).not.toBeNull()
    expect(csv).not.toBeNull()
    // El CSV va DESPUÉS de traer la cartera.
    expect(traer!.compareDocumentPosition(csv!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
