/**
 * page.test.tsx — /aprobacion, Slice 1 del pre-scoring de afianzamiento.
 *
 * El pago YA NO navega la pantalla: abre Wompi en OTRA pestaña (mismo patrón
 * que `useAgencyCheckout.pay` — pre-abrir sincrónicamente dentro del gesto de
 * click, antes de cualquier `await`) y esta página se queda, poleando el
 * back vía `<EstadoPagoAprobacion>` (probado aparte en su propio archivo).
 *
 * Alcance de este submit: la persona YA ESTÁ LOGUEADA. Si no hay sesión, el
 * submit manda a `/auth?returnUrl=/aprobacion` en vez de intentar crear la
 * orden — sin tocar `window.open`.
 *
 * Con sesión, cubre las tres respuestas del back:
 *  (a) `reused:false` → crea la orden, redirige la pestaña pre-abierta al
 *      `paymentUrl` y entra en modo "pagando" (se renderiza
 *      `<EstadoPagoAprobacion>` en vez del form).
 *  (b) `reused:true`  → ya existe un estudio: NO se paga de nuevo, se cierra
 *      la pestaña pre-abierta y se manda a `/inquilino/aprobacion`.
 *  (c) error de `crearOrdenPreScoring` → se cierra la pestaña, se muestra el
 *      error y NO se entra en modo "pagando".
 * Y el caso de popup bloqueado: `window.open` devuelve null/closed → se pasa
 * `popupBlocked` a `<EstadoPagoAprobacion>`.
 * Y el caso de formulario inválido: no llama a ningún servicio ni abre nada.
 *
 * `<EstadoPagoAprobacion>` se mockea acá: su propio comportamiento (copy por
 * estado, polling, botón "ya pagué") ya está cubierto en
 * `EstadoPagoAprobacion.test.tsx` — acá solo importa que la página lo
 * renderice con las props correctas en el momento correcto.
 *
 * `@/components/ui/select` se mockea: Radix Select no es interactuable de
 * forma confiable bajo happy-dom (requiere pointer capture / portales). El
 * mock traduce el mismo árbol de props (`SelectTrigger[id]`,
 * `SelectContent > SelectItem[value]`) a un `<select>` nativo equivalente.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn(), replace: vi.fn() }),
}))

let mockUser: { role: string } | null = null
vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({ user: mockUser }),
}))

const { crearOrdenPreScoringMock, MockPreScoringError } = vi.hoisted(() => {
  class MockPreScoringError extends Error {
    kind: string
    constructor(kind: string, message: string) {
      super(message)
      this.kind = kind
    }
  }
  return { crearOrdenPreScoringMock: vi.fn(), MockPreScoringError }
})
vi.mock('@/lib/api/estudio-solicitud.service', () => ({
  crearOrdenPreScoring: (...a: unknown[]) => crearOrdenPreScoringMock(...a),
  PreScoringError: MockPreScoringError,
}))

// El estado post-pago se prueba aparte: acá solo importa con qué props se
// renderiza y cuándo reemplaza al form.
const estadoPagoPropsMock = vi.fn()
vi.mock('@/components/aprobacion/EstadoPagoAprobacion', () => ({
  EstadoPagoAprobacion: (props: { paymentUrl: string | null; popupBlocked: boolean; onReintentar: () => void }) => {
    estadoPagoPropsMock(props)
    return React.createElement(
      'div',
      { 'data-testid': 'estado-pago' },
      'estado-pago',
    )
  },
}))

// Radix Select no es fácilmente interactuable bajo happy-dom: se traduce a un
// <select> nativo leyendo directamente los props de SelectTrigger/SelectItem
// (nunca se renderizan como componentes reales, así que no hace falta
// reproducir su comportamiento).
vi.mock('@/components/ui/select', () => {
  function Select({
    value,
    onValueChange,
    children,
  }: {
    value: string
    onValueChange: (v: string) => void
    children: React.ReactNode
  }) {
    const kids = React.Children.toArray(children) as React.ReactElement[]
    const trigger = kids.find((c) => (c.props as { id?: string })?.id)
    const content = kids.find((c) => Array.isArray((c.props as { children?: unknown })?.children))
    const items = content
      ? (React.Children.toArray((content.props as { children: React.ReactNode }).children) as React.ReactElement[])
      : []
    const testId = (trigger?.props as { id?: string } | undefined)?.id
    return (
      <select
        data-testid={testId ? `select-${testId}` : undefined}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      >
        <option value="" />
        {items.map((item) => {
          const p = item.props as { value: string; children: React.ReactNode }
          return (
            <option key={p.value} value={p.value}>
              {typeof p.children === 'string' ? p.children : p.value}
            </option>
          )
        })}
      </select>
    )
  }
  return {
    Select,
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectValue: () => null,
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

import AprobacionPage from './page'

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

let container: HTMLDivElement
let root: Root
let openMock: ReturnType<typeof vi.fn>
let payTab: { location: { href: string }; closed: boolean; close: ReturnType<typeof vi.fn> }

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  mockUser = null
  pushMock.mockReset()
  crearOrdenPreScoringMock.mockReset()
  estadoPagoPropsMock.mockReset()

  payTab = { location: { href: '' }, closed: false, close: vi.fn() }
  openMock = vi.fn(() => payTab as unknown as Window)
  vi.stubGlobal('open', openMock)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function setInputValue(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  act(() => {
    setter?.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function setSelectValue(el: HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set
  act(() => {
    setter?.call(el, value)
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

function fillValidForm() {
  setInputValue(container.querySelector('#nombres') as HTMLInputElement, 'María')
  setInputValue(container.querySelector('#apellidos') as HTMLInputElement, 'Restrepo')
  setInputValue(container.querySelector('#cedula') as HTMLInputElement, '1098765432')
  setInputValue(container.querySelector('#phone') as HTMLInputElement, '3001112233')
  setInputValue(container.querySelector('#email') as HTMLInputElement, 'maria@correo.com')
  setSelectValue(container.querySelector('[data-testid="select-ciudad"]') as HTMLSelectElement, 'Bogotá')
  setInputValue(container.querySelector('#canon') as HTMLInputElement, '2.000.000')
  setSelectValue(
    container.querySelector('[data-testid="select-tipoInmueble"]') as HTMLSelectElement,
    'apartamento',
  )
  const consent = container.querySelector('#consent') as HTMLButtonElement
  act(() => {
    consent.click()
  })
}

async function submit() {
  const form = container.querySelector('form') as HTMLFormElement
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('<AprobacionPage> — Slice 1 pre-scoring (pago en otra pestaña)', () => {
  describe('sin sesión', () => {
    it('formulario válido: NO crea la orden, NO abre ninguna pestaña, manda a /auth con returnUrl a /aprobacion', async () => {
      mockUser = null

      act(() => {
        root.render(<AprobacionPage />)
      })
      fillValidForm()
      await submit()

      expect(openMock).not.toHaveBeenCalled()
      expect(crearOrdenPreScoringMock).not.toHaveBeenCalled()
      expect(pushMock).toHaveBeenCalledWith('/auth?returnUrl=%2Faprobacion')
    })
  })

  describe('con sesión', () => {
    beforeEach(() => {
      mockUser = { role: 'tenant' }
    })

    it('reused:false — abre la pestaña ANTES de crear la orden, la redirige al pago y entra en modo "pagando"', async () => {
      crearOrdenPreScoringMock.mockImplementation(async () => {
        // La pestaña ya debe estar abierta antes de que resuelva el POST:
        // se pre-abre sincrónicamente dentro del gesto de click.
        expect(openMock).toHaveBeenCalledTimes(1)
        return {
          reused: false,
          orderId: 'ord-123',
          paymentUrl: 'https://checkout.wompi.co/l/ord-123',
        }
      })

      act(() => {
        root.render(<AprobacionPage />)
      })
      fillValidForm()
      await submit()

      expect(crearOrdenPreScoringMock).toHaveBeenCalledTimes(1)
      const payload = crearOrdenPreScoringMock.mock.calls[0][0]
      expect(payload).toMatchObject({
        documentNumber: '1098765432',
        phoneE164: '+573001112233',
        candidate: { names: 'María', surnames: 'Restrepo', email: 'maria@correo.com' },
        ciudad: 'Bogotá',
        canonCop: 2_000_000,
        tipoInmueble: 'apartamento',
        consent: true,
      })

      // La página NUNCA navega: sigue siendo esta misma pantalla.
      expect(pushMock).not.toHaveBeenCalled()
      expect(payTab.location.href).toBe('https://checkout.wompi.co/l/ord-123')
      expect(payTab.close).not.toHaveBeenCalled()

      // Reemplaza el form por el estado de pago.
      expect(container.querySelector('[data-testid="estado-pago"]')).not.toBeNull()
      expect(container.querySelector('form')).toBeNull()
      expect(estadoPagoPropsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentUrl: 'https://checkout.wompi.co/l/ord-123',
          popupBlocked: false,
        }),
      )
    })

    it('reused:true — NO paga de nuevo, cierra la pestaña pre-abierta y redirige a /inquilino/aprobacion', async () => {
      crearOrdenPreScoringMock.mockResolvedValue({
        reused: true,
        orderId: 'ord-999',
        status: 'STUDY_STARTED',
      })

      act(() => {
        root.render(<AprobacionPage />)
      })
      fillValidForm()
      await submit()

      expect(payTab.close).toHaveBeenCalledTimes(1)
      expect(pushMock).toHaveBeenCalledWith('/inquilino/aprobacion')
      expect(container.querySelector('[data-testid="estado-pago"]')).toBeNull()
    })

    it('popup bloqueado (window.open devuelve null): pasa popupBlocked=true a <EstadoPagoAprobacion>', async () => {
      openMock.mockReturnValue(null)
      crearOrdenPreScoringMock.mockResolvedValue({
        reused: false,
        orderId: 'ord-123',
        paymentUrl: 'https://checkout.wompi.co/l/ord-123',
      })

      act(() => {
        root.render(<AprobacionPage />)
      })
      fillValidForm()
      await submit()

      expect(container.querySelector('[data-testid="estado-pago"]')).not.toBeNull()
      expect(estadoPagoPropsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentUrl: 'https://checkout.wompi.co/l/ord-123',
          popupBlocked: true,
        }),
      )
    })

    it('si crearOrdenPreScoring falla, cierra la pestaña, muestra el error y NO entra en modo pagando', async () => {
      crearOrdenPreScoringMock.mockRejectedValue(
        new MockPreScoringError('unavailable', 'El servicio no está disponible en este momento. Intenta más tarde.'),
      )

      act(() => {
        root.render(<AprobacionPage />)
      })
      fillValidForm()
      await submit()

      expect(payTab.close).toHaveBeenCalledTimes(1)
      expect(pushMock).not.toHaveBeenCalled()
      expect(container.querySelector('[data-testid="estado-pago"]')).toBeNull()
      expect(container.textContent).toContain('El servicio no está disponible en este momento. Intenta más tarde.')
    })

    it('formulario inválido (sin nombres): no llama a ningún servicio ni abre ninguna pestaña', async () => {
      act(() => {
        root.render(<AprobacionPage />)
      })
      // Deliberadamente NO se llena "nombres".
      setInputValue(container.querySelector('#apellidos') as HTMLInputElement, 'Restrepo')
      setInputValue(container.querySelector('#cedula') as HTMLInputElement, '1098765432')
      setInputValue(container.querySelector('#phone') as HTMLInputElement, '3001112233')
      setInputValue(container.querySelector('#email') as HTMLInputElement, 'maria@correo.com')
      setSelectValue(container.querySelector('[data-testid="select-ciudad"]') as HTMLSelectElement, 'Bogotá')
      setSelectValue(
        container.querySelector('[data-testid="select-tipoInmueble"]') as HTMLSelectElement,
        'apartamento',
      )
      const consent = container.querySelector('#consent') as HTMLButtonElement
      act(() => {
        consent.click()
      })
      await submit()

      expect(openMock).not.toHaveBeenCalled()
      expect(crearOrdenPreScoringMock).not.toHaveBeenCalled()
      expect(pushMock).not.toHaveBeenCalled()
    })
  })
})
