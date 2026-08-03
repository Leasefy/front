/**
 * PagosHomeAttentionList — component tests (Pagos IA Home, HOME-02).
 *
 * Repo convention: createRoot + act + happy-dom (no @testing-library/react,
 * no jest-dom matchers). i18n is mocked to return the key (so priority badge
 * labels resolve to the key path, which we assert on). Data is fully mocked —
 * no live fetch.
 *
 * Covers:
 *   1. renders one row per item with the correct priority on each row
 *      (alta → destructive, media → warning, baja → secondary via data-priority)
 *   2. clicking a row calls onSelect with the item's invoiceId
 *   3. empty items[] renders the EmptyState, not the list
 *   4. PagosHomeMetricsStrip renders all 8 metric tiles
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

// ── Mocks (i18n returns the key; formatCurrency is a simple stub) ─────────────

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: 'es',
    formatCurrency: (n: number | null | undefined) => `$ ${n ?? 0}`,
    formatDate: (d: string | Date) => String(d),
    formatNumber: (n: number) => String(n),
    setLocale: vi.fn(),
  }),
}))

// ── Imports under test (after mocks) ──────────────────────────────────────────

import { PagosHomeAttentionList } from './PagosHomeAttentionList'
import { PagosHomeMetricsStrip } from './PagosHomeMetricsStrip'
import type {
  PagosHomeAttention,
  PagosHomeMetrics,
} from '@/lib/api/pagos-home.types'

// ── Harness ───────────────────────────────────────────────────────────────────

interface Harness {
  root: Root
  container: HTMLDivElement
}

function mount(node: React.ReactElement): Harness {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(node)
  })
  return { root, container }
}

function unmount(h: Harness): void {
  act(() => {
    h.root.unmount()
  })
  h.container.remove()
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ATTENTION: PagosHomeAttention = {
  items: [
    {
      id: 'inv-1',
      kind: 'cobro_fallido',
      priority: 'alta',
      title: 'Pago fallido — Apto 301',
      detail: 'El cargo fue rechazado por el banco.',
      totalCop: 1_500_000,
      suggestedAction: 'Reintentar cobro',
    },
    {
      id: 'inv-2',
      kind: 'proximo_a_vencer',
      priority: 'media',
      title: 'Próximo a vencer — Casa 12',
      detail: 'Vence en 2 días.',
      totalCop: 2_000_000,
      suggestedAction: 'Enviar recordatorio',
    },
    {
      id: 'inv-3',
      kind: 'pago_en_proceso',
      priority: 'baja',
      title: 'Pago en proceso — Local 5',
      detail: 'Esperando confirmación PSE.',
      totalCop: 800_000,
      suggestedAction: 'Ver estado',
    },
  ],
}

const METRICS: PagosHomeMetrics = {
  cobrosProgramados: 12,
  cobrosEnviados: 9,
  pagosRecibidos: 7,
  linksPendientes: 3,
  pagosFallidos: 1,
  valorRecaudadoCop: 12_500_000,
  propietariosListos: 4,
  valorPendienteLiquidarCop: 8_300_000,
}

const NOOP = () => undefined

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PagosHomeAttentionList', () => {
  let h: Harness | null = null

  beforeEach(() => {
    h = null
  })

  afterEach(() => {
    if (h) unmount(h)
  })

  it('renders one row per item, sorted as received, with correct priority', () => {
    h = mount(
      <PagosHomeAttentionList
        data={ATTENTION}
        isLoading={false}
        error={null}
        onRetry={NOOP}
        onSelect={NOOP}
      />,
    )

    const rows = h.container.querySelectorAll('[data-testid="attention-row"]')
    expect(rows.length).toBe(3)
    // Order + priority preserved exactly as provided (alta → media → baja).
    expect(rows[0].getAttribute('data-priority')).toBe('alta')
    expect(rows[1].getAttribute('data-priority')).toBe('media')
    expect(rows[2].getAttribute('data-priority')).toBe('baja')

    // Each priority resolves its own badge label key.
    const text = h.container.textContent ?? ''
    expect(text).toContain('inmobiliaria.ai.pagos_home.attention.priority.alta')
    expect(text).toContain('inmobiliaria.ai.pagos_home.attention.priority.media')
    expect(text).toContain('inmobiliaria.ai.pagos_home.attention.priority.baja')

    // suggestedAction labels render verbatim.
    expect(text).toContain('Reintentar cobro')
    expect(text).toContain('Enviar recordatorio')
  })

  it('calls onSelect with the invoiceId when a row is clicked', () => {
    const onSelect = vi.fn()
    h = mount(
      <PagosHomeAttentionList
        data={ATTENTION}
        isLoading={false}
        error={null}
        onRetry={NOOP}
        onSelect={onSelect}
      />,
    )

    const rows = h.container.querySelectorAll<HTMLButtonElement>(
      '[data-testid="attention-row"]',
    )
    act(() => {
      rows[1].click()
    })

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith('inv-2')
  })

  it('renders the empty state (not the list) when items is empty', () => {
    h = mount(
      <PagosHomeAttentionList
        data={{ items: [] }}
        isLoading={false}
        error={null}
        onRetry={NOOP}
        onSelect={NOOP}
      />,
    )

    expect(h.container.querySelector('[data-testid="attention-list"]')).toBeNull()
    expect(h.container.querySelector('[data-testid="attention-row"]')).toBeNull()
    // EmptyState wrapper carries role="status".
    const status = h.container.querySelector('[role="status"]')
    expect(status).not.toBeNull()
    expect(h.container.textContent ?? '').toContain(
      'inmobiliaria.ai.pagos_home.attention.empty.title',
    )
  })
})

describe('PagosHomeMetricsStrip', () => {
  let h: Harness | null = null

  afterEach(() => {
    if (h) unmount(h)
  })

  it('renders all 8 metric tiles with values', () => {
    h = mount(
      <PagosHomeMetricsStrip
        data={METRICS}
        isLoading={false}
        error={null}
        onRetry={NOOP}
      />,
    )

    const text = h.container.textContent ?? ''
    // All 8 metric labels present (6 count + 2 COP).
    const labels = [
      'cobrosProgramados',
      'cobrosEnviados',
      'pagosRecibidos',
      'linksPendientes',
      'pagosFallidos',
      'propietariosListos',
      'valorRecaudadoCop',
      'valorPendienteLiquidarCop',
    ]
    for (const label of labels) {
      expect(text).toContain(`inmobiliaria.ai.pagos_home.metrics.${label}`)
    }

    // The 2 COP tiles render formatted currency (text, not animated counter).
    expect(text).toContain('$ 12500000')
    expect(text).toContain('$ 8300000')
  })
})
