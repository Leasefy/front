/**
 * seleccionar-rol — defense-in-depth: an invited user must NEVER see the
 * personal role picker. A pending invitation token on mount → redirect to
 * /registro (the invite name/phone form + atomic join).
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
  elegirPerfilMock.mockReset()
  elegirPerfilMock.mockResolvedValue(undefined)
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
    expect(container.textContent).toContain('Soy una inmobiliaria')
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

/**
 * Lo seleccionado en el producto es azul primary. Acá había tres bloques
 * copiados y dos de ellos se marcaban en negro (`bg-ink`, `border-fg`); sólo
 * la tarjeta de inmobiliaria usaba el azul. Estos tests fijan que las tres se
 * marquen igual y que exista una salida.
 */
describe('selección de perfil', () => {
  function clickCard(testId: string) {
    const card = container.querySelector(`[data-testid="${testId}"]`) as HTMLElement
    act(() => {
      card.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    return card
  }

  it.each(['perfil-tenant', 'perfil-landlord', 'perfil-inmobiliaria'])(
    '%s se marca en azul primary, nunca en negro',
    async (testId) => {
      await render()
      const card = clickCard(testId)

      expect(card.className).toContain('border-primary')
      expect(card.className).toContain('bg-primary-soft')
      expect(card.className).not.toContain('bg-ink')
      expect(card.className).not.toContain('border-fg')
      expect(card.getAttribute('aria-checked')).toBe('true')

      // El check y el azulejo del icono también son primary.
      expect(card.innerHTML).toContain('bg-primary')
      expect(card.innerHTML).not.toContain('bg-ink')
    },
  )

  it('sólo queda una marcada a la vez', async () => {
    await render()
    clickCard('perfil-tenant')
    const inmobiliaria = clickCard('perfil-inmobiliaria')
    const inquilino = container.querySelector('[data-testid="perfil-tenant"]') as HTMLElement

    expect(inmobiliaria.getAttribute('aria-checked')).toBe('true')
    expect(inquilino.getAttribute('aria-checked')).toBe('false')
  })

  it('el botón de continuar arranca deshabilitado y se habilita al elegir', async () => {
    await render()
    const boton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.trim() === 'Continuar',
    ) as HTMLButtonElement

    expect(boton.disabled).toBe(true)
    clickCard('perfil-tenant')
    expect(boton.disabled).toBe(false)
  })

  it('se puede salir del registro desde acá', async () => {
    await render()
    expect(container.querySelector('[data-testid="salir-del-registro"]')).toBeTruthy()
  })
})

/*
 * Retomar donde lo dejó (Nico, 2026-09-07): la elección se guarda al continuar
 * y, si vuelve al selector con una elección hecha, la tarjeta arranca marcada.
 */
describe('SeleccionarRolPage — retomar donde lo dejó', () => {
  const botonContinuar = () =>
    Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.trim() === 'Continuar',
    ) as HTMLButtonElement

  const marcar = async (testId: string) => {
    const card = container.querySelector(`[data-testid="${testId}"]`) as HTMLElement
    await act(async () => {
      card.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
  }

  it('con un perfil ya elegido, su tarjeta arranca marcada y «Continuar» habilitado', async () => {
    authState.perfilElegido = 'agency'

    await render()

    const inmobiliaria = container.querySelector('[data-testid="perfil-inmobiliaria"]') as HTMLElement
    expect(inmobiliaria.getAttribute('aria-checked')).toBe('true')
    expect(botonContinuar().disabled).toBe(false)
  })

  it('si el admin apagó el perfil que había elegido, no se marca nada', async () => {
    authState.perfilElegido = 'landlord'
    perfilesState.enabled = new Set(['tenant', 'agency'])

    await render()

    expect(container.querySelector('[aria-checked="true"]')).toBeNull()
    expect(botonContinuar().disabled).toBe(true)
  })

  it('al continuar guarda el perfil elegido y va a su onboarding', async () => {
    await render()
    await marcar('perfil-inmobiliaria')

    await act(async () => {
      botonContinuar().click()
    })

    expect(elegirPerfilMock).toHaveBeenCalledWith('agency')
    expect(pushMock).toHaveBeenCalledWith('/onboarding/inmobiliaria')
  })

  it('si guardar la elección falla, igual sigue al onboarding', async () => {
    elegirPerfilMock.mockRejectedValue(new Error('sin red'))

    await render()
    await marcar('perfil-tenant')
    await act(async () => {
      botonContinuar().click()
    })

    expect(pushMock).toHaveBeenCalledWith('/onboarding/inquilino')
  })
})
