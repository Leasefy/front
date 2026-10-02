/**
 * QA 01-10-2026: «se ingresó sin haber pedido el token». El selector de perfil
 * y los onboardings de inquilino y propietario no tenían guardia de segundo
 * factor: una sesión abierta con la contraseña y sin el código entraba.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { estado, replaceMock } = vi.hoisted(() => ({
  estado: { isLoading: false, isAuthenticated: true, mfaRequired: false },
  replaceMock: vi.fn(),
}))

vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => estado }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => '/onboarding/seleccionar-rol',
}))
vi.mock('@/components/ui/carga-de-marca', () => ({
  CargaDeMarca: () => <div data-testid="cargando" />,
}))

import { SegundoFactorPendienteGuard } from './SegundoFactorPendienteGuard'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  estado.isLoading = false
  estado.isAuthenticated = true
  estado.mfaRequired = false
  window.history.replaceState(null, '', '/onboarding/seleccionar-rol?returnUrl=%2Faplicar%2F7')
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

function pintar() {
  act(() => {
    root.render(
      <SegundoFactorPendienteGuard>
        <p data-testid="pantalla">selector de perfil</p>
      </SegundoFactorPendienteGuard>,
    )
  })
}

describe('<SegundoFactorPendienteGuard>', () => {
  it('con el código pendiente no muestra la pantalla y lleva al código con el destino', () => {
    estado.mfaRequired = true
    pintar()
    expect(container.querySelector('[data-testid="pantalla"]')).toBeNull()
    expect(replaceMock).toHaveBeenCalledWith(
      `/auth/mfa-verify?returnUrl=${encodeURIComponent('/onboarding/seleccionar-rol?returnUrl=%2Faplicar%2F7')}`,
    )
  })

  it('sin nada pendiente muestra la pantalla y no navega', () => {
    pintar()
    expect(container.querySelector('[data-testid="pantalla"]')).not.toBeNull()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('sin sesión (el onboarding también se ve sin cuenta) deja pasar', () => {
    estado.isAuthenticated = false
    estado.mfaRequired = true
    pintar()
    expect(container.querySelector('[data-testid="pantalla"]')).not.toBeNull()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('mientras la sesión carga deja pasar, como siempre', () => {
    estado.isLoading = true
    estado.mfaRequired = true
    pintar()
    expect(container.querySelector('[data-testid="pantalla"]')).not.toBeNull()
    expect(replaceMock).not.toHaveBeenCalled()
  })
})
