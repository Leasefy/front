/**
 * AIAgentCard.test.tsx — Run wiring for the tenant-scoring agent card (v6.0-01 item #4)
 *
 * Covers:
 *   (1) the Run popover opens when the Run button is clicked
 *   (2) clicking Run does NOT navigate (Link click is prevented)
 *   (3) the execution panel mounts once a trace completes
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es' }),
}))

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Sentinel for the execution panel so we can assert it mounts without pulling
// in portals / Lenis.
vi.mock('./AIAgentExecutionPanel', () => ({
  AIAgentExecutionPanel: () => React.createElement('div', { 'data-testid': 'execution-panel' }, 'panel'),
}))

// Controllable agent-execution hook.
const mockRunScoring = vi.fn()
let _hookState: {
  isRunning: boolean
  error: string | null
  limiteDelPlan?: string | null
  result: unknown
  trace: { id: string; agentId: string; title: string; status: string; steps: unknown[] } | null
} = { isRunning: false, error: null, result: null, trace: null }

vi.mock('@/lib/hooks/use-agent', () => ({
  useAgentExecution: () => ({
    ..._hookState,
    runScoring: mockRunScoring,
    clearResult: vi.fn(),
  }),
}))

import { AIAgentCard } from './AIAgentCard'
import { getActiveAgents } from '@/lib/types/ai-agents'

const SCORING_AGENT = getActiveAgents().find((a) => a.id === 'tenant-scoring')!

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  _hookState = { isRunning: false, error: null, result: null, trace: null }
  mockRunScoring.mockReset()
  mockPush.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
  vi.restoreAllMocks()
})

function render() {
  act(() => {
    root.render(React.createElement(AIAgentCard, { agent: SCORING_AGENT }))
  })
}

function runButton(): HTMLButtonElement {
  const buttons = Array.from(container.querySelectorAll('button'))
  const btn = buttons.find((b) => /ejecutar|run/i.test(b.textContent ?? ''))
  if (!btn) throw new Error('Run button not found')
  return btn as HTMLButtonElement
}

// ── (1) popover opens ─────────────────────────────────────────────────────────

describe('AIAgentCard — Run popover', () => {
  it('opens the popover with an application-ID input when Run is clicked', () => {
    render()
    expect(container.querySelector('[role="dialog"]')).toBeNull()

    act(() => {
      runButton().dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })

    const dialog = container.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog!.querySelector('input')).not.toBeNull()
  })
})

// ── (2) Run does not navigate ──────────────────────────────────────────────────

describe('AIAgentCard — Run does not navigate', () => {
  it('prevents default on the click so the wrapping <Link> does not navigate', () => {
    render()
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    act(() => {
      runButton().dispatchEvent(event)
    })
    // preventDefault was called → navigation suppressed
    expect(event.defaultPrevented).toBe(true)
  })
})

// ── (3) execution panel mounts on completed trace ──────────────────────────────

describe('AIAgentCard — execution panel', () => {
  it('mounts the execution panel when the trace completes', () => {
    _hookState = {
      isRunning: false,
      error: null,
      result: { success: true, applicationId: 'app_1', score: 82, level: 'B' },
      trace: { id: 't1', agentId: 'tenant-scoring', title: 'Evaluación app_1', status: 'completed', steps: [] },
    }
    render()

    // Auto-open effect fires on completed trace → panel sentinel present
    expect(container.querySelector('[data-testid="execution-panel"]')).not.toBeNull()
  })
})

// ── (4) el tope del plan, dicho donde pasó (02-10-2026) ────────────────────────

const TOPE_DEL_MES =
  'Tu inmobiliaria alcanzó el límite de 30 evaluaciones de este mes de su plan. Sube de plan para evaluar más candidatos, o espera al próximo mes.'

describe('AIAgentCard — el tope de evaluaciones del plan', () => {
  it('🔴 dice el motivo entero, ofrece «Ver planes» y no navega solo', () => {
    _hookState = { isRunning: false, error: TOPE_DEL_MES, limiteDelPlan: 'evaluaciones', result: null, trace: null }
    render()

    const aviso = container.querySelector('[data-testid="error-del-agente"]')
    expect(aviso?.getAttribute('role')).toBe('alert')
    expect(aviso?.textContent).toContain(TOPE_DEL_MES)
    // El texto ya no se recorta a una línea.
    expect(aviso?.querySelector('.truncate')).toBeNull()
    expect(container.querySelector('[data-testid="ver-planes"]')?.textContent).toBe('Ver planes')
    // Pintarlo no navega.
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('«Ver planes» lleva a la página de los planes sólo al tocarlo, sin disparar el enlace de la tarjeta', () => {
    _hookState = { isRunning: false, error: TOPE_DEL_MES, limiteDelPlan: 'evaluaciones', result: null, trace: null }
    render()
    const verPlanes = container.querySelector<HTMLButtonElement>('[data-testid="ver-planes"]')!
    const clic = new MouseEvent('click', { bubbles: true, cancelable: true })
    act(() => {
      verPlanes.dispatchEvent(clic)
    })
    expect(clic.defaultPrevented).toBe(true)
    expect(mockPush).toHaveBeenCalledWith('/panel/inmobiliaria/upgrade')
  })

  it('un error que no es del plan no ofrece «Ver planes»', () => {
    _hookState = {
      isRunning: false,
      error: 'No pudimos iniciar la evaluación: algo falló de nuestro lado. Si sigue pasando, escríbenos con la referencia a1b2c3d4.',
      limiteDelPlan: null,
      result: null,
      trace: null,
    }
    render()
    expect(container.querySelector('[data-testid="error-del-agente"]')?.textContent).toContain('referencia a1b2c3d4')
    expect(container.querySelector('[data-testid="ver-planes"]')).toBeNull()
  })
})
