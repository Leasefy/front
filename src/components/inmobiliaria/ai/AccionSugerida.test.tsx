/**
 * AccionSugerida.test.tsx — F6 workspace primitives.
 *
 * Covers: suggestion rendering (label/confianza/razón/evidencia), direct
 * action dispatch, the requiresReason textarea flow (body includes the
 * reason), and the disabled state.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

// Resolve chrome via the REAL es.json so literal assertions keep verifying
// the byte-identical es output (stub avoids the provider's localStorage effect).
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))


vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { AccionSugerida } from './AccionSugerida'
import { I18nProvider } from '@/lib/i18n'
import type { WorkItemAction } from '@/lib/api/work-item'

const APPROVE: WorkItemAction = {
  id: 'approve',
  label: 'Aprobar',
  kind: 'primary',
  method: 'POST',
  path: '/api/agency/a1/conciliacion/matches/m1/approve',
}

const REJECT: WorkItemAction = {
  id: 'reject',
  label: 'Rechazar',
  kind: 'danger',
  method: 'POST',
  path: '/api/agency/a1/conciliacion/matches/m1/reject',
  requiresReason: true,
}

const ACCION = {
  label: 'Conciliar movimiento con recaudo',
  confianza: 0.84,
  razon: 'Monto y fecha coinciden con el recaudo esperado.',
  evidencia: [{ label: 'Monto', value: '$1.250.000' }],
}

let container: HTMLDivElement
let root: Root
let onAction: ReturnType<typeof vi.fn>

beforeEach(() => {
  onAction = vi.fn().mockResolvedValue({ ok: true })
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

function render(props: Partial<React.ComponentProps<typeof AccionSugerida>> = {}) {
  act(() => {
    root.render(
      // Real I18nProvider (default locale 'es') — chrome literals below assert
      // the byte-identical es output of the extracted i18n keys.
      React.createElement(
        I18nProvider,
        null,
        React.createElement(AccionSugerida, {
          accion: ACCION,
          actions: [APPROVE, REJECT],
          onAction: onAction as unknown as React.ComponentProps<typeof AccionSugerida>['onAction'],
          ...props,
        }),
      ),
    )
  })
}

function buttonByText(re: RegExp): HTMLButtonElement {
  const btn = Array.from(container.querySelectorAll('button')).find((b) =>
    re.test(b.textContent ?? ''),
  )
  if (!btn) throw new Error(`Button ${re} not found`)
  return btn as HTMLButtonElement
}

describe('AccionSugerida — rendering', () => {
  it('renders eyebrow, label, confianza, razón and evidencia', () => {
    render()
    const card = container.querySelector('[data-testid="accion-sugerida"]')
    expect(card).not.toBeNull()
    expect(card!.textContent).toContain('El agente propone')
    expect(card!.textContent).toContain('Conciliar movimiento con recaudo')
    expect(card!.textContent).toContain('84% conf.')
    expect(card!.textContent).toContain('Monto y fecha coinciden')
    expect(card!.textContent).toContain('$1.250.000')
  })

  it('renders no action buttons when actions is empty', () => {
    render({ actions: [] })
    expect(container.querySelectorAll('button').length).toBe(0)
  })
})

describe('AccionSugerida — direct action', () => {
  it('fires onAction without a body for a non-reason action', async () => {
    render()
    await act(async () => {
      buttonByText(/aprobar/i).click()
    })
    expect(onAction).toHaveBeenCalledTimes(1)
    expect(onAction).toHaveBeenCalledWith(APPROVE, undefined)
  })
})

describe('AccionSugerida — requiresReason flow', () => {
  it('first click reveals the textarea instead of firing, then Confirmar sends { reason }', async () => {
    render()

    // 1st click: reveal — no dispatch yet
    act(() => {
      buttonByText(/rechazar/i).click()
    })
    expect(onAction).not.toHaveBeenCalled()
    const textarea = container.querySelector('textarea')
    expect(textarea).not.toBeNull()

    // Confirmar is disabled while the reason is empty
    expect(buttonByText(/confirmar/i).disabled).toBe(true)

    // Type a reason (controlled input → native setter + input event)
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
    act(() => {
      setter.call(textarea!, 'monto no coincide')
      textarea!.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await act(async () => {
      buttonByText(/confirmar/i).click()
    })
    expect(onAction).toHaveBeenCalledTimes(1)
    expect(onAction).toHaveBeenCalledWith(REJECT, { reason: 'monto no coincide' })
  })
})

describe('AccionSugerida — disabled', () => {
  it('disables the action buttons', () => {
    render({ disabled: true })
    expect(buttonByText(/aprobar/i).disabled).toBe(true)
    expect(buttonByText(/rechazar/i).disabled).toBe(true)
  })

  it('disables ALL action buttons while one action is in flight (cross-action lock)', async () => {
    let resolveAction!: (v: { ok: boolean }) => void
    onAction.mockImplementation(
      () => new Promise<{ ok: boolean }>((r) => (resolveAction = r)),
    )
    render()

    await act(async () => {
      buttonByText(/aprobar/i).click()
    })

    // While Aprobar is in flight, the OTHER action is locked too
    expect(buttonByText(/aprobar/i).disabled).toBe(true)
    expect(buttonByText(/rechazar/i).disabled).toBe(true)

    await act(async () => {
      resolveAction({ ok: true })
    })

    // Lock released once the action settles
    expect(buttonByText(/aprobar/i).disabled).toBe(false)
    expect(buttonByText(/rechazar/i).disabled).toBe(false)
  })
})
