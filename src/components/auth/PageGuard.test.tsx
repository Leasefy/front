/**
 * PageGuard.test.tsx — role gate (`roles` prop) added for the agent
 * workspaces (pagos/conciliación), plus regression coverage for the
 * pre-existing module/adminOnly/bare behaviors.
 *
 * Strategy: mock usePermissions (PermissionsContext re-export) + the
 * next/navigation router; assert children mount vs the blocking spinner
 * and that denial paints the «No tienes acceso» card instead of redirecting
 * (QA 22-09: the silent redirect left people on the panel home with no reason).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}))

interface PermissionsMock {
  isAdmin: boolean
  isLoading: boolean
  agencyRole: string | null
  canAccess: (module: string, action: string) => boolean
}

const permissionsMock: PermissionsMock = {
  isAdmin: false,
  isLoading: false,
  agencyRole: null,
  canAccess: () => false,
}

vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => permissionsMock,
}))

import { PageGuard } from './PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  replaceMock.mockClear()
  permissionsMock.isAdmin = false
  permissionsMock.isLoading = false
  permissionsMock.agencyRole = null
  permissionsMock.canAccess = () => false
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

function render(props: Partial<React.ComponentProps<typeof PageGuard>> = {}) {
  act(() => {
    root.render(
      React.createElement(
        PageGuard,
        { ...props } as React.ComponentProps<typeof PageGuard>,
        React.createElement('div', { 'data-testid': 'inner' }, 'contenido'),
      ),
    )
  })
}

function innerMounted(): boolean {
  return container.querySelector('[data-testid="inner"]') !== null
}

/** La pantalla negada ahora se DICE (QA 22-09), no se redirige en silencio. */
function negada(): boolean {
  return container.querySelector('[data-testid="pantalla-negada"]') !== null
}

const ADMIN_CONTADOR = [AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]

describe('PageGuard roles gate', () => {
  it('🔴 negada por módulo: dice cuál sección, con salida al inicio, y NO redirige', () => {
    permissionsMock.agencyRole = AGENCY_ROLES.AGENTE
    render({ module: 'contabilidad' })
    expect(innerMounted()).toBe(false)
    expect(container.textContent).toContain('No tienes acceso a Contabilidad')
    expect(container.querySelector('a[href="/panel/inmobiliaria"]')).not.toBeNull()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('allows a user whose agencyRole is in roles (CONTADOR)', () => {
    permissionsMock.agencyRole = AGENCY_ROLES.CONTADOR
    render({ roles: ADMIN_CONTADOR })
    expect(innerMounted()).toBe(true)
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('allows a user whose agencyRole is in roles (agency ADMIN)', () => {
    permissionsMock.agencyRole = AGENCY_ROLES.ADMIN
    render({ roles: ADMIN_CONTADOR })
    expect(innerMounted()).toBe(true)
  })

  it('denies + redirects a user whose agencyRole is NOT in roles (AGENTE)', () => {
    permissionsMock.agencyRole = AGENCY_ROLES.AGENTE
    render({ roles: ADMIN_CONTADOR })
    expect(innerMounted()).toBe(false)
    expect(negada()).toBe(true)
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('denies a user with no agencyRole at all', () => {
    permissionsMock.agencyRole = null
    render({ roles: ADMIN_CONTADOR })
    expect(innerMounted()).toBe(false)
    expect(negada()).toBe(true)
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('isAdmin bypasses the roles gate (service-role / super-admin)', () => {
    permissionsMock.isAdmin = true
    permissionsMock.agencyRole = null
    render({ roles: ADMIN_CONTADOR })
    expect(innerMounted()).toBe(true)
  })

  it('combines with module: role in list but module denied → blocked', () => {
    permissionsMock.agencyRole = AGENCY_ROLES.CONTADOR
    permissionsMock.canAccess = () => false
    render({ roles: ADMIN_CONTADOR, module: 'cobranza' })
    expect(innerMounted()).toBe(false)
  })

  it('combines with module: role in list and module granted → allowed', () => {
    permissionsMock.agencyRole = AGENCY_ROLES.CONTADOR
    permissionsMock.canAccess = (module, action) => module === 'cobranza' && action === 'view'
    render({ roles: ADMIN_CONTADOR, module: 'cobranza' })
    expect(innerMounted()).toBe(true)
  })

  it('does not render children while permissions are loading', () => {
    permissionsMock.isLoading = true
    permissionsMock.agencyRole = AGENCY_ROLES.CONTADOR
    render({ roles: ADMIN_CONTADOR })
    expect(innerMounted()).toBe(false)
    // No redirect while loading — we don't know the verdict yet.
    expect(replaceMock).not.toHaveBeenCalled()
  })
})

describe('PageGuard pre-existing behaviors (regression)', () => {
  it('bare <PageGuard> (no module/roles/adminOnly) stays permissive', () => {
    render()
    expect(innerMounted()).toBe(true)
  })

  it('module-only gate still denies when canAccess is false', () => {
    render({ module: 'dispersiones' })
    expect(innerMounted()).toBe(false)
    expect(negada()).toBe(true)
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('module-only gate still allows when canAccess is true', () => {
    permissionsMock.canAccess = (module) => module === 'dispersiones'
    render({ module: 'dispersiones' })
    expect(innerMounted()).toBe(true)
  })

  it('adminOnly still blocks non-admins even with a matching agencyRole', () => {
    permissionsMock.agencyRole = AGENCY_ROLES.ADMIN
    render({ adminOnly: true })
    expect(innerMounted()).toBe(false)
  })

  it('adminOnly still allows isAdmin', () => {
    permissionsMock.isAdmin = true
    render({ adminOnly: true })
    expect(innerMounted()).toBe(true)
  })
})

/**
 * 🔴 Nico, 2026-09-12: «hay muchos apartamentos donde no hay señal; la persona
 * que hace el inventario debería poder agregar todo sin señal». Sin red,
 * `GET /inmobiliaria/agency/my-permissions` no vuelve y `canAccess` devuelve
 * false por no haber podido preguntar — no por una negativa. Expulsar ahí
 * sacaba a la persona de la ficha justo al llegar al apartamento.
 */
describe('PageGuard sin señal', () => {
  function sinRed(sin: boolean) {
    Object.defineProperty(window.navigator, 'onLine', {
      value: !sin,
      configurable: true,
    })
  }

  afterEach(() => {
    sinRed(false)
  })

  it('sin señal no expulsa: deja ver la pantalla', () => {
    sinRed(true)
    permissionsMock.canAccess = () => false
    render({ module: 'portafolio' })
    expect(innerMounted()).toBe(true)
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('sin señal tampoco expulsa por el rol de agencia', () => {
    sinRed(true)
    permissionsMock.agencyRole = null
    render({ roles: ADMIN_CONTADOR })
    expect(innerMounted()).toBe(true)
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('con señal sigue expulsando igual que antes', () => {
    sinRed(false)
    permissionsMock.canAccess = () => false
    render({ module: 'portafolio' })
    expect(innerMounted()).toBe(false)
    expect(negada()).toBe(true)
    expect(replaceMock).not.toHaveBeenCalled()
  })
})
