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
import { toast } from 'sonner'
import { falloDelMicro } from '@/lib/api/fallo-del-micro'

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

/*
 * Tanda 2 de errores (02-10-2026): el toast decía «No se pudo: 400» (o el
 * código del micro) y lo que el micro decía del motivo nunca llegaba al campo.
 */
describe('AccionSugerida — una acción que no sale', () => {
  const toastError = toast.error as unknown as ReturnType<typeof vi.fn>

  async function rechazarCon(motivo: string) {
    act(() => {
      buttonByText(/rechazar/i).click()
    })
    const textarea = container.querySelector('textarea')!
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
    act(() => {
      setter.call(textarea, motivo)
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      buttonByText(/confirmar/i).click()
    })
    return textarea
  }

  beforeEach(() => toastError.mockClear())

  it('🔴 un 400 con `campos` sobre `reason` pinta el error debajo del motivo, con el foco, sin toast', async () => {
    onAction.mockResolvedValue({
      ok: false,
      error: '400',
      fallo: await falloDelMicro({
        status: 400,
        json: async () => ({
          statusCode: 400,
          code: 'DATOS_INVALIDOS',
          message: ['El motivo no puede pasar de 500 caracteres.'],
          campos: [{ campo: 'reason', regla: 'longitud_maxima', mensaje: 'El motivo no puede pasar de 500 caracteres.' }],
        }),
      }),
    })
    render()
    const textarea = await rechazarCon('x'.repeat(600))

    const error = container.querySelector('#accion-sugerida-reason-error')
    expect(error?.textContent).toContain('El motivo no puede pasar de 500 caracteres.')
    expect(textarea.getAttribute('aria-invalid')).toBe('true')
    expect(textarea.getAttribute('aria-describedby')).toBe('accion-sugerida-reason-error')
    expect(document.activeElement).toBe(textarea)
    expect(toastError).not.toHaveBeenCalled()
  })

  it('un 5xx dice «de nuestro lado» con la referencia, nunca el status', async () => {
    onAction.mockResolvedValue({
      ok: false,
      error: '500',
      fallo: await falloDelMicro({ status: 500, json: async () => ({ error: 'boom', requestId: 'cafe1234-5678' }) }),
    })
    render()
    await act(async () => {
      buttonByText(/aprobar/i).click()
    })
    expect(toastError).toHaveBeenCalledTimes(1)
    const texto = String(toastError.mock.calls[0]![0])
    expect(texto).toContain('No pudimos aprobar: algo falló de nuestro lado')
    expect(texto).toContain('cafe1234')
    expect(texto).not.toMatch(/conexi|500/i)
  })

  it('si el pedido ni salió (status 0) habla de la conexión', async () => {
    const red = new TypeError('Failed to fetch')
    onAction.mockResolvedValue({ ok: false, error: red.message, fallo: red })
    render()
    await act(async () => {
      buttonByText(/aprobar/i).click()
    })
    expect(String(toastError.mock.calls[0]![0])).toMatch(/conexión/)
  })

  it('un 4xx dice el `message` del micro, no el código', async () => {
    onAction.mockResolvedValue({
      ok: false,
      error: 'MATCH_YA_DECIDIDO',
      fallo: await falloDelMicro({
        status: 409,
        json: async () => ({ code: 'MATCH_YA_DECIDIDO', message: 'Otra persona ya decidió este cruce.' }),
      }),
    })
    render()
    await act(async () => {
      buttonByText(/aprobar/i).click()
    })
    expect(toastError).toHaveBeenCalledWith('Otra persona ya decidió este cruce.')
  })
})

