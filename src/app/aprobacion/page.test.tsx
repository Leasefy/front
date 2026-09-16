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
const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn(), replace: replaceMock }),
}))

// El estado del estudio se mockea: su lógica propia (404 = sin_estudio,
// polling, mapeo) ya está cubierta en `use-prescoring-current.test.ts`.
let mockEstudio: { estado: string; isLoading: boolean } = {
  estado: 'sin_estudio',
  isLoading: false,
}
const preScoringOptionsMock = vi.fn()
vi.mock('@/lib/hooks/use-prescoring-current', () => ({
  usePreScoringCurrent: (options?: unknown) => {
    preScoringOptionsMock(options)
    return mockEstudio
  },
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
import { guardarArriendoEnCurso } from '@/lib/aprobacion/arriendo-en-curso'

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
  mockEstudio = { estado: 'sin_estudio', isLoading: false }
  pushMock.mockReset()
  replaceMock.mockReset()
  preScoringOptionsMock.mockReset()
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

/**
 * El regreso a /aprobacion con un estudio YA hecho.
 *
 * Lo dispara el cierre de sesión por tiempo: `terminarSesion` guarda la ruta
 * actual como `returnUrl`, así que quien se quedó en esta pantalla esperando
 * el pago vuelve exactamente acá después de volver a entrar — y se encontraba
 * el formulario vacío, como si nunca hubiera pagado. El formulario no es una
 * pantalla neutra: es una invitación a pagar de nuevo algo que ya tiene.
 */
describe('<AprobacionPage> — quien ya tiene un estudio no ve el formulario', () => {
  beforeEach(() => {
    mockUser = { role: 'tenant' }
  })

  it('estudio en proceso: manda a /inquilino/aprobacion sin mostrar el formulario', () => {
    mockEstudio = { estado: 'en_proceso', isLoading: false }

    act(() => {
      root.render(<AprobacionPage />)
    })

    expect(replaceMock).toHaveBeenCalledWith('/inquilino/aprobacion')
    expect(container.querySelector('form')).toBeNull()
  })

  it('estudio con resultado (aprobado): mismo destino', () => {
    mockEstudio = { estado: 'aprobado', isLoading: false }

    act(() => {
      root.render(<AprobacionPage />)
    })

    expect(replaceMock).toHaveBeenCalledWith('/inquilino/aprobacion')
  })

  it('mientras se resuelve el estado: no muestra el formulario ni navega todavía', () => {
    mockEstudio = { estado: 'sin_estudio', isLoading: true }

    act(() => {
      root.render(<AprobacionPage />)
    })

    expect(replaceMock).not.toHaveBeenCalled()
    expect(container.querySelector('form')).toBeNull()
  })

  it('estudio expirado: la ventana cerró, el formulario SÍ corresponde', () => {
    mockEstudio = { estado: 'expirado', isLoading: false }

    act(() => {
      root.render(<AprobacionPage />)
    })

    expect(replaceMock).not.toHaveBeenCalled()
    expect(container.querySelector('form')).not.toBeNull()
  })

  it('sin sesión: no consulta el estudio y muestra el formulario', () => {
    mockUser = null

    act(() => {
      root.render(<AprobacionPage />)
    })

    expect(preScoringOptionsMock).toHaveBeenCalledWith({ enabled: false })
    expect(replaceMock).not.toHaveBeenCalled()
    expect(container.querySelector('form')).not.toBeNull()
  })
})

/**
 * Paso 2 del recorrido que empieza en la ficha (Nico, 14-09): se arma como el
 * paso 1 — los pasos en su franja, FUERA del formulario —, recuerda el inmueble
 * elegido, escribe el canon con puntos de miles y abre desde arriba.
 */
describe('<AprobacionPage> — paso 2 desde la ficha', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    window.history.replaceState(null, '', '/aprobacion?paso=2&canon=1100000&ciudad=Bogot%C3%A1&tipo=apartamento')
  })
  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('los pasos van fuera del formulario, con el inmueble del paso 1 y el canon con puntos de miles', () => {
    const subir = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    guardarArriendoEnCurso({
      propertyId: 'p-1',
      titulo: 'Apartamento en Bello',
      ciudad: 'Bello',
      tipo: 'apartamento',
      foto: null,
      canon: 1_100_000,
      ingresoTotal: 5_000_000,
      canonMaximo: 3_333_333,
    })

    act(() => {
      root.render(<AprobacionPage />)
    })

    const pasos = container.querySelector('[data-testid="paso-2-de-3"]')
    const form = container.querySelector('form') as HTMLFormElement
    expect(pasos).not.toBeNull()
    expect(form.contains(pasos)).toBe(false)
    expect(container.querySelector('[data-testid="inmueble-del-paso-2"]')?.textContent).toContain('Apartamento en Bello')
    expect((container.querySelector('#canon') as HTMLInputElement).value).toBe('1.100.000')
    expect(subir).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }))
  })

  it('una ciudad del inmueble fuera de la lista fija igual queda elegida', () => {
    window.history.replaceState(null, '', '/aprobacion?paso=2&canon=1100000&ciudad=Bello&tipo=apartamento')
    act(() => {
      root.render(<AprobacionPage />)
    })
    expect((container.querySelector('[data-testid="select-ciudad"]') as HTMLSelectElement).value).toBe('Bello')
  })

  it('el botón queda apagado hasta autorizar el tratamiento de datos', () => {
    act(() => {
      root.render(<AprobacionPage />)
    })
    const boton = container.querySelector('button[type="submit"]') as HTMLButtonElement
    expect(boton.disabled).toBe(true)

    act(() => {
      ;(container.querySelector('#consent') as HTMLButtonElement).click()
    })
    expect(boton.disabled).toBe(false)
  })

  it('desde la ficha la ciudad es «Ciudad del inmueble»', () => {
    act(() => {
      root.render(<AprobacionPage />)
    })
    expect(container.querySelector('label[for="ciudad"]')?.textContent).toBe('Ciudad del inmueble')
  })

  it('sin venir de la ficha no muestra los pasos ni un inmueble', () => {
    window.history.replaceState(null, '', '/aprobacion')
    act(() => {
      root.render(<AprobacionPage />)
    })
    expect(container.querySelector('[data-testid="paso-2-de-3"]')).toBeNull()
    expect(container.querySelector('[data-testid="inmueble-del-paso-2"]')).toBeNull()
  })
})

/**
 * «Cerrar» (Nico, 2026-09-15): desde el paso 2 devolvía al paso 1 —era
 * `router.back()`— y salía sin preguntar. Ahora pregunta, y salir sale.
 */
describe('<AprobacionPage> — cerrar el paso 2', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    window.history.replaceState(null, '', '/aprobacion?paso=2&canon=2200000&ciudad=Caldas&tipo=local')
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })
  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  const cerrar = () => document.querySelector<HTMLButtonElement>('[data-testid="cerrar-aprobacion"]')!
  const dialogo = () => document.querySelector('[data-testid="confirmar-salida-aprobacion"]')
  const boton = (testId: string) => document.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)

  function conInmueble() {
    guardarArriendoEnCurso({
      propertyId: 'p-9',
      titulo: 'Local en Centro, Caldas',
      ciudad: 'Caldas',
      tipo: 'local',
      foto: null,
      canon: 2_200_000,
      ingresoTotal: 9_000_000,
      canonMaximo: 3_000_000,
    })
  }

  it('preguntar antes: el clic en Cerrar abre la confirmación y no navega', () => {
    conInmueble()
    act(() => root.render(<AprobacionPage />))

    act(() => cerrar().click())

    expect(pushMock).not.toHaveBeenCalled()
    expect(dialogo()?.textContent).toContain('Local en Centro, Caldas')
    expect(boton('seguir-en-aprobacion')).not.toBeNull()
  })

  it('salir va al inmueble que estaba intentando arrendar, NO al paso 1', () => {
    conInmueble()
    act(() => root.render(<AprobacionPage />))

    act(() => cerrar().click())
    act(() => boton('salir-de-aprobacion')!.click())

    expect(pushMock).toHaveBeenCalledWith('/propiedades/p-9')
  })

  it('sin inmueble en curso y sin sesión, salir lleva al catálogo', () => {
    mockUser = null
    act(() => root.render(<AprobacionPage />))

    act(() => cerrar().click())
    act(() => boton('salir-de-aprobacion')!.click())

    expect(pushMock).toHaveBeenCalledWith('/propiedades')
  })

  it('«Seguir con mi solicitud» cierra la confirmación sin sacarlo del paso 2', () => {
    conInmueble()
    act(() => root.render(<AprobacionPage />))

    act(() => cerrar().click())
    act(() => boton('seguir-en-aprobacion')!.click())

    expect(pushMock).not.toHaveBeenCalled()
  })
})

