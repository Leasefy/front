/**
 * page.test.tsx — PostulacionesPage loading/empty/error/rows behavior.
 *
 * The page lists real marketplace applications via
 * landlordApplicationsApi.getAllCandidates() (GET /landlord/candidates),
 * filters with clickable stat tiles + search, and navigates to the property's
 * candidatos page on row click.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { AllCandidatesResponse } from '@/lib/api/applications.types'
import { ApiError } from '@/lib/api/client'

void React // jsx-preserve

// react-dom/client needs this flag to recognize our act() wrapping.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { getAllCandidatesMock, pushMock } = vi.hoisted(() => ({
  getAllCandidatesMock: vi.fn(),
  pushMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  // El mapa del recorrido lo usa para no enlazar a la pantalla actual.
  usePathname: () => '/panel/inmobiliaria/postulaciones',
}))

// El mapa de los 11 pasos tiene su propio test; acá solo importa que esta
// pantalla lo monte — abierto sin postulaciones, plegado cuando hay trabajo.
vi.mock('@/components/inmobiliaria/recorrido/RecorridoMapa', () => ({
  RecorridoMapa: () => React.createElement('div', { 'data-testid': 'recorrido-mapa' }),
}))

vi.mock('@/lib/api/applications.service', () => ({
  landlordApplicationsApi: {
    getAllCandidates: (...args: unknown[]) => getAllCandidatesMock(...args),
  },
}))

// El cajón tiene su propia suite (pide evaluación, créditos, documentos…). Acá
// sólo interesa que ESTA pantalla lo monte con la persona correcta, sin navegar.
vi.mock('@/components/inmobiliaria/CandidateDrawer', () => ({
  CandidateDrawer: ({ candidate }: { candidate: { tenantName?: string } | null }) =>
    candidate
      ? React.createElement('div', { 'data-testid': 'cajon-candidato' }, candidate.tenantName)
      : null,
}))

// Auto-refresh is interval/focus-driven — irrelevant in unit tests.
vi.mock('@/lib/hooks/use-auto-refresh', () => ({
  useAutoRefresh: () => undefined,
}))

// ── Mock presentational leaves (avoid pulling the whole DS in) ───────────
vi.mock('@/components/ui', () => ({
  Spinner: ({ label }: { label?: string }) =>
    React.createElement('div', { 'data-testid': 'spinner' }, label ?? 'Loading'),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    React.createElement('input', props),
}))

vi.mock('@/components/data-display/EmptyState', () => ({
  EmptyState: ({ title }: { title: string }) =>
    React.createElement('div', { 'data-testid': 'empty-state' }, title),
}))

vi.mock('@/components/ui/error-state', () => ({
  ErrorState: ({ title, onRetry }: { title: string; onRetry?: () => void }) =>
    React.createElement(
      'div',
      { 'data-testid': 'error-state' },
      title,
      onRetry
        ? React.createElement(
            'button',
            { 'data-testid': 'error-state-retry', onClick: onRetry },
            'Intentar de nuevo',
          )
        : null,
    ),
}))

vi.mock('@leasefy/cadence', () => ({
  // Reenvía TODAS las props, no sólo onClick: un mock que las filtra deja
  // pasar por bueno un botón sin data-testid ni aria-label reales.
  Button: ({ children, ...props }: { children?: React.ReactNode }) =>
    React.createElement('button', props, children),
  IconButton: ({ onClick, 'aria-label': ariaLabel }: { onClick?: () => void; 'aria-label'?: string }) =>
    React.createElement('button', { onClick, 'aria-label': ariaLabel }),
  SegmentedControl: ({
    value,
    onChange,
    options,
  }: {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
  }) =>
    React.createElement(
      'div',
      { 'data-testid': 'segmented-control' },
      options.map((o) =>
        React.createElement(
          'button',
          {
            key: o.value,
            'data-segment': o.value,
            'data-active': o.value === value,
            onClick: () => onChange(o.value),
          },
          o.label,
        ),
      ),
    ),
}))

// The table shim re-exports cadence primitives — replace it with plain elements.
//
// Reenvía TODAS las props, no solo `onClick`. Un mock que se queda con una
// prop y descarta el resto no prueba nada sobre lo que llega al DOM: con la
// versión anterior, `role`, `tabIndex` y `onKeyDown` desaparecían y el test
// habría dado verde con la fila igual de inalcanzable por teclado.
// `TRProps extends React.HTMLAttributes<HTMLTableRowElement>`, así que el
// componente real sí los acepta.
vi.mock('@/components/ui/table', () => {
  const el = (tag: string) => {
    const MockEl = ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement(tag, props, children)
    MockEl.displayName = `MockTable_${tag}`
    return MockEl
  }
  return {
    Table: el('table'),
    TableHeader: el('thead'),
    TableBody: el('tbody'),
    TableRow: el('tr'),
    TableHead: el('th'),
    TableCell: el('td'),
  }
})

// ── Import page AFTER mocks ───────────────────────────────────────────────
import PostulacionesPage from './page'

const RESPONSE: AllCandidatesResponse = {
  candidates: [
    {
      id: 'app-1',
      tenantName: 'Juan Pérez',
      tenantEmail: 'juan@example.com',
      status: 'UNDER_REVIEW',
      submittedAt: '2026-07-16T20:42:22.179Z',
      propertyId: 'prop-1',
      propertyTitle: 'Apartamento 3 hab en robledo',
      riskScore: { totalScore: 82, level: 'A' },
    },
    {
      id: 'app-2',
      tenantName: 'Ana Gómez',
      tenantEmail: 'ana@example.com',
      status: 'NEEDS_INFO',
      submittedAt: '2026-07-15T10:00:00.000Z',
      propertyId: 'prop-2',
      propertyTitle: 'Habitación 1 hab en centro',
    },
  ],
  total: 2,
  stats: { total: 2, pending: 2, approved: 0, rejected: 0 },
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  getAllCandidatesMock.mockReset()
  pushMock.mockReset()
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
  vi.clearAllMocks()
})

async function renderPage() {
  await act(async () => {
    root.render(React.createElement(PostulacionesPage))
  })
}

function tiles(): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll('button[aria-pressed]'))
}

describe('PostulacionesPage', () => {
  it('loads all candidates and renders one row per application', async () => {
    getAllCandidatesMock.mockResolvedValue(RESPONSE)

    await renderPage()

    expect(getAllCandidatesMock).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[data-testid="spinner"]')).toBeNull()
    expect(container.querySelector('[data-testid="empty-state"]')).toBeNull()

    const rows = container.querySelectorAll('tbody tr')
    expect(rows.length).toBe(2)
    expect(container.textContent).toContain('Juan Pérez')
    expect(container.textContent).toContain('Apartamento 3 hab en robledo')
    expect(container.textContent).toContain('En revisión')
    expect(container.textContent).toContain('Pide info')
  })

  it('renders the six clickable stat tiles with their counts', async () => {
    getAllCandidatesMock.mockResolvedValue(RESPONSE)

    await renderPage()

    const allTiles = tiles()
    expect(allTiles.length).toBe(6)

    const total = allTiles.find((b) => b.textContent?.includes('Total'))
    expect(total?.textContent).toContain('2')
    const review = allTiles.find((b) => b.textContent?.includes('En revisión'))
    expect(review?.textContent).toContain('1')
  })

  it('filters rows when a stat tile is clicked, and resets on re-click', async () => {
    getAllCandidatesMock.mockResolvedValue(RESPONSE)

    await renderPage()

    const needsInfoTile = tiles().find((b) => b.textContent?.includes('Pide info'))
    expect(needsInfoTile).toBeTruthy()

    await act(async () => {
      needsInfoTile!.click()
    })
    expect(container.querySelectorAll('tbody tr').length).toBe(1)
    expect(container.textContent).toContain('Ana Gómez')
    expect(container.textContent).not.toContain('Juan Pérez')

    // Re-click resets to all
    await act(async () => {
      tiles().find((b) => b.textContent?.includes('Pide info'))!.click()
    })
    expect(container.querySelectorAll('tbody tr').length).toBe(2)
  })

  it('filters rows by search text', async () => {
    getAllCandidatesMock.mockResolvedValue(RESPONSE)

    await renderPage()

    const input = container.querySelector('input') as HTMLInputElement
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(input, 'robledo')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(container.querySelectorAll('tbody tr').length).toBe(1)
    expect(container.textContent).toContain('Juan Pérez')
  })

  it('filters rows from the segmented control, in sync with the tiles', async () => {
    getAllCandidatesMock.mockResolvedValue(RESPONSE)

    await renderPage()

    const segment = container.querySelector('[data-segment="NEEDS_INFO"]') as HTMLButtonElement
    expect(segment).toBeTruthy()

    await act(async () => {
      segment.click()
    })
    expect(container.querySelectorAll('tbody tr').length).toBe(1)
    expect(container.textContent).toContain('Ana Gómez')
    // The matching tile reflects the same active filter
    const activeTile = tiles().find((b) => b.getAttribute('aria-pressed') === 'true')
    expect(activeTile?.textContent).toContain('Pide info')
  })

  it('al tocar una fila abre el detalle ACÁ, sin cambiar de sección', async () => {
    // Antes empujaba a `/inmuebles/<id>/candidatos?candidato=<id>`: el sidebar
    // saltaba a «Inmuebles · portafolio», se cargaba la lista de candidatos de
    // esa propiedad y encima de todo eso se abría el cajón. Tres pantallas para
    // ver a una persona, y el «atrás» ya no volvía a Postulaciones.
    getAllCandidatesMock.mockResolvedValue(RESPONSE)

    await renderPage()

    const firstRow = container.querySelectorAll('tbody tr')[0] as HTMLElement
    await act(async () => {
      firstRow.click()
    })

    expect(pushMock).not.toHaveBeenCalled()
    const cajon = container.querySelector('[data-testid="cajon-candidato"]')
    expect(cajon?.textContent).toBe(RESPONSE.candidates[0].tenantName)
  })

  it('la fila se puede abrir con el teclado', async () => {
    // Era un `<tr>` con `onClick`: ni foco, ni Enter, ni anuncio de que fuera
    // accionable. La tabla entera quedaba fuera del alcance de quien no usa
    // mouse — y el proyecto corre axe sobre los paneles.
    getAllCandidatesMock.mockResolvedValue(RESPONSE)

    await renderPage()

    const firstRow = container.querySelectorAll('tbody tr')[0] as HTMLElement
    expect(firstRow.getAttribute('role')).toBe('button')
    expect(firstRow.getAttribute('tabindex')).toBe('0')
    expect(firstRow.getAttribute('aria-label')).toContain('Revisar la postulación')

    await act(async () => {
      firstRow.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      )
    })

    expect(container.querySelector('[data-testid="cajon-candidato"]')).toBeTruthy()
  })

  it('renders the empty state when there are no applications', async () => {
    getAllCandidatesMock.mockResolvedValue({
      candidates: [],
      total: 0,
      stats: { total: 0, pending: 0, approved: 0, rejected: 0 },
    })

    await renderPage()

    expect(container.querySelector('[data-testid="empty-state"]')).not.toBeNull()
  })

  it('sin postulaciones muestra el recorrido, no seis KPI en cero', async () => {
    // Con la bandeja vacía lo útil es explicar qué va a llegar y de dónde
    // viene, no una tabla vacía con filtros ni tiles en cero. El mapa vivía en
    // una pantalla aparte llamada «Recorrido» que mostraba ESTA misma lista:
    // dos rutas para una cosa.
    getAllCandidatesMock.mockResolvedValue({
      candidates: [],
      total: 0,
      stats: { total: 0, pending: 0, approved: 0, rejected: 0 },
    })

    await renderPage()

    expect(container.querySelector('[data-testid="recorrido-mapa"]')).not.toBeNull()
    expect(container.querySelector('table')).toBeNull()
    expect(tiles().length).toBe(0)
  })

  it('con postulaciones el recorrido queda plegado, sin robarle espacio', async () => {
    getAllCandidatesMock.mockResolvedValue(RESPONSE)

    await renderPage()

    const detalles = container.querySelector('details')
    expect(detalles).not.toBeNull()
    expect(detalles?.hasAttribute('open')).toBe(false)
    expect(container.querySelector('table')).not.toBeNull()
  })

  it('cuando falla la red ofrece reintentar', async () => {
    getAllCandidatesMock.mockRejectedValue(new ApiError(0, 'Network request failed'))

    await renderPage()

    const fallo = container.querySelector('[data-testid="fallo-de-carga"]')
    expect(fallo).not.toBeNull()
    expect(fallo?.getAttribute('data-tipo')).toBe('red')
    expect(container.querySelector('[data-testid="reintentar"]')).not.toBeNull()
  })

  it('cuando no existe NO ofrece reintentar, porque no va a aparecer', async () => {
    getAllCandidatesMock.mockRejectedValue(new ApiError(404, 'Agency not found'))

    await renderPage()

    const fallo = container.querySelector('[data-testid="fallo-de-carga"]')
    expect(fallo?.getAttribute('data-tipo')).toBe('noExiste')
    expect(container.querySelector('[data-testid="reintentar"]')).toBeNull()
  })

  it('nunca muestra el mensaje crudo del backend', async () => {
    getAllCandidatesMock.mockRejectedValue(new ApiError(500, 'Property with ID abc not found'))

    await renderPage()

    // El detalle técnico queda en el DOM para diagnosticar, pero fuera de la
    // pantalla: lo que se lee es una frase nuestra, en español.
    const visible = container.querySelector('[data-testid="fallo-de-carga"] p')
    expect(visible?.textContent).not.toContain('Property with ID')
    expect(container.querySelector('[data-testid="fallo-detalle-tecnico"]')?.className)
      .toContain('sr-only')
  })
})
