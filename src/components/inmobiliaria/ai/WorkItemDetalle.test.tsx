/**
 * WorkItemDetalle.test.tsx — F7/F8 shared detalle body.
 *
 * Covers the 4 render states (loading / error / not-found / happy), the
 * already-decided state (Decisión block, actions hidden), the t323 flag pill
 * and the optional cross-workspace link card.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

// next/link renders fine without a Next router when reduced to an anchor.
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) =>
    React.createElement('a', { href, ...rest }, children),
}))

import { WorkItemDetalle } from './WorkItemDetalle'
import type { WorkItemDetailResponse } from '@/lib/api/agent-workspace'
import type { WorkItem } from '@/lib/api/work-item'

const ITEM: WorkItem = {
  id: 'wi-1',
  agente: 'estudio',
  tipo: 'tenant_verdict',
  estado: 'en_revision',
  flags: ['t323'],
  ownerRole: 'analista_riesgo',
  severidad: 'alta',
  titulo: 'Solicitud de María — Nivel C (borderline)',
  accionSugerida: {
    label: 'Aprobar condicionado',
    confianza: 0.62,
    razon: 'Score compuesto 58/100: ingresos consistentes pero historial corto.',
    evidencia: [{ label: 'Score', value: '58/100' }],
  },
  actions: [
    {
      id: 'approve',
      label: 'Aprobar',
      kind: 'primary',
      method: 'POST',
      path: '/api/agency/a1/ai-hub/estudio/wi-1/approve',
    },
  ],
  subject: { kind: 'application', id: 'app-1' },
  createdAt: new Date().toISOString(),
  source: { endpoint: '/pipeline-runs', entity: 'PipelineRun' },
}

const DETAIL: WorkItemDetailResponse = {
  item: ITEM,
  contexto: [
    {
      title: 'Solicitud',
      rows: [{ label: 'Nivel', value: 'C' }],
    },
  ],
  traza: [
    {
      id: 'tr-1',
      action: 'scoring_completed',
      actorType: 'agent',
      actorId: 'estudio',
      occurredAt: new Date().toISOString(),
      details: {},
    },
  ],
  generatedAt: new Date().toISOString(),
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

function render(props: Partial<React.ComponentProps<typeof WorkItemDetalle>> = {}) {
  act(() => {
    root.render(
      React.createElement(WorkItemDetalle, {
        data: null,
        colaHref: '/panel/inmobiliaria/ai/estudio/cola',
        colaLabel: 'Cola de estudio',
        onAction: vi.fn().mockResolvedValue({ ok: true }),
        ...props,
      }),
    )
  })
}

describe('WorkItemDetalle — states', () => {
  it('renders the loading skeleton', () => {
    render({ isLoading: true })
    expect(container.querySelector('[data-testid="caso-loading"]')).not.toBeNull()
  })

  it('renders the error banner with the breadcrumb', () => {
    render({ error: '500' })
    const err = container.querySelector('[data-testid="caso-error"]')
    expect(err).not.toBeNull()
    expect(err!.textContent).toContain('500')
    expect(container.textContent).toContain('Cola de estudio')
  })

  it('renders the not-found state when data is null (404)', () => {
    render({ data: null, notAvailable: true })
    const nf = container.querySelector('[data-testid="caso-not-found"]')
    expect(nf).not.toBeNull()
    expect(nf!.textContent).toContain('Caso no encontrado')
    // NOT an error banner
    expect(container.querySelector('[data-testid="caso-error"]')).toBeNull()
  })

  it('renders header (with t323 flag) + AccionSugerida + contexto + traza on happy path', () => {
    render({ data: DETAIL })

    expect(container.querySelector('[data-testid="caso-wi-1"]')).not.toBeNull()
    expect(container.textContent).toContain('Solicitud de María — Nivel C (borderline)')
    // ColaHumana vocabulary: severidad + estado + t323 flag pill
    expect(container.textContent).toContain('Alta')
    expect(container.textContent).toContain('En revisión')
    expect(container.textContent).toContain('Revisión T-323')

    // AccionSugerida with the real action
    const accion = container.querySelector('[data-testid="accion-sugerida"]')
    expect(accion).not.toBeNull()
    expect(accion!.textContent).toContain('Aprobar condicionado')

    // Contexto block
    const ctx = container.querySelector('[data-testid="caso-contexto-0"]')
    expect(ctx).not.toBeNull()
    expect(ctx!.textContent).toContain('Nivel')

    // Traza
    expect(container.textContent).toContain('Traza del caso')
  })

  it('hides actions and shows the Decisión block when already decided', () => {
    render({
      data: {
        ...DETAIL,
        item: { ...ITEM, estado: 'resuelto', decidedBy: 'ana@agencia.co' },
      },
    })
    const decision = container.querySelector('[data-testid="caso-decision"]')
    expect(decision).not.toBeNull()
    expect(decision!.textContent).toContain('Por ana@agencia.co')
    expect(container.querySelector('[data-testid="accion-sugerida"]')).toBeNull()
  })

  it('renders the cross-workspace link card when crossLink is provided', () => {
    render({
      data: DETAIL,
      crossLink: {
        pregunta: '¿Qué propiedad le calza?',
        destino: 'Workspace de Matching',
        href: '/panel/inmobiliaria/ai/matching',
      },
    })
    const link = container.querySelector('[data-testid="caso-cross-link"]')
    expect(link).not.toBeNull()
    expect(link!.textContent).toContain('¿Qué propiedad le calza?')
    expect(link!.getAttribute('href')).toBe('/panel/inmobiliaria/ai/matching')
  })

  it('does not render the cross-link card when crossLink is omitted', () => {
    render({ data: DETAIL })
    expect(container.querySelector('[data-testid="caso-cross-link"]')).toBeNull()
  })
})
