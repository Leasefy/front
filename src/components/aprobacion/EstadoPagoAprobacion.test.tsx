/**
 * EstadoPagoAprobacion.test.tsx
 *
 * Cubre los cinco casos que puede resolver `usePreScoringCurrent` mientras
 * `/aprobacion` está en modo "pagando" (pestaña de Wompi abierta en otra
 * pestaña, esta pantalla poleando):
 *  · sin_estudio (con y sin `popupBlocked`) → esperando confirmación de pago
 *  · en_proceso                              → pago confirmado, revisa el correo
 *  · aprobado / rechazado                    → estudio listo, ver resultado
 *  · expirado / error                        → salida para reintentar
 *
 * `usePreScoringCurrent` se mockea: el mapeo de estados ya está probado en
 * `prescoring.types.test.ts` y en el propio hook — acá solo importa qué
 * copy/CTA sale para cada `estado`.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { hookMock } = vi.hoisted(() => ({ hookMock: vi.fn() }))
vi.mock('@/lib/hooks/use-prescoring-current', () => ({
  usePreScoringCurrent: () => hookMock(),
}))

import { EstadoPagoAprobacion } from './EstadoPagoAprobacion'

let container: HTMLDivElement
let root: Root
let refetchMock: ReturnType<typeof vi.fn<() => void>>
let onReintentarMock: ReturnType<typeof vi.fn<() => void>>

function mockHook(estado: string) {
  refetchMock = vi.fn<() => void>()
  hookMock.mockReturnValue({
    current: null,
    estado,
    isLoading: false,
    error: null,
    refetch: refetchMock,
  })
}

function render(props: Partial<{ paymentUrl: string | null; popupBlocked: boolean }> = {}) {
  onReintentarMock = vi.fn<() => void>()
  act(() => {
    root.render(
      <EstadoPagoAprobacion
        paymentUrl={props.paymentUrl ?? 'https://checkout.wompi.co/l/ord-123'}
        popupBlocked={props.popupBlocked ?? false}
        onReintentar={onReintentarMock}
      />,
    )
  })
}

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

describe('<EstadoPagoAprobacion>', () => {
  it('sin_estudio: muestra "esperando confirmación" con el link de pago abierto en otra pestaña', () => {
    mockHook('sin_estudio')
    render()

    expect(container.textContent).toContain('Esperando la confirmación de tu pago')
    const link = container.querySelector('a[href="https://checkout.wompi.co/l/ord-123"]')
    expect(link).not.toBeNull()
    expect(link?.getAttribute('target')).toBe('_blank')
    expect(link?.textContent).toContain('¿No ves la pestaña?')
  })

  it('sin_estudio + popupBlocked: cambia el copy del link a "no se abrió la pestaña"', () => {
    mockHook('sin_estudio')
    render({ popupBlocked: true })

    expect(container.textContent).toContain('No se abrió la pestaña')
  })

  it('sin_estudio: el botón "Ya pagué — verificar" llama a refetch', () => {
    mockHook('sin_estudio')
    render()

    const btn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Ya pagué'),
    ) as HTMLButtonElement
    expect(btn).toBeTruthy()
    act(() => {
      btn.click()
    })
    expect(refetchMock).toHaveBeenCalledTimes(1)
  })

  it('en_proceso: pago confirmado, con CTA a /inquilino/aprobacion', () => {
    mockHook('en_proceso')
    render()

    expect(container.textContent).toContain('Pago confirmado')
    const cta = container.querySelector('a[href="/inquilino/aprobacion"]')
    expect(cta).not.toBeNull()
  })

  it('aprobado: estudio listo, con CTA a /inquilino/aprobacion', () => {
    mockHook('aprobado')
    render()

    expect(container.textContent).toContain('listo')
    expect(container.querySelector('a[href="/inquilino/aprobacion"]')).not.toBeNull()
  })

  it('rechazado: estudio listo, con CTA a /inquilino/aprobacion', () => {
    mockHook('rechazado')
    render()

    expect(container.textContent).toContain('listo')
    expect(container.querySelector('a[href="/inquilino/aprobacion"]')).not.toBeNull()
  })

  it('expirado: botón de reintentar llama a onReintentar', () => {
    mockHook('expirado')
    render()

    expect(container.textContent).toMatch(/venci/i)
    const btn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.match(/volver a intentar/i),
    ) as HTMLButtonElement
    expect(btn).toBeTruthy()
    act(() => {
      btn.click()
    })
    expect(onReintentarMock).toHaveBeenCalledTimes(1)
  })

  it('error: botón de reintentar llama a onReintentar', () => {
    mockHook('error')
    render()

    expect(container.textContent).toMatch(/error/i)
    const btn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.match(/volver a intentar/i),
    ) as HTMLButtonElement
    expect(btn).toBeTruthy()
    act(() => {
      btn.click()
    })
    expect(onReintentarMock).toHaveBeenCalledTimes(1)
  })

  it('revalida al volver el foco a la pestaña', () => {
    mockHook('sin_estudio')
    render()

    act(() => {
      window.dispatchEvent(new Event('focus'))
    })
    expect(refetchMock).toHaveBeenCalledTimes(1)
  })
})
