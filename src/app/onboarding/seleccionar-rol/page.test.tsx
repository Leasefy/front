/**
 * seleccionar-rol — defense-in-depth: an invited user must NEVER see the
 * personal role picker. A pending invitation token on mount → redirect to
 * /registro (the invite name/phone form + atomic join).
 *
 * Desde el 2026-09-30 cada tarjeta ES la acción (sin «Continuar»): «Inquilino»
 * navega y «Inmobiliaria» abre «Antes de comenzar» a la derecha.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { replaceMock, pushMock, elegirPerfilMock, authState } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  pushMock: vi.fn(),
  elegirPerfilMock: vi.fn(),
  authState: {
    user: null as Record<string, unknown> | null,
    hasActiveAgencyMembership: false,
    agencyMembershipChecked: true,
    agencyRole: null as string | null,
    perfilElegido: null as string | null,
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
}))

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => ({
    user: authState.user,
    hasActiveAgencyMembership: authState.hasActiveAgencyMembership,
    agencyMembershipChecked: authState.agencyMembershipChecked,
    agencyRole: authState.agencyRole,
    perfilElegido: authState.perfilElegido,
    elegirPerfil: elegirPerfilMock,
  }),
}))

// The picker now filters cards by admin-enabled profiles. Mock the hook to keep
// all profiles visible (fail-open default) and avoid a real config fetch.
// `perfilesState` deja simular la carga sin caché (el parpadeo de «Propietario»).
const perfilesState = { esProvisional: false, enabled: new Set(['tenant', 'landlord', 'agency']) }
vi.mock('@/lib/hooks/use-enabled-profiles', () => ({
  useEnabledProfiles: () => ({
    enabled: perfilesState.enabled,
    isEnabled: (key: string) => perfilesState.enabled.has(key),
    isLoading: perfilesState.esProvisional,
    esProvisional: perfilesState.esProvisional,
  }),
}))

/*
 * El aprovisionamiento de la inmobiliaria (`POST /users/me/onboarding`) se
 * simula: estas pruebas miran la pantalla, no el back.
 */
const { provisionMock, retryMock, aprovisionamientoState } = vi.hoisted(() => ({
  provisionMock: vi.fn(),
  retryMock: vi.fn(),
  aprovisionamientoState: {
    status: 'needs-info' as string,
    valoresGuardados: null as { razonSocial: string; nit: string } | null,
  },
}))
vi.mock('@/lib/hooks/use-onboarding-provisioning', () => ({
  useOnboardingProvisioning: () => ({
    status: aprovisionamientoState.status,
    sessionId: aprovisionamientoState.status === 'ready' ? 'sess-1' : null,
    agencyPrefill: null,
    valoresGuardados: aprovisionamientoState.valoresGuardados,
    fallo: null,
    retry: retryMock,
    provision: provisionMock,
  }),
}))

/*
 * framer-motion de paso: la salida de un `AnimatePresence` corre con rAF de
 * verdad y `act` no la espera — el panel cerrado seguiría en el DOM. Ver
 * `AuthForm.correoYContrasena.test.tsx`.
 */
vi.mock('framer-motion', async () => {
  const React = await import('react')
  const cache = new Map<string, unknown>()
  const motion = new Proxy(
    {},
    {
      get: (_objetivo, etiqueta: string) => {
        if (!cache.has(etiqueta)) {
          const Pasar = React.forwardRef<HTMLElement, Record<string, unknown>>(function Pasar(props, ref) {
            const { initial, animate, exit, transition, whileHover, whileTap, layout, ...resto } = props
            void initial
            void animate
            void exit
            void transition
            void whileHover
            void whileTap
            void layout
            return React.createElement(etiqueta, { ...resto, ref })
          })
          cache.set(etiqueta, Pasar)
        }
        return cache.get(etiqueta)
      },
    },
  )
  const Pasa = ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, null, children)
  return { motion, AnimatePresence: Pasa, LayoutGroup: Pasa, MotionConfig: Pasa, useReducedMotion: () => true }
})

/*
 * Las dos fuentes del veredicto del registro (`registro-de-la-inmobiliaria.ts`):
 * el punto de retorno del back y el paso del micro.
 */
const { getOnboardingResumePoint, resumeOnboarding } = vi.hoisted(() => ({
  getOnboardingResumePoint: vi.fn(),
  resumeOnboarding: vi.fn(),
}))
vi.mock('@/lib/api/onboarding-provisioning.service', async (original) => ({
  ...(await original<typeof import('@/lib/api/onboarding-provisioning.service')>()),
  getOnboardingResumePoint,
}))
vi.mock('@/lib/api/onboarding-session.service', async (original) => ({
  ...(await original<typeof import('@/lib/api/onboarding-session.service')>()),
  resumeOnboarding,
}))

import SeleccionarRolPage from './page'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  localStorage.clear()
  replaceMock.mockClear()
  perfilesState.esProvisional = false
  perfilesState.enabled = new Set(['tenant', 'landlord', 'agency'])
  authState.user = null
  authState.hasActiveAgencyMembership = false
  authState.agencyMembershipChecked = true
  authState.agencyRole = null
  authState.perfilElegido = null
  pushMock.mockClear()
  provisionMock.mockReset()
  retryMock.mockReset()
  aprovisionamientoState.status = 'needs-info'
  aprovisionamientoState.valoresGuardados = null
  elegirPerfilMock.mockReset()
  elegirPerfilMock.mockResolvedValue(undefined)
  getOnboardingResumePoint.mockReset()
  resumeOnboarding.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function render() {
  await act(async () => {
    root.render(<SeleccionarRolPage />)
  })
}

describe('SeleccionarRolPage — invitation guard', () => {
  it('redirects to /registro when a pending invitation token is present (picker never shown)', async () => {
    localStorage.setItem('pending-invitation-token', 'tok-123')

    await render()

    expect(replaceMock).toHaveBeenCalledWith('/registro')
    // The role picker must not render.
    expect(container.textContent).not.toContain('Inquilino')
    expect(container.textContent).not.toContain('Propietario')
  })

  it('renders the picker normally when there is no pending token', async () => {
    await render()

    expect(replaceMock).not.toHaveBeenCalledWith('/registro')
    expect(container.textContent).toContain('Inquilino')
  })

  // Desde el 2026-08-31 el Piloto automático es el inicio de TODO miembro
  // (`AGENCY_HOME_ROUTE` en role-routes.ts): este test quedó sin actualizar
  // en `feature/cambios-nico` y se alineó al mezclar esa rama.
  it('redirects an ACTIVE agency member to the agency panel (never the picker)', async () => {
    authState.hasActiveAgencyMembership = true

    await render()

    expect(replaceMock).toHaveBeenCalledWith('/panel/inmobiliaria/piloto')
    expect(container.textContent).not.toContain('Propietario')
  })

  it('un CONTADOR también aterriza en el Piloto: ya no hay ruta por sub-rol', async () => {
    authState.hasActiveAgencyMembership = true
    authState.agencyRole = 'CONTADOR'

    await render()

    expect(replaceMock).toHaveBeenCalledWith('/panel/inmobiliaria/piloto')
    expect(container.textContent).not.toContain('Propietario')
  })

  it('waits (no picker, no redirect) while the agency-membership probe is unsettled for a logged-in user', async () => {
    // A freshly-authenticated user (e.g. an invited CONTADOR) whose membership
    // probe has not resolved yet must NOT flash the personal role picker.
    authState.user = { name: 'Ana', onboardingCompleted: false }
    authState.agencyMembershipChecked = false

    await render()

    expect(replaceMock).not.toHaveBeenCalled()
    expect(container.textContent).not.toContain('Inquilino')
    expect(container.textContent).not.toContain('Propietario')
  })
})


/**
 * 🔴 Nico, 01-10-2026: «luego de crear la cuenta, entramos desde un correo,
 * nos llevó al seleccionar rol y nos llevó luego de un rato a esta pantalla,
 * literal ingresó a la plataforma». La agencia y la membresía ADMIN nacen en
 * «Antes de comenzar», antes del asistente: membresía activa no es registro
 * terminado.
 */
describe('SeleccionarRolPage — el dueño con el registro a medias va al asistente, nunca al panel', () => {
  function punto(sobre: Record<string, unknown>) {
    return {
      agentSessionId: null,
      tenantId: 'ag-1',
      provisioningStatus: 'ACTIVE',
      legalName: 'Periquito company LTDA',
      nit: '900',
      onboardingCompleted: true,
      ...sobre,
    }
  }

  async function renderYResolver() {
    await act(async () => {
      root.render(<SeleccionarRolPage />)
      await new Promise((r) => setTimeout(r, 0))
    })
  }

  beforeEach(() => {
    authState.user = { id: 'u1', name: 'Nico', onboardingCompleted: true, role: 'agency' }
    authState.hasActiveAgencyMembership = true
    authState.agencyRole = 'ADMIN'
  })

  it.each([
    ['FAILED sin sesión (la captura: el back no alcanzó el micro)', { provisioningStatus: 'FAILED' }],
    ['PENDING sin sesión', { provisioningStatus: 'PENDING' }],
    ['ACTIVE sin sesión', { provisioningStatus: 'ACTIVE' }],
  ])('%s → /onboarding/inmobiliaria', async (_caso, sobre) => {
    getOnboardingResumePoint.mockResolvedValue(punto(sobre))

    await renderYResolver()

    expect(replaceMock).toHaveBeenCalledWith('/onboarding/inmobiliaria')
    expect(replaceMock).not.toHaveBeenCalledWith('/panel/inmobiliaria/piloto')
  })

  it('con la sesión del asistente en «Miembros» → /onboarding/inmobiliaria', async () => {
    getOnboardingResumePoint.mockResolvedValue(punto({ agentSessionId: 'ses-1' }))
    resumeOnboarding.mockResolvedValue({ sessionId: 'ses-1', currentStep: 'members', nextStep: 'habeas_data', draft: {} })

    await renderYResolver()

    expect(replaceMock).toHaveBeenCalledWith('/onboarding/inmobiliaria')
    expect(replaceMock).not.toHaveBeenCalledWith('/panel/inmobiliaria/piloto')
  })

  it('mientras pregunta: cargador, ni tarjetas ni panel', async () => {
    getOnboardingResumePoint.mockReturnValue(new Promise(() => {}))

    await renderYResolver()

    expect(replaceMock).not.toHaveBeenCalled()
    expect(container.textContent).not.toContain('Inquilino')
  })

  it('un invitado con membresía ACTIVA (su agencia terminó el registro) sigue yendo a su panel', async () => {
    authState.agencyRole = 'AGENTE'
    getOnboardingResumePoint.mockResolvedValue(punto({ agentSessionId: 'ses-dueno' }))
    resumeOnboarding.mockResolvedValue({ sessionId: 'ses-dueno', currentStep: 'complete', nextStep: null, draft: {} })

    await renderYResolver()

    expect(replaceMock).toHaveBeenCalledWith('/panel/inmobiliaria/piloto')
    expect(replaceMock).not.toHaveBeenCalledWith('/onboarding/inmobiliaria')
  })

  it('si no se puede preguntar (back caído) es fail-open: al panel, cuyo candado vuelve a preguntar', async () => {
    getOnboardingResumePoint.mockRejectedValue(new Error('sin red'))

    await renderYResolver()

    expect(replaceMock).toHaveBeenCalledWith('/panel/inmobiliaria/piloto')
  })
})

/**
 * «Propietario» está apagado desde el admin y aun así se alcanzó a ver un
 * instante (Nico, 2026-09-07): el hook arranca con todos los perfiles y la
 * pantalla los pintaba mientras llegaba la respuesta.
 */
describe('SeleccionarRolPage — mientras se sabe qué perfiles dejó el admin', () => {
  it('sin respuesta ni caché no pinta ninguna tarjeta: ni la apagada ni las otras', async () => {
    perfilesState.esProvisional = true

    await render()

    expect(container.querySelector('[data-testid="perfiles-cargando"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="perfil-landlord"]')).toBeNull()
    expect(container.textContent).not.toContain('Propietario')
    expect(container.textContent).not.toContain('Inquilino')
  })

  it('cuando llega la respuesta pinta sólo lo que quedó encendido', async () => {
    perfilesState.esProvisional = true
    await render()

    perfilesState.esProvisional = false
    perfilesState.enabled = new Set(['tenant', 'agency'])
    await act(async () => {
      root.render(<SeleccionarRolPage />)
    })

    expect(container.querySelector('[data-testid="perfiles-cargando"]')).toBeNull()
    expect(container.textContent).toContain('Inquilino')
    expect(container.textContent).toContain('Inmobiliaria')
    expect(container.textContent).not.toContain('Propietario')
  })

  it('si la config no responde, a los 2,5 s pinta todas igual (nunca bloquea el registro)', async () => {
    vi.useFakeTimers()
    try {
      perfilesState.esProvisional = true
      await render()
      expect(container.querySelector('[data-testid="perfiles-cargando"]')).not.toBeNull()

      await act(async () => {
        vi.advanceTimersByTime(2600)
      })

      expect(container.querySelector('[data-testid="perfiles-cargando"]')).toBeNull()
      expect(container.textContent).toContain('Inquilino')
      expect(container.textContent).toContain('Propietario')
    } finally {
      vi.useRealTimers()
    }
  })
})


/*
 * Sin «Continuar» (Nico, 2026-09-30): «solo las dos cards, la que seleccione
 * el usuario pasa a lo siguiente». Cada tarjeta es un botón nativo que hace lo
 * que hacía «Continuar» con ese perfil.
 */
describe('la tarjeta es la acción', () => {
  const tarjeta = (valor: string) =>
    container.querySelector(`[data-testid="perfil-${valor}"]`) as HTMLButtonElement

  const tocar = async (el: HTMLElement) => {
    await act(async () => {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
  }

  it('ya no hay botón «Continuar»', async () => {
    await render()
    const continuar = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Continuar',
    )
    expect(continuar).toBeUndefined()
  })

  it('el título sigue el patrón de la casa: peso medio, nunca negrita', async () => {
    await render()
    const h1 = container.querySelector('h1') as HTMLElement
    expect(h1.textContent).toBe('¿Cómo vas a usar Leasefy?')
    expect(h1.className).toContain('font-medium')
    expect(h1.className).not.toMatch(/font-(bold|semibold|extrabold)/)
  })

  it('la línea de apoyo saluda por el nombre cuando lo hay', async () => {
    authState.user = { name: 'Ana María Pérez', onboardingCompleted: false }
    await render()
    expect(container.textContent).toContain('Hola, Ana. Elige tu perfil para empezar.')
  })

  it('sin nombre no repite «Leasefy» debajo del titular que ya lo dice', async () => {
    await render()
    expect(container.textContent).toContain('Elige tu perfil para empezar.')
    expect(container.textContent).not.toContain('Te damos la bienvenida')
  })

  it('«Inquilino» guarda el perfil y va a su onboarding', async () => {
    await render()
    await tocar(tarjeta('tenant'))

    expect(elegirPerfilMock).toHaveBeenCalledWith('tenant')
    expect(pushMock).toHaveBeenCalledWith('/onboarding/inquilino')
  })

  it('se elige con el teclado: botón nativo, con foco, y Enter/Espacio lo activan', async () => {
    await render()
    const inquilino = tarjeta('tenant')

    // Lo que garantiza Enter y Espacio en el navegador: un <button> de verdad,
    // habilitado y dentro del orden de tabulación.
    expect(inquilino.tagName).toBe('BUTTON')
    expect(inquilino.type).toBe('button')
    expect(inquilino.disabled).toBe(false)
    expect(inquilino.tabIndex).toBeGreaterThanOrEqual(0)

    act(() => inquilino.focus())
    expect(document.activeElement).toBe(inquilino)

    // Enter/Espacio sobre un botón con foco = el `click` que despacha el navegador.
    await act(async () => {
      inquilino.click()
    })
    expect(pushMock).toHaveBeenCalledWith('/onboarding/inquilino')
  })

  it('un segundo toque no vuelve a enviar: las tarjetas quedan quietas mientras se va', async () => {
    await render()
    await tocar(tarjeta('tenant'))
    await tocar(tarjeta('tenant'))
    await tocar(tarjeta('inmobiliaria'))

    expect(pushMock).toHaveBeenCalledTimes(1)
    expect(elegirPerfilMock).toHaveBeenCalledTimes(1)
    expect(tarjeta('tenant').disabled).toBe(true)
    expect(tarjeta('tenant').getAttribute('aria-busy')).toBe('true')
    expect(tarjeta('inmobiliaria').disabled).toBe(true)
    expect(container.querySelector('[data-testid="panel-antes-de-comenzar"]')).toBeNull()
  })

  it('si guardar la elección falla, igual sigue al onboarding (nunca retiene a nadie)', async () => {
    elegirPerfilMock.mockRejectedValue(new Error('sin red'))
    await render()
    await tocar(tarjeta('tenant'))

    expect(pushMock).toHaveBeenCalledWith('/onboarding/inquilino')
  })

  it('«Propietario», si el admin lo deja prendido, va a su onboarding', async () => {
    await render()
    await tocar(tarjeta('landlord'))

    expect(elegirPerfilMock).toHaveBeenCalledWith('landlord')
    expect(pushMock).toHaveBeenCalledWith('/onboarding/propietario')
  })
})

/*
 * «Soy una inmobiliaria» no se va de la página: las tarjetas se corren a la
 * izquierda deshabilitadas y a la derecha se abre «Antes de comenzar».
 */
describe('«Inmobiliaria» abre «Antes de comenzar» al lado', () => {
  const tarjeta = (valor: string) =>
    container.querySelector(`[data-testid="perfil-${valor}"]`) as HTMLButtonElement
  const panel = () => container.querySelector('[data-testid="panel-antes-de-comenzar"]')
  const porId = (id: string) => container.querySelector(`[id="${id}"]`) as HTMLInputElement

  const tocar = async (el: HTMLElement) => {
    await act(async () => {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
  }

  function escribir(input: HTMLInputElement, valor: string) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    act(() => {
      setter?.call(input, valor)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }

  const enviar = () => {
    const form = container.querySelector('[data-testid="owner-name-step-form"]') as HTMLFormElement
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
  }

  it('abre el formulario, deshabilita las tarjetas y marca la elegida', async () => {
    await render()
    await tocar(tarjeta('inmobiliaria'))

    expect(panel()).not.toBeNull()
    expect(container.querySelector('[data-testid="owner-name-step-form"]')).not.toBeNull()
    expect(tarjeta('inmobiliaria').disabled).toBe(true)
    expect(tarjeta('tenant').disabled).toBe(true)
    expect(tarjeta('inmobiliaria').getAttribute('data-elegida')).toBe('true')
    expect(tarjeta('tenant').getAttribute('data-elegida')).toBeNull()
    // La elegida se marca en azul primary, con su check.
    expect(tarjeta('inmobiliaria').className).toContain('ring-primary')
    expect(tarjeta('inmobiliaria').querySelector('[data-testid="perfil-elegido"]')).not.toBeNull()
    // Se guarda la elección; no se navega a ningún lado.
    expect(elegirPerfilMock).toHaveBeenCalledWith('agency')
    expect(pushMock).not.toHaveBeenCalled()
    // La bienvenida se va para dejarle el sitio al formulario: un solo h1.
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(container.querySelector('h1')?.textContent).toBe('Antes de comenzar')
  })

  it('con el teclado: al abrir, el foco va al primer campo; al cerrar, vuelve a la tarjeta', async () => {
    await render()
    act(() => tarjeta('inmobiliaria').focus())
    await act(async () => {
      tarjeta('inmobiliaria').click()
    })

    expect(document.activeElement).toBe(porId('ownerFullName'))

    const cerrar = container.querySelector('[data-testid="cerrar-antes-de-comenzar"]') as HTMLButtonElement
    expect(cerrar.getAttribute('aria-label')).toMatch(/^Cerrar/)
    await tocar(cerrar)

    expect(panel()).toBeNull()
    expect(document.activeElement).toBe(tarjeta('inmobiliaria'))
  })

  it('cerrar devuelve las tarjetas habilitadas y se puede elegir «Inquilino»', async () => {
    await render()
    await tocar(tarjeta('inmobiliaria'))
    await tocar(container.querySelector('[data-testid="cerrar-antes-de-comenzar"]') as HTMLElement)

    expect(panel()).toBeNull()
    expect(tarjeta('inmobiliaria').disabled).toBe(false)
    expect(tarjeta('tenant').disabled).toBe(false)
    expect(container.querySelector('h1')?.textContent).toBe('¿Cómo vas a usar Leasefy?')

    await tocar(tarjeta('tenant'))
    expect(elegirPerfilMock).toHaveBeenLastCalledWith('tenant')
    expect(pushMock).toHaveBeenCalledWith('/onboarding/inquilino')
  })

  it('en el celular, «Cambiar» de la cabecera compacta también cierra', async () => {
    await render()
    await tocar(tarjeta('inmobiliaria'))
    await tocar(container.querySelector('[data-testid="cambiar-de-perfil"]') as HTMLElement)

    expect(panel()).toBeNull()
    expect(tarjeta('tenant').disabled).toBe(false)
  })

  it('el «Continuar» del formulario hace lo de siempre: crea la inmobiliaria con lo escrito', async () => {
    await render()
    await tocar(tarjeta('inmobiliaria'))

    escribir(porId('ownerFullName'), 'Ana María Pérez')
    escribir(porId('agencyName'), 'Inmobiliaria Andes SAS')
    escribir(porId('agencyNit'), '890903938')
    enviar()

    expect(provisionMock).toHaveBeenCalledTimes(1)
    expect(provisionMock).toHaveBeenCalledWith({
      firstName: 'Ana',
      lastName: 'María Pérez',
      agencyName: 'Inmobiliaria Andes SAS',
      nit: '890903938-8',
      legalRepresentative: 'Ana María Pérez',
    })
  })

  it('mientras se crea no hay doble envío ni forma de cambiar de perfil', async () => {
    aprovisionamientoState.status = 'provisioning'
    await render()
    await tocar(tarjeta('inmobiliaria'))

    const boton = container.querySelector('[data-testid="owner-name-step-form"] button[type="submit"]') as HTMLButtonElement
    expect(boton.disabled).toBe(true)
    escribir(porId('ownerFullName'), 'Ana María Pérez')
    escribir(porId('agencyName'), 'Inmobiliaria Andes SAS')
    escribir(porId('agencyNit'), '890903938')
    enviar()
    expect(provisionMock).not.toHaveBeenCalled()

    expect(container.querySelector('[data-testid="cerrar-antes-de-comenzar"]')).toBeNull()
    expect(container.querySelector('[data-testid="cambiar-de-perfil"]')).toBeNull()
  })

  // Nico, 01-10-2026: «¿cómo se devuelve entonces para ver de nuevo los dos
  // activos?». La ✕ está siempre; con la inmobiliaria a medias, elegir otro
  // perfil pregunta antes de dejarla de lado (ver `EleccionDePerfil`).
  it('con la inmobiliaria ya creada la ✕ sigue: se puede volver a las tarjetas', async () => {
    aprovisionamientoState.valoresGuardados = { razonSocial: 'Inmobiliaria Andes SAS', nit: '890903938-8' }
    await render()
    await tocar(tarjeta('inmobiliaria'))

    expect(porId('agencyName').value).toBe('Inmobiliaria Andes SAS')
    expect(container.querySelector('[data-testid="cerrar-antes-de-comenzar"]')).not.toBeNull()
  })

  it('cuando la sesión del asistente está lista sigue al mismo paso de siempre', async () => {
    aprovisionamientoState.status = 'ready'
    await render()
    await tocar(tarjeta('inmobiliaria'))

    expect(pushMock).toHaveBeenCalledWith('/onboarding/inmobiliaria')
  })
})
