/**
 * ProtectedRoute — agency-panel admission with allowAgencyMembers.
 *
 * A dual-context TENANT with an ACTIVE agency membership is admitted; while the
 * membership probe is pending the gate HOLDS (spinner, no redirect); an
 * invited-only / non-member is redirected (no infinite hold); a pure-agency
 * user passes via role.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { replaceMock, refreshUserMock, authState, ruta } = vi.hoisted(() => {
  const refreshUserMock = vi.fn().mockResolvedValue(undefined)
  return {
    ruta: { actual: '/panel/inmobiliaria' },
    replaceMock: vi.fn(),
    refreshUserMock,
    authState: {
      user: null as Record<string, unknown> | null,
      isAuthenticated: true,
      isLoading: false,
      mfaRequired: false,
      mfaEnrollRequired: false,
      mfaCheckStatus: undefined as 'pending' | 'verified' | 'failed' | undefined,
      retryMfaCheck: vi.fn().mockResolvedValue(undefined),
      needsOnboarding: false,
      perfilElegido: null as string | null,
      agencyRole: null as string | null,
      hasActiveAgencyMembership: false,
      agencyMembershipChecked: true,
      refreshUser: refreshUserMock,
    },
  }
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  usePathname: () => ruta.actual,
}))

vi.mock('@/lib/auth/use-auth', () => ({
  useAuth: () => authState,
}))

import { ProtectedRoute } from './ProtectedRoute'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  localStorage.clear()
  ruta.actual = '/panel/inmobiliaria'
  replaceMock.mockClear()
  refreshUserMock.mockClear()
  authState.user = null
  authState.isAuthenticated = true
  authState.isLoading = false
  authState.mfaRequired = false
  authState.mfaEnrollRequired = false
  authState.mfaCheckStatus = undefined
  authState.needsOnboarding = false
  authState.perfilElegido = null
  authState.agencyRole = null
  authState.hasActiveAgencyMembership = false
  authState.agencyMembershipChecked = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

async function renderPanel() {
  await act(async () => {
    root.render(
      <ProtectedRoute allowedRoles={['agency']} allowAgencyMembers>
        <div data-testid="panel-child">panel</div>
      </ProtectedRoute>,
    )
  })
  // Flush the storage-check effect + the main gate effect.
  await act(async () => {
    await Promise.resolve()
  })
}

const childMounted = () => container.querySelector('[data-testid="panel-child"]') !== null

describe('ProtectedRoute — agency panel (allowAgencyMembers)', () => {
  it('admits a dual-context TENANT with an ACTIVE membership', async () => {
    authState.user = { id: 'u1', role: 'tenant', onboardingCompleted: true }
    authState.hasActiveAgencyMembership = true
    authState.agencyMembershipChecked = true

    await renderPanel()

    expect(childMounted()).toBe(true)
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('HOLDS (neutral "Verificando acceso" spinner, no redirect) while the membership probe is pending', async () => {
    authState.user = { id: 'u1', role: 'tenant', onboardingCompleted: true }
    authState.hasActiveAgencyMembership = false
    authState.agencyMembershipChecked = false // probe not settled yet

    await renderPanel()

    // Not admitted, but NOT redirected either — the gate waits.
    expect(childMounted()).toBe(false)
    expect(replaceMock).not.toHaveBeenCalled()
    // The copy must NOT lie: it's checking, not redirecting.
    expect(container.textContent).toContain('Verificando acceso...')
    expect(container.textContent).not.toContain('Redirigiendo...')
  })

  it('REDIRECTS an invited-only / non-member TENANT once the probe settled (shows redirect copy)', async () => {
    authState.user = { id: 'u1', role: 'tenant', onboardingCompleted: true }
    authState.hasActiveAgencyMembership = false
    authState.agencyMembershipChecked = true

    await renderPanel()

    expect(childMounted()).toBe(false)
    expect(replaceMock).toHaveBeenCalledWith('/inquilino')
    // Redirect is imminent → redirect copy.
    expect(container.textContent).toContain('Redirigiendo...')
    expect(container.textContent).not.toContain('Verificando acceso...')
  })

  it('admits a pure-agency user via role (membership signal irrelevant)', async () => {
    authState.user = { id: 'u2', role: 'agency', onboardingCompleted: true }
    authState.hasActiveAgencyMembership = false
    authState.agencyMembershipChecked = false

    await renderPanel()

    expect(childMounted()).toBe(true)
    expect(replaceMock).not.toHaveBeenCalled()
  })
})

/*
 * 🔴 Nico, 2026-09-11: «¿por qué me envió para inquilinos y no para
 * inmobiliaria?». Se le había caído el back. Sin `/users/me`, auth-context
 * fabrica un usuario de la sesión de Supabase con un rol que nadie confirmó
 * (`profileSource: 'session'`), y este gate lo leía como un hecho.
 */
/**
 * T-0099: `PermissionsProvider`, `useAgencySubscription`, `useInmobiliariaConfig`,
 * `useMigracionesPendientes`, `usePostulacionesPendientes` and every other
 * protected hook/provider the panel mounts live ONLY inside
 * `InmobiliariaLayout`'s `<ProtectedRoute>{children}</ProtectedRoute>`
 * (src/app/panel/inmobiliaria/layout.tsx:363-385). None of them can fire a
 * single fetch unless this gate renders `children` — so proving the gate
 * holds here is the single shared-layer guarantee for all of them, instead
 * of duplicating an `mfaRequired` check into each hook.
 */
describe('ProtectedRoute — T-0099: MFA-pending gate (session assurance level, not the URL)', () => {
  it('with mfaRequired=true on a panel route: children (and everything they mount) do NOT render, and it redirects to /auth/mfa-verify', async () => {
    authState.user = { id: 'u1', role: 'agency', onboardingCompleted: true }
    authState.mfaRequired = true

    await renderPanel()

    expect(childMounted()).toBe(false)
    expect(replaceMock).toHaveBeenCalledWith('/auth/mfa-verify')
  })

  it('once mfaRequired flips back to false (MFA_CHALLENGE_VERIFIED released it): children mount normally, no redirect', async () => {
    authState.user = { id: 'u1', role: 'agency', onboardingCompleted: true }
    authState.mfaRequired = false

    await renderPanel()

    expect(childMounted()).toBe(true)
    expect(replaceMock).not.toHaveBeenCalledWith('/auth/mfa-verify')
  })

  it('with mfaEnrollRequired=true (no factor to even step up to) FUERA del panel de la inmobiliaria: children do NOT render, redirects to /auth/mfa-enroll — takes priority over mfaRequired', async () => {
    ruta.actual = '/panel/propietario'
    authState.user = { id: 'u1', role: 'agency', onboardingCompleted: true }
    authState.mfaEnrollRequired = true
    authState.mfaRequired = false

    await renderPanel()

    expect(childMounted()).toBe(false)
    expect(replaceMock).toHaveBeenCalledWith('/auth/mfa-enroll')
    expect(replaceMock).not.toHaveBeenCalledWith('/auth/mfa-verify')
  })

  /*
   * 🔴 Nico, 30-09-2026: «¿por qué me está sacando y me lleva a esta página?
   * … todo lo de activar el 2FA debe pasar ya DENTRO, porque yo estoy es
   * dentro». En el panel de la inmobiliaria esta guarda ya no lo saca: deja
   * pasar al layout, que en vez del panel pinta la escena del 2FA dentro
   * (`SegundoFactorDentroDelPanel`) y no monta nada que pida datos.
   */
  it.each(['/panel/inmobiliaria', '/panel/inmobiliaria/contratos', '/panel/inmobiliaria/piloto'])(
    'con mfaEnrollRequired=true en %s NO redirige: lo resuelve el layout del panel, dentro',
    async (pathname) => {
      ruta.actual = pathname
      authState.user = { id: 'u1', role: 'agency', onboardingCompleted: true }
      authState.mfaEnrollRequired = true

      await renderPanel()

      expect(replaceMock).not.toHaveBeenCalled()
      expect(childMounted()).toBe(true)
      expect(container.textContent).not.toContain('Verificando seguridad')
    },
  )

  /*
   * Nico, 30-09 22:53: la página `/auth/mfa-enroll` SE QUEDA para todo lo que
   * llega desde fuera del panel de la inmobiliaria (otros roles, enlaces
   * directos, la recuperación). Lo de adentro es adicional.
   */
  it.each([
    ['/inquilino', 'tenant'],
    ['/panel/propietario', 'landlord'],
    ['/configuracion', 'agency'],
  ])('fuera del panel de la inmobiliaria (%s) sigue mandando a /auth/mfa-enroll', async (pathname, role) => {
    ruta.actual = pathname
    authState.user = { id: 'u1', role, onboardingCompleted: true }
    authState.mfaEnrollRequired = true

    await renderPanel()

    expect(childMounted()).toBe(false)
    expect(replaceMock).toHaveBeenCalledWith('/auth/mfa-enroll')
    expect(container.textContent).toContain('Verificando seguridad')
  })

  it('una ruta que sólo EMPIEZA igual (/panel/inmobiliariaX) no cuenta como el panel', async () => {
    ruta.actual = '/panel/inmobiliariaX'
    authState.user = { id: 'u1', role: 'agency', onboardingCompleted: true }
    authState.mfaEnrollRequired = true

    await renderPanel()

    expect(replaceMock).toHaveBeenCalledWith('/auth/mfa-enroll')
  })

  it('en el panel de la inmobiliaria, un factor YA inscrito se sigue verificando afuera (mfa-verify es el inicio de sesión)', async () => {
    authState.user = { id: 'u1', role: 'agency', onboardingCompleted: true }
    authState.mfaRequired = true

    await renderPanel()

    expect(childMounted()).toBe(false)
    expect(replaceMock).toHaveBeenCalledWith('/auth/mfa-verify')
  })

  it('en el panel de la inmobiliaria con mfaEnrollRequired, el rol se sigue revisando: un inquilino sin membresía sale a su portal', async () => {
    authState.user = { id: 'u1', role: 'tenant', onboardingCompleted: true }
    authState.mfaEnrollRequired = true
    authState.hasActiveAgencyMembership = false
    authState.agencyMembershipChecked = true

    await renderPanel()

    expect(childMounted()).toBe(false)
    expect(replaceMock).toHaveBeenCalledWith('/inquilino')
  })

  it('en el registro (/onboarding) NO manda a inscribir el segundo factor (Nico 30-09: «Reintentar» → «Activa tu segundo factor»)', async () => {
    ruta.actual = '/onboarding/inmobiliaria'
    authState.user = { id: 'u1', role: 'agency', onboardingCompleted: false }
    authState.mfaEnrollRequired = true

    await renderPanel()

    expect(childMounted()).toBe(true)
    expect(replaceMock).not.toHaveBeenCalledWith('/auth/mfa-enroll')
  })

  it('en el registro, un segundo factor YA inscrito se sigue verificando', async () => {
    ruta.actual = '/onboarding/inmobiliaria'
    authState.user = { id: 'u1', role: 'agency', onboardingCompleted: false }
    authState.mfaRequired = true

    await renderPanel()

    expect(childMounted()).toBe(false)
    expect(replaceMock).toHaveBeenCalledWith('/auth/mfa-verify')
  })

  it('once mfaEnrollRequired flips back to false (enrolled + verified): children mount normally, no redirect', async () => {
    authState.user = { id: 'u1', role: 'agency', onboardingCompleted: true }
    authState.mfaEnrollRequired = false
    authState.mfaRequired = false

    await renderPanel()

    expect(childMounted()).toBe(true)
    expect(replaceMock).not.toHaveBeenCalledWith('/auth/mfa-enroll')
  })
})

describe('ProtectedRoute — un perfil degradado NUNCA expulsa', () => {
  it('con el back caído se queda en el panel: no redirige al portal del inquilino', async () => {
    authState.user = { role: 'tenant', profileSource: 'session', onboardingCompleted: true }
    authState.hasActiveAgencyMembership = false
    authState.agencyMembershipChecked = true
    await renderPanel()

    expect(replaceMock).not.toHaveBeenCalled()
    expect(childMounted()).toBe(false)
    // Y dice la verdad en vez de un «Redirigiendo...» que no va a llegar.
    expect(container.textContent).toContain('No pudimos confirmar tu sesión')
    expect(container.querySelector('[data-testid="reintentar-perfil"]')).toBeTruthy()
  })

  it('«Reintentar ahora» vuelve a pedir el perfil', async () => {
    authState.user = { role: 'tenant', profileSource: 'session', onboardingCompleted: true }
    await renderPanel()

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="reintentar-perfil"]')!.click()
      await Promise.resolve()
    })
    expect(refreshUserMock).toHaveBeenCalled()
  })

  it('un perfil REAL sin permiso sí se redirige — el arreglo no abre la puerta', async () => {
    authState.user = { role: 'tenant', profileSource: 'backend', onboardingCompleted: true }
    authState.agencyMembershipChecked = true
    await renderPanel()

    expect(replaceMock).toHaveBeenCalledWith('/inquilino')
  })
})

describe('ProtectedRoute — invited NEW user (needsOnboarding)', () => {
  it('with a pending invitation token → redirects to /registro, NOT the role picker', async () => {
    // needsOnboarding ⟹ user null ⟹ isAuthenticated false (auth invariant).
    authState.user = null
    authState.isAuthenticated = false
    authState.needsOnboarding = true
    localStorage.setItem('pending-invitation-token', 'tok-123')

    await renderPanel()

    expect(replaceMock).toHaveBeenCalledWith('/registro')
    expect(replaceMock).not.toHaveBeenCalledWith('/onboarding/seleccionar-rol')
  })

  it('without a token → redirects to /onboarding/seleccionar-rol (unchanged)', async () => {
    authState.user = null
    authState.isAuthenticated = false
    authState.needsOnboarding = true
    // no pending-invitation-token

    await renderPanel()

    expect(replaceMock).toHaveBeenCalledWith('/onboarding/seleccionar-rol')
    expect(replaceMock).not.toHaveBeenCalledWith('/registro')
  })

  it('sin token pero con perfil ya elegido → retoma en el onboarding de ese perfil, no en el selector', async () => {
    authState.user = null
    authState.isAuthenticated = false
    authState.needsOnboarding = true
    authState.perfilElegido = 'agency'

    await renderPanel()

    expect(replaceMock).toHaveBeenCalledWith('/onboarding/inmobiliaria')
    expect(replaceMock).not.toHaveBeenCalledWith('/onboarding/seleccionar-rol')
  })

  it('con registro pero onboarding sin terminar y perfil elegido → el onboarding de ese perfil', async () => {
    authState.user = { role: 'tenant', onboardingCompleted: false }
    authState.isAuthenticated = true
    authState.perfilElegido = 'tenant'

    await renderPanel()

    expect(replaceMock).toHaveBeenCalledWith('/onboarding/inquilino')
  })
})

describe('ProtectedRoute — incomplete onboarding vs active agency membership', () => {
  it('active-membership TENANT with incomplete onboarding is NOT funneled to seleccionar-rol (renders the agency panel)', async () => {
    // On /panel/inmobiliaria (the mocked pathname): the effect returns without
    // redirecting (already there) and the render guard exempts them.
    authState.user = { id: 'u1', role: 'tenant', onboardingCompleted: false }
    authState.isAuthenticated = true
    authState.needsOnboarding = false
    authState.hasActiveAgencyMembership = true
    authState.agencyMembershipChecked = true

    await renderPanel()

    expect(replaceMock).not.toHaveBeenCalledWith('/onboarding/seleccionar-rol')
    expect(childMounted()).toBe(true)
  })

  it('no-membership TENANT with incomplete onboarding IS sent to seleccionar-rol (unchanged)', async () => {
    authState.user = { id: 'u2', role: 'tenant', onboardingCompleted: false }
    authState.isAuthenticated = true
    authState.needsOnboarding = false
    authState.hasActiveAgencyMembership = false
    authState.agencyMembershipChecked = true

    await renderPanel()

    expect(replaceMock).toHaveBeenCalledWith('/onboarding/seleccionar-rol')
  })

  it('pure-agency user is unaffected by the onboarding gate (isAgencyUser skip)', async () => {
    authState.user = { id: 'u3', role: 'agency', backendRole: 'AGENT', onboardingCompleted: false }
    authState.isAuthenticated = true
    authState.needsOnboarding = false
    authState.hasActiveAgencyMembership = false

    await renderPanel()

    expect(replaceMock).not.toHaveBeenCalledWith('/onboarding/seleccionar-rol')
    expect(childMounted()).toBe(true)
  })
})

/*
 * 🔴 Nico, 2026-09-12: «hay muchos apartamentos donde no hay señal; la persona
 * que hace el inventario debería poder agregar todo sin señal». Dentro del
 * apartamento `GET /users/me` tampoco vuelve, así que el perfil queda
 * degradado igual que con el back caído — pero acá «reintentando» es una
 * pared: no hay nada que reintentar hasta que vuelva la red.
 */
describe('ProtectedRoute — sin señal deja trabajar', () => {
  function sinRed(sin: boolean) {
    Object.defineProperty(window.navigator, 'onLine', {
      value: !sin,
      configurable: true,
    })
  }

  afterEach(() => {
    sinRed(false)
  })

  it('sin señal muestra la pantalla en vez del cartel de reintentar', async () => {
    sinRed(true)
    authState.user = { role: 'tenant', profileSource: 'session', onboardingCompleted: true }
    await renderPanel()

    expect(childMounted()).toBe(true)
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('con señal sigue mostrando el cartel de reintentar', async () => {
    sinRed(false)
    authState.user = { role: 'tenant', profileSource: 'session', onboardingCompleted: true }
    await renderPanel()

    expect(childMounted()).toBe(false)
    expect(container.textContent).toContain('No pudimos confirmar tu sesión')
  })

  it('sin señal NO abre la puerta a un perfil confirmado sin permiso', async () => {
    sinRed(true)
    authState.user = { role: 'tenant', profileSource: 'backend', onboardingCompleted: true }
    await renderPanel()

    expect(childMounted()).toBe(false)
    expect(replaceMock).toHaveBeenCalledWith('/inquilino')
  })
})

/*
 * 🔴 Nico, 02-10-2026: si la consulta del segundo factor no responde, NO se
 * entra al panel; se muestra «No pudimos confirmar tu sesión» con
 * «Reintentar», sin cerrar la sesión ni mandar al login.
 */
describe('ProtectedRoute — sin el veredicto del segundo factor no se entra', () => {
  it('«failed»: no monta el panel, muestra la pantalla de reintento y no redirige', async () => {
    authState.user = { id: 'u1', role: 'agency', onboardingCompleted: true }
    authState.mfaCheckStatus = 'failed'

    await renderPanel()

    expect(childMounted()).toBe(false)
    expect(container.querySelector('[data-testid="no-pudimos-confirmar-sesion"]')).not.toBeNull()
    expect(container.textContent).toContain('No pudimos confirmar tu sesión')
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('«Reintentar» vuelve a preguntar', async () => {
    authState.user = { id: 'u1', role: 'agency', onboardingCompleted: true }
    authState.mfaCheckStatus = 'failed'
    await renderPanel()
    await act(async () => {
      ;(container.querySelector('[data-testid="reintentar-confirmar-sesion"]') as HTMLButtonElement).click()
    })
    expect(authState.retryMfaCheck).toHaveBeenCalledTimes(1)
  })

  it('«pending»: tampoco monta el panel (cargador), aunque `isLoading` ya se haya soltado', async () => {
    authState.user = { id: 'u1', role: 'agency', onboardingCompleted: true }
    authState.mfaCheckStatus = 'pending'

    await renderPanel()

    expect(childMounted()).toBe(false)
    expect(container.textContent).toContain('Verificando seguridad')
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('«verified» sin código pendiente: entra normal', async () => {
    authState.user = { id: 'u1', role: 'agency', onboardingCompleted: true }
    authState.mfaCheckStatus = 'verified'

    await renderPanel()

    expect(childMounted()).toBe(true)
  })

  it('«verified» con el código pendiente: va a pedirlo', async () => {
    authState.user = { id: 'u1', role: 'agency', onboardingCompleted: true }
    authState.mfaCheckStatus = 'verified'
    authState.mfaRequired = true

    await renderPanel()

    expect(childMounted()).toBe(false)
    expect(replaceMock).toHaveBeenCalledWith('/auth/mfa-verify')
  })
})

