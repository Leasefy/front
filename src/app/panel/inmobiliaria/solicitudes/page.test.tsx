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
// La URL de la pantalla. Se llega acá desde la sección PQRS de un contrato con
// `?pqrs=<id>&volver=<ficha>`: el test la cambia para probar ese camino.
let query = ''
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => '/panel/inmobiliaria/solicitudes',
  useSearchParams: () => new URLSearchParams(query),
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
// El cajón del detalle: el test sólo necesita saber QUÉ solicitud se abrió.
vi.mock('@/components/inmobiliaria/pqrs/PqrsDrawer', () => ({
  PqrsDrawer: ({ pqrs }: { pqrs: { radicado: string } | null }) =>
    pqrs ? React.createElement('p', null, `cajon:${pqrs.radicado}`) : null,
}))

import PqrsPage from './page'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  query = ''
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

/**
 * El enlace que trae la sección PQRS de la ficha del contrato (Nico,
 * 2026-09-12). Sin esto, «Ver la solicitud» dejaba a la persona buscando la
 * fila a mano en la tabla de toda la agencia, y sin camino de vuelta.
 */
describe('solicitudes — se llega desde la ficha de un contrato', () => {
  const UNA: Record<string, unknown> = {
    id: 'p-1',
    numero: 7,
    radicado: 'PQRS-0007',
    tipo: 'QUEJA',
    solicitanteTipo: 'INQUILINO',
    solicitanteNombre: 'Camila',
    solicitanteContacto: null,
    asunto: 'Fuga en el baño',
    descripcion: null,
    consignacionId: 'c-1',
    inmuebleLabel: 'Apto 402',
    asignadoAUserId: null,
    asignadoANombre: null,
    estado: 'EN_PROCESO',
    slaVenceAt: '2026-03-20T10:00:00.000Z',
    resueltaAt: null,
    cerradaAt: null,
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
  }

  it('`?pqrs=` abre ESA solicitud y `?volver=` ofrece la vuelta al contrato', async () => {
    listarMock.mockResolvedValue({
      resumen: {
        total: 1,
        recibidas: 0,
        asignadas: 0,
        enProceso: 1,
        enCotizacion: 0,
        resueltas: 0,
        cerradas: 0,
      },
      solicitudes: [UNA],
    })
    query = 'pqrs=p-1&volver=%2Fpanel%2Finmobiliaria%2Fcontratos%2Fk-1'
    await montar()

    expect(container.textContent).toContain('cajon:PQRS-0007')
    const volver = container.querySelector('[data-testid="pqrs-volver"]')
    expect(volver?.getAttribute('href')).toBe('/panel/inmobiliaria/contratos/k-1')
    expect(volver?.textContent).toContain('Volver al contrato')
  })

  it('un `volver` que sale del panel no se ofrece: sería un open redirect', async () => {
    query = 'volver=https%3A%2F%2Fmalo.co'
    await montar()

    expect(container.querySelector('[data-testid="pqrs-volver"]')).toBeNull()
  })

  it('sin `?pqrs=` no se abre ningún cajón solo', async () => {
    listarMock.mockResolvedValue({
      resumen: {
        total: 1,
        recibidas: 0,
        asignadas: 0,
        enProceso: 1,
        enCotizacion: 0,
        resueltas: 0,
        cerradas: 0,
      },
      solicitudes: [UNA],
    })
    await montar()

    expect(container.textContent).not.toContain('cajon:')
  })
})
