/**
 * CounterfactualModal tests — Phase 33 plan 33-04 (TDD RED → GREEN)
 *
 * Strategy: mount inside happy-dom, mock useAskWhy / useAskWhyUsage / useAuth,
 * query Radix-Dialog content via document.body (Portal renders outside container).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

// ----- Mocks (declare BEFORE importing the component) ------------------------

const mockMutate = vi.fn()
const mockReset = vi.fn()
let mockHookState: {
  isLoading: boolean
  error: import('@/lib/hooks/cotizador/use-ask-why').AskWhyError | null
} = { isLoading: false, error: null }
let mockUsage: import('@/lib/hooks/cotizador/use-ask-why-usage').AskWhyUsage | null = {
  used_today: 5,
  daily_cap: 50,
  resets_at: '2026-05-29T05:00:00Z',
}

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ agency: { id: 'agency-test' } }),
}))

vi.mock('@/lib/hooks/cotizador/use-ask-why', () => ({
  useAskWhy: () => ({
    mutate: mockMutate,
    isLoading: mockHookState.isLoading,
    error: mockHookState.error,
    reset: mockReset,
  }),
}))

vi.mock('@/lib/hooks/cotizador/use-ask-why-usage', () => ({
  useAskWhyUsage: () => ({
    data: mockUsage,
    isLoading: false,
    mutate: vi.fn(),
  }),
}))

// i18n provider: just return the key (mvp's I18nProvider warns on missing keys,
// but tests don't need real translations).
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    locale: 'es',
    t: (k: string, params?: Record<string, string | number>) => {
      // For cap banner assertions we need 'Se reinicia' in the rendered text.
      if (k === 'inmobiliaria.ai.cotizador.askWhy.capExhausted.body') {
        const time = params?.time ?? '00:00'
        const cap = params?.cap ?? 50
        return `Has usado tus ${cap} explicaciones de hoy. Se reinicia mañana a las ${time} (Bogotá).`
      }
      if (k === 'inmobiliaria.ai.cotizador.askWhy.remaining') {
        return `Te quedan ${params?.n ?? '?'} de ${params?.m ?? 50} hoy`
      }
      if (k === 'inmobiliaria.ai.cotizador.askWhy.retryButton') return 'Reintentar'
      return k
    },
    formatCurrency: (v: number | null) => (v == null ? '—' : `$${v}`),
    formatNumber: (v: number | null) => (v == null ? '—' : String(v)),
    formatDate: () => '',
    formatRelativeDate: () => '',
    setLocale: () => {},
  }),
}))

import { CounterfactualModal } from './CounterfactualModal'
import type { CarrierState } from '@/lib/hooks/cotizador/use-quote-stream'

void React

const makeCarrier = (over: Partial<CarrierState> & { carrier: string }): CarrierState => ({
  status: 'pending',
  primaMensualCop: null,
  condiciones: [],
  motivoRechazo: null,
  latencyMs: null,
  isStub: false,
  startedAtMs: null,
  ...over,
})

const ORIGINAL_CARRIERS: CarrierState[] = [
  makeCarrier({ carrier: 'Sura', status: 'approved', primaMensualCop: 500_000 }),
  makeCarrier({ carrier: 'Mapfre', status: 'conditional', primaMensualCop: 400_000 }),
  makeCarrier({ carrier: 'Bolívar', status: 'rejected' }),
]

const ORIGINAL_INPUTS = {
  canonCop: 1_500_000,
  ciudad: 'Bogotá',
  tipo: 'apartamento',
  codeudores: 1,
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  // Reset mock state
  mockMutate.mockReset()
  mockReset.mockReset()
  mockHookState = { isLoading: false, error: null }
  mockUsage = { used_today: 5, daily_cap: 50, resets_at: '2026-05-29T05:00:00Z' }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
  // Radix Portals leave nodes on document.body — clean up.
  document.body.innerHTML = ''
})

interface RenderProps {
  onQuote404?: () => void
}

function renderModal(props?: RenderProps) {
  const onClose = vi.fn()
  const onQuote404 = props?.onQuote404 ?? vi.fn()
  act(() => {
    root.render(
      <CounterfactualModal
        open={true}
        onClose={onClose}
        quoteId="q-test"
        originalCarriers={ORIGINAL_CARRIERS}
        originalInputs={ORIGINAL_INPUTS}
        onQuote404={onQuote404}
      />,
    )
  })
  return { onClose, onQuote404 }
}

function $(sel: string): HTMLElement | null {
  return document.body.querySelector(sel)
}
function $$(sel: string): HTMLElement[] {
  return Array.from(document.body.querySelectorAll(sel))
}

/**
 * Set value on a controlled React input so React picks it up.
 * React patches the input's value setter — we have to call the native one
 * directly, then dispatch the 'input' event for React's synthetic onChange.
 */
function fireInputChange(el: HTMLInputElement, value: string): void {
  const proto = Object.getPrototypeOf(el)
  const desc = Object.getOwnPropertyDescriptor(proto, 'value')
  desc?.set?.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('<CounterfactualModal>', () => {
  it('Test 1 — renders 4 distinct variable controls', () => {
    renderModal()
    expect($('[data-testid="cf-canon-slider"]')).not.toBeNull()
    expect($('[data-testid="cf-ciudad-select"]')).not.toBeNull()
    expect($('[role="group"][data-testid="cf-tipo-group"]')).not.toBeNull()
    expect($('[data-testid="cf-codeudores-stepper"]')).not.toBeNull()
  })

  it('Test 2 — changing canon disables the other 3 controls', () => {
    renderModal()
    const tipoBtn = $('[data-testid="cf-tipo-btn-casa"]') as HTMLButtonElement
    expect(tipoBtn.getAttribute('aria-disabled')).toBe('false')

    // Simulate canon slider change via the hidden input. React maps onChange
    // on range inputs to the native "input" event in happy-dom.
    const canonInput = $('[data-testid="cf-canon-input"]') as HTMLInputElement
    act(() => {
      fireInputChange(canonInput, "1600000")
    })

    // After activating canon, tipo (et al.) should be aria-disabled
    expect(tipoBtn.getAttribute('aria-disabled')).toBe('true')
    const ciudadSel = $('[data-testid="cf-ciudad-select"]') as HTMLSelectElement
    expect(ciudadSel.getAttribute('aria-disabled')).toBe('true')
  })

  it('Test 3 — footer shows "Te quedan 5 de 50 hoy" given usage data', () => {
    renderModal()
    const footer = $('[data-testid="cf-footer"]')
    expect(footer?.textContent).toContain('Te quedan 5')
    expect(footer?.textContent).toContain('50')
  })

  it('Test 4 — cap exhausted: submit aria-disabled + banner "Se reinicia"', () => {
    mockUsage = { used_today: 50, daily_cap: 50, resets_at: '2026-05-29T05:00:00Z' }
    renderModal()
    const submit = $('[data-testid="cf-submit"]') as HTMLButtonElement
    expect(submit.getAttribute('aria-disabled')).toBe('true')
    const banner = $('[role="alert"][data-testid="cf-cap-banner"]')
    expect(banner).not.toBeNull()
    expect(banner!.textContent).toContain('Se reinicia')
  })

  it('Test 5 — skeleton shimmer appears when isLoading', () => {
    mockHookState = { isLoading: true, error: null }
    renderModal()
    expect($('[data-testid="narrative-skeleton"]')).not.toBeNull()
  })

  it('Test 6 — narrative pane shows narrativeText when result is set', async () => {
    renderModal()
    mockMutate.mockResolvedValueOnce({
      narrative_es: 'El canon más alto reduciría la probabilidad…',
      cost_usd: 0.00087,
      hypothetical_carriers: ORIGINAL_CARRIERS,
    })
    const canonInput = $('[data-testid="cf-canon-input"]') as HTMLInputElement
    act(() => {
      fireInputChange(canonInput, "1600000")
    })
    const submit = $('[data-testid="cf-submit"]') as HTMLButtonElement
    await act(async () => {
      submit.click()
      await new Promise(r => setTimeout(r, 0))
      await new Promise(r => setTimeout(r, 0))
    })
    expect($('[data-testid="cf-narrative"]')?.textContent).toContain('canon más alto')
  })

  it('Test 7 — delta columns render 2 sets of carrier cards when result is set', async () => {
    renderModal()
    mockMutate.mockResolvedValueOnce({
      narrative_es: 'x',
      cost_usd: 0.001,
      hypothetical_carriers: ORIGINAL_CARRIERS,
    })
    const canonInput = $('[data-testid="cf-canon-input"]') as HTMLInputElement
    act(() => {
      fireInputChange(canonInput, "1600000")
    })
    const submit = $('[data-testid="cf-submit"]') as HTMLButtonElement
    await act(async () => {
      submit.click()
      await new Promise(r => setTimeout(r, 0))
      await new Promise(r => setTimeout(r, 0))
    })
    const orig = $$('[data-testid="carrier-card-original"]')
    const hyp = $$('[data-testid="carrier-card-hypothetical"]')
    expect(orig.length).toBe(3)
    expect(hyp.length).toBe(3)
  })

  it('Test 8 — on 404 error, onQuote404 prop is called', async () => {
    const onQuote404 = vi.fn()
    mockMutate.mockRejectedValueOnce({ code: 404 })
    renderModal({ onQuote404 })
    const canonInput = $('[data-testid="cf-canon-input"]') as HTMLInputElement
    act(() => {
      fireInputChange(canonInput, "1600000")
    })
    const submit = $('[data-testid="cf-submit"]') as HTMLButtonElement
    await act(async () => {
      submit.click()
      await new Promise(r => setTimeout(r, 0))
      await new Promise(r => setTimeout(r, 0))
    })
    expect(onQuote404).toHaveBeenCalled()
  })

  it('Test 9 — on 429 error, inline banner appears and modal stays open', async () => {
    const onClose = vi.fn()
    mockMutate.mockRejectedValueOnce({ code: 429, cap: 50, used: 50, resets_at: '2026-05-29T05:00:00Z' })
    act(() => {
      root.render(
        <CounterfactualModal
          open={true}
          onClose={onClose}
          quoteId="q-test"
          originalCarriers={ORIGINAL_CARRIERS}
          originalInputs={ORIGINAL_INPUTS}
          onQuote404={vi.fn()}
        />,
      )
    })
    const canonInput = $('[data-testid="cf-canon-input"]') as HTMLInputElement
    act(() => {
      fireInputChange(canonInput, "1600000")
    })
    const submit = $('[data-testid="cf-submit"]') as HTMLButtonElement
    await act(async () => {
      submit.click()
      await new Promise(r => setTimeout(r, 0))
      await new Promise(r => setTimeout(r, 0))
    })
    expect($('[role="alert"][data-testid="cf-cap-banner"]')).not.toBeNull()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('Test 10 — on timeout error, retry button appears', async () => {
    mockMutate.mockRejectedValueOnce({ code: 'timeout' })
    renderModal()
    const canonInput = $('[data-testid="cf-canon-input"]') as HTMLInputElement
    act(() => {
      fireInputChange(canonInput, "1600000")
    })
    const submit = $('[data-testid="cf-submit"]') as HTMLButtonElement
    await act(async () => {
      submit.click()
      await new Promise(r => setTimeout(r, 0))
      await new Promise(r => setTimeout(r, 0))
    })
    const retry = $('[data-testid="cf-retry"]')
    expect(retry).not.toBeNull()
    expect(retry?.getAttribute('aria-label')).toContain('Reintentar')
  })
})

describe('CounterfactualModal i18n keys', () => {
  it('es.json + en.json contain costEstimate and capExhausted.body keys', async () => {
    const es = (await import('@/lib/i18n/locales/es.json')) as unknown as Record<string, unknown>
    const en = (await import('@/lib/i18n/locales/en.json')) as unknown as Record<string, unknown>

    const dig = (obj: unknown, path: string[]): unknown => {
      let cur: unknown = obj
      for (const p of path) {
        if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
          cur = (cur as Record<string, unknown>)[p]
        } else {
          return undefined
        }
      }
      return cur
    }

    expect(dig(es, ['inmobiliaria', 'ai', 'cotizador', 'askWhy', 'costEstimate'])).toBeTypeOf('string')
    expect(dig(en, ['inmobiliaria', 'ai', 'cotizador', 'askWhy', 'costEstimate'])).toBeTypeOf('string')
    expect(dig(es, ['inmobiliaria', 'ai', 'cotizador', 'askWhy', 'capExhausted', 'body'])).toBeTypeOf('string')
    expect(dig(en, ['inmobiliaria', 'ai', 'cotizador', 'askWhy', 'capExhausted', 'body'])).toBeTypeOf('string')
  })
})
