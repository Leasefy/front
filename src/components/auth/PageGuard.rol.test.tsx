/**
 * PageGuard.rol.test.tsx — IA95-41 (QA-IA-95, 05-10-2026) e IA95-34.
 *
 * IA95-41: cuando el módulo PASA y lo que falla es el ROL, el cartel no puede
 * decir «No tienes acceso a Cobros. Tu rol no incluye Cobros»: la persona sí
 * tiene Cobros. Dice quiénes usan la pantalla.
 *
 * IA95-34 (Nico, 05-10-2026, «Dejarlo conciliar»): el auxiliar de cartera entra
 * a Conciliación con `ROLES_QUE_CONCILIAN`.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}))

const permisos = {
  isAdmin: false,
  isLoading: false,
  agencyRole: null as string | null,
  canAccess: (_m: string, _a: string) => false,
}

vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => permisos,
}))

import { PageGuard } from './PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { ROLES_QUE_CONCILIAN } from '@/lib/nav/el-auxiliar-de-cartera-no-ve-los-bancos'
import { rolesEnPalabras } from '@/lib/errores/clasificar'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  permisos.isAdmin = false
  permisos.isLoading = false
  permisos.agencyRole = null
  permisos.canAccess = () => false
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function pintar(props: Partial<React.ComponentProps<typeof PageGuard>>) {
  act(() => {
    root.render(
      React.createElement(
        PageGuard,
        props as React.ComponentProps<typeof PageGuard>,
        React.createElement('div', { 'data-testid': 'adentro' }, 'contenido'),
      ),
    )
  })
}

const adentro = () => container.querySelector('[data-testid="adentro"]') !== null

describe('IA95-41: el cartel dice lo que de verdad falla', () => {
  it('con Cobros y un rol que no está: no dice «tu rol no incluye Cobros», dice quiénes la usan', () => {
    permisos.agencyRole = AGENCY_ROLES.AGENTE
    permisos.canAccess = (m) => m === 'cobros'
    pintar({ module: 'cobros', action: 'view', roles: [AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR] })
    expect(adentro()).toBe(false)
    const texto = container.textContent ?? ''
    expect(texto).not.toContain('No tienes acceso a Cobros')
    expect(texto).not.toContain('no incluye Cobros')
    expect(texto).toContain('No tienes acceso a esta pantalla')
    expect(texto).toContain('Esta pantalla la usan el administrador y el contador')
    expect(container.querySelector('a[href="/panel/inmobiliaria"]')).not.toBeNull()
  })

  it('con la sección nombrada, el título la nombra', () => {
    permisos.agencyRole = AGENCY_ROLES.AGENTE
    pintar({ roles: [AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR], seccion: 'Facturación' })
    expect(container.textContent).toContain('No tienes acceso a Facturación')
    expect(container.textContent).toContain('la usan el administrador y el contador')
  })

  it('si lo que falla es el MÓDULO, sigue diciendo el módulo (como antes)', () => {
    permisos.agencyRole = AGENCY_ROLES.CONTADOR
    permisos.canAccess = () => false
    pintar({ module: 'cobros', action: 'view', roles: [AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR] })
    expect(container.textContent).toContain('No tienes acceso a Cobros')
  })

  it('rolesEnPalabras: uno, dos, tres y desconocidos', () => {
    expect(rolesEnPalabras('ADMIN')).toBe('el administrador')
    expect(rolesEnPalabras('ADMIN,CONTADOR')).toBe('el administrador y el contador')
    expect(rolesEnPalabras('ADMIN,CONTADOR,AUXILIAR_CARTERA')).toBe('el administrador, el contador y el auxiliar de cartera')
    expect(rolesEnPalabras('')).toBeNull()
    expect(rolesEnPalabras('OTRO')).toBeNull()
  })
})

describe('IA95-34: Conciliación abre para el auxiliar de cartera', () => {
  it('el auxiliar de cartera con Cobros entra a la pantalla de Conciliación', () => {
    permisos.agencyRole = AGENCY_ROLES.AUXILIAR_CARTERA
    permisos.canAccess = (m, a) => m === 'cobros' && (a === 'view' || a === 'create')
    pintar({ module: 'cobros', action: 'view', roles: [...ROLES_QUE_CONCILIAN] })
    expect(adentro()).toBe(true)
  })

  it('la asesora sigue sin entrar, y el cartel dice quiénes la usan', () => {
    permisos.agencyRole = AGENCY_ROLES.AGENTE
    permisos.canAccess = () => true
    pintar({ roles: [...ROLES_QUE_CONCILIAN] })
    expect(adentro()).toBe(false)
    expect(container.textContent).toContain('el administrador, el contador y el auxiliar de cartera')
  })
})
