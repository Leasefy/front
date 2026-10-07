import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

// ── Mocks (hoisted) ──────────────────────────────────────────────────────────
let authState: {
  user: { role?: string; backendRole?: string } | null
  isAuthenticated: boolean
  hasActiveAgencyMembership: boolean
}

const { pushMock, createPropertyInquiryMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  createPropertyInquiryMock: vi.fn(),
}))

vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => authState }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  usePathname: () => '/propiedades/p1',
}))
vi.mock('@/lib/api/visits.service', () => ({
  visitsApi: { getSlots: vi.fn().mockResolvedValue({ slots: [] }), create: vi.fn() },
}))
vi.mock('@/lib/api/messages.service', () => ({
  messagesApi: { createPropertyInquiry: (...args: unknown[]) => createPropertyInquiryMock(...args) },
}))
const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

import { StickyCTA, MobileStickyCTA, getScheduleErrorMessage } from './StickyCTA'
import { ApiError } from '@/lib/api/client'

let container: HTMLDivElement
let root: Root
const writeText = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  authState = { user: null, isAuthenticated: false, hasActiveAgencyMembership: false }
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  writeText.mockClear()
  pushMock.mockClear()
  createPropertyInquiryMock.mockReset()
  toast.success.mockClear()
  toast.error.mockClear()
  // La hoja nativa NO existe por defecto: quien la quiera, la pone.
  delete (navigator as { share?: unknown }).share
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

function render(props: Partial<React.ComponentProps<typeof StickyCTA>> = {}) {
  act(() => {
    root.render(<StickyCTA propertyId="p1" price={1500000} {...props} />)
  })
}

function q(sel: string) {
  return container.querySelector(sel)
}

describe('<StickyCTA> — tenant / anonymous viewer', () => {
  /*
   * El CTA de postularse **sigue estando** — nunca se esconde ni se
   * deshabilita. Lo que cambió es a dónde lleva: sin aprobación ya no salta
   * directo al wizard, abre el camino que falta recorrer (ver PostularButton
   * y docs/VOCABULARIO.md). Un muro convertido en escalón.
   */
  it('muestra el CTA de postularse, visible y con su texto', () => {
    render()

    expect(container.textContent).toContain('Postularme a esta propiedad')
    // 🔴 El estudio es opcional (Nico, 04-10-2026): el CTA es el enlace al
    // asistente, nunca un botón que frena.
    const cta = [...container.querySelectorAll('a, button')].find((b) =>
      b.textContent?.includes('Postularme a esta propiedad'),
    )
    expect(cta).toBeTruthy()
    expect(cta?.hasAttribute('disabled')).toBe(false)
    // No agency share panel for a tenant/anonymous viewer.
    expect(q('[data-testid="agency-share-panel"]')).toBeFalsy()
  })

  // QA-IA-A (04-10-2026): «Respuesta en menos de 24h» y «Verificado» no tenían
  // un dato detrás.
  it('no promete tiempos de respuesta ni sellos sin dato', () => {
    render()
    expect(container.textContent).not.toContain('menos de 24h')
    expect(container.textContent).not.toContain('Verificado')
  })

  it('🔴 sin estudio también lleva derecho al asistente: el estudio es opcional (Nico, 04-10-2026)', () => {
    render()
    // Antes, sin sesión ni aprobación, el clic abría «Antes de postularte» y
    // la persona no llegaba al asistente. Ahora el estudio se le ofrece allá.
    expect(q('a[href="/aplicar/p1"]')).toBeTruthy()
  })
})

describe('<StickyCTA> — inmobiliaria / agent viewer', () => {
  it('replaces apply/visit with a share panel (no /aplicar link) for an agency user', () => {
    authState = { user: { role: 'agency' }, isAuthenticated: true, hasActiveAgencyMembership: false }
    render()

    expect(q('[data-testid="agency-share-panel"]')).toBeTruthy()
    // The tenant actions must be gone.
    expect(q('a[href="/aplicar/p1"]')).toBeFalsy()
    expect(container.textContent).not.toContain('Postularme a esta propiedad')
  })

  it('treats an invited agent (backendRole AGENT) as an agency viewer', () => {
    authState = { user: { backendRole: 'AGENT' }, isAuthenticated: true, hasActiveAgencyMembership: false }
    render()

    expect(q('[data-testid="agency-share-panel"]')).toBeTruthy()
  })

  it('treats a personal-role user with an active agency membership as an agency viewer', () => {
    authState = { user: { role: 'landlord' }, isAuthenticated: true, hasActiveAgencyMembership: true }
    render()

    expect(q('[data-testid="agency-share-panel"]')).toBeTruthy()
  })

  it('copies the public property link to the clipboard when the copy button is clicked', async () => {
    authState = { user: { role: 'agency' }, isAuthenticated: true, hasActiveAgencyMembership: false }
    render()

    const copyBtn = q('[data-testid="agency-share-copy"]') as HTMLButtonElement
    expect(copyBtn).toBeTruthy()

    await act(async () => {
      copyBtn.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText.mock.calls[0][0]).toContain('/propiedades/p1')
  })

  it('an agency viewer sees the share panel on a SALE listing too (unconditional, before the listingType branch)', () => {
    authState = { user: { role: 'agency' }, isAuthenticated: true, hasActiveAgencyMembership: false }
    render({ listingType: 'sale', salePrice: 500_000_000 })

    expect(q('[data-testid="agency-share-panel"]')).toBeTruthy()
    expect(container.textContent).not.toContain('Contactar')
  })
})

// ============================================================================
// T-0038 — SALE listing CTA swap (contract.md §3, ledger §2.7 O-1/O-2)
// ============================================================================

describe('<StickyCTA> — SALE listing (no postulación)', () => {
  it('shows Contactar + Agendar visita instead of Postularme — no postulación on a sale listing', () => {
    render({ listingType: 'sale', salePrice: 500_000_000 })

    expect(container.textContent).not.toContain('Postularme')
    expect(container.textContent).toContain('Contactar')
    expect(container.textContent).toContain('Agendar visita')
  })

  it('"Agendar visita" renders unconditionally on a SALE listing — no per-agency agenda switch (O-2)', () => {
    render({ listingType: 'sale', salePrice: 500_000_000 })
    expect(container.textContent).toContain('Agendar visita')
  })

  it('shows the sale price, not the (absent) monthlyRent, and never "$0"/"$ 0" (C6)', () => {
    render({ listingType: 'sale', salePrice: 500_000_000, price: 0 })

    expect(container.textContent).toContain('500.000.000')
    expect(container.textContent).not.toContain('$ 0')
    expect(container.textContent).not.toContain('$0')
  })

  it('renders an explicit "no data" state when salePrice is null — never "$0" (C6)', () => {
    render({ listingType: 'sale', salePrice: null })

    expect(container.textContent).not.toContain('$ 0')
    expect(container.textContent).not.toContain('$0')
    expect(container.textContent.toLowerCase()).toContain('sin dato')
  })

  it('an unauthenticated visitor clicking "Contactar" is routed to sign-up (registration required, O-1)', async () => {
    render({ listingType: 'sale', salePrice: 500_000_000 })

    const contactTab = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Contactar'),
    )
    expect(contactTab).toBeTruthy()
    await act(async () => {
      contactTab!.click()
    })

    const contactCta = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.match(/iniciar sesión|registrarte|crear cuenta/i),
    )
    expect(contactCta).toBeTruthy()
  })

  it('does not build a @Public() contact surface — no chat UI appears without authentication', () => {
    render({ listingType: 'sale', salePrice: 500_000_000 })
    // No message input / send button before the visitor signs in.
    expect(container.querySelector('textarea')).toBeFalsy();
    expect(q('[data-testid="chat-message-input"]')).toBeFalsy();
  })

  // ── contract-addendum-2.md §B.2/§B.9 — the "Contactar" action, wired ──────

  it('an authenticated visitor clicking "Contactar" creates/resolves the inquiry thread and navigates to it', async () => {
    authState = { user: { role: 'tenant' }, isAuthenticated: true, hasActiveAgencyMembership: false }
    createPropertyInquiryMock.mockResolvedValueOnce({ conversationId: 'conv-new' })
    render({ listingType: 'sale', salePrice: 500_000_000 })

    const contactTab = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Contactar'),
    )
    await act(async () => {
      contactTab!.click()
    })

    const startChatBtn = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.trim() === 'Contactar' && b !== contactTab,
    )
    expect(startChatBtn).toBeTruthy()
    await act(async () => {
      startChatBtn!.click()
      await Promise.resolve()
    })

    expect(createPropertyInquiryMock).toHaveBeenCalledWith('p1')
    expect(pushMock).toHaveBeenCalledWith('/inquilino/mensajes?conversationId=conv-new')
  })

  it('surfaces an inline error instead of a silent failure when the inquiry call fails', async () => {
    authState = { user: { role: 'tenant' }, isAuthenticated: true, hasActiveAgencyMembership: false }
    createPropertyInquiryMock.mockRejectedValueOnce(new Error('boom'))
    render({ listingType: 'sale', salePrice: 500_000_000 })

    const contactTab = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Contactar'),
    )
    await act(async () => {
      contactTab!.click()
    })
    const startChatBtn = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.trim() === 'Contactar' && b !== contactTab,
    )
    await act(async () => {
      startChatBtn!.click()
      await Promise.resolve()
    })

    expect(pushMock).not.toHaveBeenCalled()
    expect(q('[role="alert"]')).toBeTruthy()
  })
})

describe('<StickyCTA> — RENT listing (regression)', () => {
  it('defaults to RENT behaviour when listingType is not passed — Postularme still renders', () => {
    render()
    expect(container.textContent).toContain('Postularme')
    expect(container.textContent).not.toContain('Contactar')
  })
})

// ============================================================================
// Compartir — Nico (2026-09-04): «el de compartir ¿qué hace? porque toast
// ninguno de los dos da».
// ============================================================================

describe('<StickyCTA> — inmueble arrendado (2026-09-15)', () => {
  it('no ofrece postularse ni agendar visita: dice que está arrendado y lleva a los disponibles', () => {
    render({ arrendado: true })
    const texto = container.textContent ?? ''
    expect(texto).toContain('Este inmueble ya está arrendado')
    expect(texto).not.toContain('Postularme')
    expect(texto).not.toContain('Agendar visita')
    expect(q('[data-testid="inmueble-arrendado"] a[href="/propiedades"]')).not.toBeNull()
  })

  it('la inmobiliaria sigue viendo su panel para compartir', () => {
    authState = { user: { role: 'agency' }, isAuthenticated: true, hasActiveAgencyMembership: true }
    render({ arrendado: true })
    expect(q('[data-testid="agency-share-panel"]')).not.toBeNull()
    expect(q('[data-testid="inmueble-arrendado"]')).toBeNull()
  })
})

describe('<StickyCTA> — quién administra el inmueble (2026-09-15)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('otra inmobiliaria encabeza la tarjeta con su logo (o sus iniciales) y su nombre', () => {
    render({ administrador: { agencyId: 'agencia-1', nombre: 'victor inmobiliaria8', logoUrl: null } })
    const logo = q('[data-testid="logo-del-administrador"]')
    expect(logo?.textContent).toBe('VI')
    expect(container.textContent).toContain('victor inmobiliaria8')
    expect(container.textContent).toContain('Administra este inmueble')
  })

  it('si la administra Leasefy, encabeza el logotipo de Leasefy', () => {
    vi.stubEnv('NEXT_PUBLIC_LEASEFY_AGENCY_ID', 'agencia-leasefy')
    render({ administrador: { agencyId: 'agencia-leasefy', nombre: 'Leasefy.co', logoUrl: null } })
    expect(q('[data-testid="logo-del-administrador"]')).toBeNull()
    expect(container.textContent).not.toContain('Administra este inmueble')
  })
})

describe('<StickyCTA> — compartir avisa lo que pasó', () => {
  /** El botón de compartir del encabezado de la tarjeta (40px). */
  const botonCompartir = () => q('[data-testid="share-copy-header"]') as HTMLButtonElement

  const clic = async (boton: HTMLButtonElement) => {
    await act(async () => {
      boton.click()
      await new Promise((r) => setTimeout(r, 0))
    })
  }

  it('sin hoja nativa copia al portapapeles Y lo dice con un toast', async () => {
    render()
    await clic(botonCompartir())

    expect(writeText).toHaveBeenCalledTimes(1)
    expect(writeText.mock.calls[0][0]).toContain('/propiedades/p1')
    // Antes el único aviso era el ícono cambiando a un tilde 2 segundos dentro
    // de un botón de 40px: nadie lo veía.
    expect(toast.success).toHaveBeenCalledTimes(1)
    expect(String(toast.success.mock.calls[0][0])).toContain('Copiamos el enlace')
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('con hoja nativa comparte por ahí y NO toca el portapapeles ni molesta con un toast', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    render()
    await clic(botonCompartir())

    expect(share).toHaveBeenCalledTimes(1)
    expect(share.mock.calls[0][0].url).toContain('/propiedades/p1')
    expect(writeText).not.toHaveBeenCalled()
    // La hoja del sistema ya fue la señal.
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('cancelar la hoja nativa NO es un error: no se dice nada', async () => {
    const abort = Object.assign(new Error('cancelado'), { name: 'AbortError' })
    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockRejectedValue(abort),
      configurable: true,
    })
    render()
    await clic(botonCompartir())

    expect(toast.error).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
    // Cancelar tampoco cae al portapapeles a espaldas del usuario.
    expect(writeText).not.toHaveBeenCalled()
  })

  it('si el portapapeles falla lo DICE en vez de comerse el error', async () => {
    writeText.mockRejectedValueOnce(new Error('NotAllowedError'))
    render()
    await clic(botonCompartir())

    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('el botón del panel de la inmobiliaria usa el MISMO camino que el del encabezado', async () => {
    authState = { user: { role: 'agency' }, isAuthenticated: true, hasActiveAgencyMembership: false }
    render()

    await clic(q('[data-testid="agency-share-copy"]') as HTMLButtonElement)
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenCalledTimes(1)
  })
})

/**
 * 02-10-2026 · Sistema de errores: contactar y agendar desde la ficha con la
 * regla de oro (conexión SÓLO sin respuesta; un 4xx dice qué está mal; un 5xx
 * dice que fue nuestro con la referencia).
 */
describe('<StickyCTA> — contactar y agendar dicen la verdad del fallo', () => {
  async function contactar() {
    authState = { user: { role: 'tenant' }, isAuthenticated: true, hasActiveAgencyMembership: false }
    render({ listingType: 'sale', salePrice: 500_000_000 })
    const pestana = [...container.querySelectorAll('button')].find((b) => b.textContent?.includes('Contactar'))
    await act(async () => {
      pestana!.click()
    })
    const boton = [...container.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Contactar' && b !== pestana,
    )
    await act(async () => {
      boton!.click()
      await Promise.resolve()
    })
    return boton!
  }

  it('🔴 un 5xx dice que fue nuestro, con la referencia, y no culpa a la conexión', async () => {
    createPropertyInquiryMock.mockRejectedValueOnce(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor.',
        referencia: 'ab12cd34',
      }),
    )
    const boton = await contactar()
    const aviso = q('#contacto-error')
    expect(aviso?.textContent).toMatch(/^No pudimos iniciar la conversación: algo falló de nuestro lado/)
    expect(aviso?.textContent).toContain('ab12cd34')
    expect(aviso?.textContent).not.toMatch(/conexi[oó]n/)
    expect(boton.getAttribute('aria-describedby')).toBe('contacto-error')
  })

  it('un 400 dice lo que mandó el back', async () => {
    createPropertyInquiryMock.mockRejectedValueOnce(
      new ApiError(400, ['Este inmueble ya no recibe mensajes.'], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: ['Este inmueble ya no recibe mensajes.'],
      }),
    )
    await contactar()
    expect(q('#contacto-error')?.textContent).toBe('Este inmueble ya no recibe mensajes.')
  })

  it('sin respuesta (la red): ahí sí se habla de la conexión', async () => {
    createPropertyInquiryMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await contactar()
    expect(q('#contacto-error')?.textContent).toMatch(/conexión/)
  })

  it('🔴 la barra del celular ya no se traga el fallo: lo dice en un toast', async () => {
    authState = { user: { role: 'tenant' }, isAuthenticated: true, hasActiveAgencyMembership: false }
    createPropertyInquiryMock.mockRejectedValueOnce(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', { statusCode: 500, referencia: 'ff00ee11' }),
    )
    act(() => {
      root.render(<MobileStickyCTA propertyId="p1" price={1500000} listingType="sale" salePrice={500_000_000} />)
    })
    const boton = [...container.querySelectorAll('button')].find((b) => b.textContent?.includes('Contactar'))
    await act(async () => {
      boton!.click()
      await Promise.resolve()
    })
    expect(pushMock).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(String(toast.error.mock.calls[0][0])).toContain('ff00ee11')
    expect(String(toast.error.mock.calls[0][0])).not.toMatch(/conexi[oó]n/)
  })

  describe('getScheduleErrorMessage', () => {
    it('🔴 el 409 dice cuál de los dos casos es, por el `code` del back', () => {
      expect(
        getScheduleErrorMessage(new ApiError(409, 'Ese horario ya no está disponible. Elige otro.', 'HORARIO_OCUPADO')),
      ).toBe('Ese horario ya no está disponible. Elige otro.')
      expect(
        getScheduleErrorMessage(
          new ApiError(409, 'Ya tienes una visita pendiente para este inmueble.', 'VISITA_YA_SOLICITADA'),
        ),
      ).toBe('Ya tienes una visita pendiente para este inmueble. Revísala en tus visitas.')
    })

    it('un 409 sin `code` (back viejo) dice los dos casos posibles', () => {
      expect(getScheduleErrorMessage(new ApiError(409, 'This time slot is no longer available'))).toMatch(
        /ya no está disponible o ya tienes una visita pendiente/,
      )
    })

    it('el 403 dice lo que mandó el back (su propio inmueble, o el tipo de cuenta)', () => {
      expect(getScheduleErrorMessage(new ApiError(403, 'No puedes pedir una visita a tu propio inmueble.'))).toBe(
        'No puedes pedir una visita a tu propio inmueble.',
      )
      expect(
        getScheduleErrorMessage(
          new ApiError(403, 'Esto es sólo para cuentas de inquilino, y la tuya es de propietario.'),
        ),
      ).toBe('Esto es sólo para cuentas de inquilino, y la tuya es de propietario.')
    })

    it('🔴 un 400 dice qué está mal (antes culpaba al «formato»)', () => {
      const e = new ApiError(400, 'Este inmueble ya está arrendado: no se pueden agendar visitas.', 'DATOS_INVALIDOS')
      expect(getScheduleErrorMessage(e)).toBe('Este inmueble ya está arrendado: no se pueden agendar visitas.')
    })

    it('🔴 un 5xx dice que fue nuestro con la referencia', () => {
      const e = new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', { referencia: 'cafe1234' })
      const texto = getScheduleErrorMessage(e)
      expect(texto).toMatch(/^No pudimos agendar la visita: algo falló de nuestro lado/)
      expect(texto).toContain('cafe1234')
    })

    it('sin respuesta habla de la conexión', () => {
      expect(getScheduleErrorMessage(new TypeError('Failed to fetch'))).toMatch(/conexión/)
    })
  })
})
