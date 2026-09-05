/**
 * PQRS de la inmobiliaria — quién puede abrir la pantalla.
 *
 * 🔴 El sidebar (`arquitectura-del-panel.ts`, que manda) ofrece «Solicitudes»
 * a TODOS los roles de agencia (`module: null`) y el back la sirve con
 * `operaciones:view`, que AGENTE, CONTADOR y VIEWER tienen. La página estaba
 * con `PageGuard adminOnly`: el enlace existía, y al tocarlo te sacaba a
 * `/panel/inmobiliaria` sin decir una palabra. Tres gates distintos para la
 * misma pantalla, y el usuario enterándose por un rebote.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

const replaceMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => '/panel/inmobiliaria/solicitudes',
}))

// Un AGENTE: NO es admin, y tiene `operaciones` como en AGENCY_ROLE_DEFAULTS.
const permisos = {
  isAdmin: false,
  isLoading: false,
  agencyRole: 'AGENTE',
  canAccess: (modulo: string, accion: string) =>
    modulo === 'operaciones' && ['view', 'create', 'edit'].includes(accion),
}
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => permisos }))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    locale: 'es',
    t: (k: string) => k,
    formatDate: () => '1 sept 2026',
  }),
}))

const listarMock = vi.fn()
vi.mock('@/lib/api/pqrs-agencia.service', () => ({
  pqrsApi: { listar: () => listarMock() },
}))

vi.mock('@/components/inmobiliaria/pqrs/NuevaPqrsDrawer', () => ({
  NuevaPqrsDrawer: () => null,
}))
vi.mock('@/components/inmobiliaria/pqrs/PqrsDrawer', () => ({
  PqrsDrawer: () => null,
}))

import PqrsPage from './page'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  listarMock.mockResolvedValue({
    resumen: {
      total: 0,
      recibidas: 0,
      asignadas: 0,
      enProceso: 0,
      enCotizacion: 0,
      resueltas: 0,
      cerradas: 0,
    },
    solicitudes: [],
  })
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.clearAllMocks()
})

async function montar() {
  await act(async () => {
    root.render(React.createElement(PqrsPage))
  })
  await act(async () => {
    await Promise.resolve()
  })
}

describe('solicitudes — el gate de la página es el mismo que el del sidebar', () => {
  it('un AGENTE con `operaciones:view` entra, no lo rebotan', async () => {
    await montar()

    expect(replaceMock).not.toHaveBeenCalled()
    expect(container.textContent).toContain('inmobiliaria.pqrs.title')
  })

  it('sin `operaciones` sí lo saca — el gate existe, sólo que era el equivocado', async () => {
    const antes = permisos.canAccess
    permisos.canAccess = () => false
    try {
      await montar()
      expect(replaceMock).toHaveBeenCalledWith('/panel/inmobiliaria')
      expect(container.textContent).not.toContain('inmobiliaria.pqrs.title')
    } finally {
      permisos.canAccess = antes
    }
  })
})
