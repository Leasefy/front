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
import { filtrarPqrs, FILTROS_DE_PQRS_VACIOS } from './filtrar-pqrs'
import type { Pqrs } from '@/lib/api/pqrs-agencia.types'
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
  // Además de QUÉ solicitud se abrió, deja disparar `onActualizado` como lo
  // haría el cajón al mover de estado: eso relanza el refresco de fondo.
  PqrsDrawer: ({
    pqrs,
    onActualizado,
  }: {
    pqrs: { radicado: string } | null
    onActualizado?: (p: unknown) => void
  }) =>
    pqrs
      ? React.createElement(
          React.Fragment,
          null,
          React.createElement('p', null, `cajon:${pqrs.radicado}`),
          React.createElement(
            'button',
            { 'data-testid': 'cajon-actualizar', onClick: () => onActualizado?.(pqrs) },
            'mover',
          ),
        )
      : null,
}))

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import PqrsPage from './page'
import { toast } from '@/components/ui/toast'
import { ApiError } from '@/lib/api/client'

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

describe('solicitudes — el resumen no afirma ceros que no sabe (S1 · S2 · S3)', () => {
  const OTRA: Record<string, unknown> = {
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
  const RESUMEN = {
    total: 1,
    recibidas: 0,
    asignadas: 0,
    enProceso: 1,
    enCotizacion: 0,
    resueltas: 0,
    cerradas: 0,
  }
  const grilla = () => container.querySelector('.lg\\:grid-cols-6')

  it('🔴 con la lista caída, las seis tarjetas dicen «—» y «No se pudo traer», no 0', async () => {
    listarMock.mockRejectedValue(new ApiError(500, 'Internal server error'))
    await montar()

    expect(container.querySelector('[data-testid="fallo-de-carga"]')).not.toBeNull()
    const valores = Array.from(container.querySelectorAll('[data-testid="pqrs-resumen-valor"]'))
    expect(valores).toHaveLength(6)
    for (const v of valores) expect(v.textContent).toBe('—')
    expect(grilla()!.textContent).toContain('No se pudo traer')
    expect(grilla()!.textContent).not.toMatch(/\d/)
  })

  it('🔴 mientras carga no hay números en el resumen: esqueleto, no ceros', async () => {
    listarMock.mockReturnValue(new Promise(() => undefined))
    await montar()

    expect(grilla()).not.toBeNull()
    expect(grilla()!.textContent).not.toMatch(/\d/)
    expect(container.querySelectorAll('[data-testid="pqrs-resumen-valor"]')).toHaveLength(0)
  })

  it('con la lista bien, el resumen muestra sus números', async () => {
    listarMock.mockResolvedValue({ resumen: RESUMEN, solicitudes: [OTRA] })
    await montar()

    const valores = Array.from(container.querySelectorAll('[data-testid="pqrs-resumen-valor"]')).map(
      (v) => v.textContent,
    )
    expect(valores).toContain('1')
    expect(grilla()!.textContent).not.toContain('No se pudo traer')
  })

  it('🔴 un `?pqrs=` que no está en la lista lo dice («no encontramos esa solicitud»), no se calla', async () => {
    query = 'pqrs=p-que-no-esta'
    listarMock.mockResolvedValue({ resumen: RESUMEN, solicitudes: [OTRA] })
    await montar()

    const fallo = container.querySelector('[data-testid="fallo-de-carga"]')
    expect(fallo).not.toBeNull()
    expect(fallo!.getAttribute('data-tipo')).toBe('noExiste')
    expect(fallo!.textContent).toContain('esa solicitud')
    // Reintentar sobre algo que no existe sería mentir.
    expect(fallo!.querySelector('[data-testid="reintentar"]')).toBeNull()
  })

  it('un `?pqrs=` que SÍ está abre el cajón y no muestra ningún fallo', async () => {
    query = 'pqrs=p-1'
    listarMock.mockResolvedValue({ resumen: RESUMEN, solicitudes: [OTRA] })
    await montar()

    expect(container.textContent).toContain('cajon:PQRS-0007')
    expect(container.querySelector('[data-testid="fallo-de-carga"]')).toBeNull()
  })

  it('🔴 si el refresco de fondo falla después de mover una solicitud, avisa con un toast', async () => {
    query = 'pqrs=p-1'
    listarMock
      .mockResolvedValueOnce({ resumen: RESUMEN, solicitudes: [OTRA] })
      .mockRejectedValueOnce(new ApiError(500, 'Internal server error'))
    await montar()

    const mover = container.querySelector<HTMLButtonElement>('[data-testid="cajon-actualizar"]')
    expect(mover).not.toBeNull()
    await act(async () => {
      mover!.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(toast.error).toHaveBeenCalledWith(
      'No se pudo actualizar el resumen',
      expect.objectContaining({ description: expect.any(String) }),
    )
  })
})

/**
 * S4 de la auditoría del 13-09: era la única lista del panel sin buscador ni
 * filtro, y `listar()` trae TODAS las solicitudes de la agencia.
 */
describe('filtrarPqrs', () => {
  const fila = (p: Partial<Pqrs> & { id: string }) =>
    ({
      numero: 1,
      radicado: 'PQRS-0001',
      tipo: 'RECLAMO',
      solicitanteTipo: 'INQUILINO',
      solicitanteNombre: 'Camila Restrepo',
      solicitanteContacto: null,
      asunto: 'Gotera en el baño',
      descripcion: null,
      consignacionId: null,
      inmuebleLabel: 'Apto 402 · Cra 43',
      asignadoAUserId: 'u-1',
      asignadoANombre: 'Ana Ruiz',
      asignadoDesde: null,
      estado: 'ASIGNADA',
      slaVenceAt: '2026-09-24T15:00:00Z',
      resueltaAt: null,
      cerradaAt: null,
      createdAt: '2026-09-03T15:00:00Z',
      updatedAt: '2026-09-03T15:00:00Z',
      ...p,
    }) as Pqrs

  const lista = [
    fila({ id: 'a' }),
    fila({ id: 'b', radicado: 'PQRS-0002', solicitanteNombre: 'Jorge Pérez', asunto: 'Ruido', estado: 'CERRADA' }),
  ]

  it('sin filtros devuelve todo, sin copiar nada de más', () => {
    expect(filtrarPqrs(lista, FILTROS_DE_PQRS_VACIOS)).toHaveLength(2)
  })

  it('busca por radicado, por quién la puso, por asunto y por inmueble', () => {
    const solo = (texto: string) =>
      filtrarPqrs(lista, { ...FILTROS_DE_PQRS_VACIOS, texto }).map((p) => p.id)
    expect(solo('PQRS-0002')).toEqual(['b'])
    expect(solo('camila')).toEqual(['a'])
    expect(solo('ruido')).toEqual(['b'])
    expect(solo('Apto 402')).toEqual(['a', 'b'])
    expect(solo('   ')).toEqual(['a', 'b'])
  })

  it('el filtro de estado y el texto se aplican juntos', () => {
    expect(
      filtrarPqrs(lista, { texto: 'jorge', estado: 'ASIGNADA' }).map((p) => p.id),
    ).toEqual([])
    expect(filtrarPqrs(lista, { texto: '', estado: 'CERRADA' }).map((p) => p.id)).toEqual(['b'])
  })
})
