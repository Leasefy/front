/**
 * La agenda distingue «falló» de «no hay nada» — y no ofrece reintentar en vano.
 *
 * Antes la página guardaba el fallo como un booleano (`catch(() => setError(true))`),
 * así que una sesión vencida, un 500 y un corte de red se veían todos igual:
 * "No pudimos cargar la agenda. Reintenta." con un botón Reintentar. Sobre un
 * 401 ese botón no arregla nada — reintentás para siempre.
 *
 * Nico lo reportó al revés, y con razón en el fondo: vio ese cartel en una
 * agencia SIN eventos y le pareció que era un vacío disfrazado de error.
 * Resultó ser un 401 de sesión vencida, pero el cartel no lo decía.
 */

// 🔴 Zona fija: este archivo prueba justamente que el día NO se corra. En una
// máquina en UTC el defecto es invisible, así que se ancla en Bogotá (UTC-5)
// antes de importar nada que construya una fecha.
process.env.TZ = 'America/Bogota'

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k }),
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

vi.mock('@/components/inmobiliaria/agenda/PedirCitaModal', () => ({
  PedirCitaModal: () => null,
}))

// El token decide si un 401 es «se venció la sesión» o «esta consulta no pasó»
// (ver src/lib/errores/clasificar.ts). Controlado por test.
let _hayToken = false
vi.mock('@/lib/api/client', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/api/client')>()
  return { ...real, getAccessToken: () => (_hayToken ? 'tok' : null) }
})

const getAgendaMock = vi.fn()
vi.mock('@/lib/api/agenda.service', () => ({
  agendaApi: { getAgenda: () => getAgendaMock() },
}))

import { ApiError } from '@/lib/api/client'
import AgendaPage from './page'

let container: HTMLDivElement
let root: Root

const AGENDA_VACIA = {
  resumen: { visitas: 0, firmas: 0, vencimientos: 0, inspecciones: 0 },
  eventos: [],
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  _hayToken = false
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
    root.render(React.createElement(AgendaPage))
  })
  // deja resolver la promesa del fetch
  await act(async () => {
    await Promise.resolve()
  })
}

function fallo() {
  return container.querySelector<HTMLElement>('[data-testid="fallo-de-carga"]')
}

describe('agenda — los cuatro estados no son uno', () => {
  it('sin eventos y sin fallo: muestra el vacío, no un error', async () => {
    getAgendaMock.mockResolvedValue(AGENDA_VACIA)
    await montar()

    expect(fallo()).toBeNull()
    expect(container.textContent).toContain('emptyTitle')
  })

  it('sesión vencida: lo dice, y NO ofrece reintentar', async () => {
    _hayToken = false
    getAgendaMock.mockRejectedValue(new ApiError(401, 'Unauthorized'))
    await montar()

    const cartel = fallo()
    expect(cartel).not.toBeNull()
    expect(cartel?.dataset.tipo).toBe('sinSesion')
    // Reintentar sobre un 401 sin sesión es una promesa falsa.
    expect(container.querySelector('[data-testid="reintentar"]')).toBeNull()
    expect(cartel?.textContent).toContain('Volver a entrar')
  })

  it('el servidor falló: ahí sí ofrece reintentar', async () => {
    getAgendaMock.mockRejectedValue(new ApiError(500, 'boom'))
    await montar()

    expect(fallo()?.dataset.tipo).toBe('servidor')
    expect(container.querySelector('[data-testid="reintentar"]')).not.toBeNull()
  })

  it('un fallo NO se muestra como estado vacío', async () => {
    getAgendaMock.mockRejectedValue(new ApiError(500, 'boom'))
    await montar()

    expect(container.textContent).not.toContain('emptyTitle')
  })
})

describe('agenda — el día que muestra la tabla es el del calendario', () => {
  /**
   * 🔴 `vencimiento_contrato` y `firma_pendiente` nacen de columnas de SÓLO
   * FECHA. Mientras el back las mandó como instante UTC (`…T00:00:00.000Z`),
   * `new Date(iso)` en Colombia (UTC-5) las pintaba el 30 de septiembre. Una
   * agenda que corre un vencimiento un día para atrás no sirve para nada.
   *
   * La página ya no interpreta la cadena como instante: lee el día con
   * `fechaLocal`, el mismo helper del cajón, así que tabla y detalle no pueden
   * decir días distintos.
   */
  const conEvento = (fecha: string) => ({
    resumen: {
      total: 1,
      visitas: 0,
      firmasPendientes: 0,
      vencimientos: 1,
      seguimientos: 0,
      inspecciones: 0,
      tareas: 0,
    },
    eventos: [
      {
        id: 'expire-c-1',
        tipo: 'vencimiento_contrato',
        origen: 'sistema',
        estado: 'pendiente',
        titulo: 'Vence el contrato · Apto 402',
        fecha,
      },
    ],
    total: 1,
  })

  it('un vencimiento del 1 de octubre NO se muestra el 30 de septiembre', async () => {
    getAgendaMock.mockResolvedValue(conEvento('2026-10-01T00:00:00.000Z'))
    await montar()

    const fila = container.querySelector('[data-testid="agenda-fila"]')
    expect(fila).not.toBeNull()
    expect(fila?.textContent).toContain('oct')
    expect(fila?.textContent).not.toContain('sept')
  })

  it('lee igual la fecha sin zona que manda hoy el back', async () => {
    getAgendaMock.mockResolvedValue(conEvento('2026-10-01T00:00:00'))
    await montar()

    const fila = container.querySelector('[data-testid="agenda-fila"]')
    expect(fila?.textContent).toContain('oct')
    expect(fila?.textContent).not.toContain('sept')
  })
})

describe('agenda — una visita confirmada se ve confirmada', () => {
  it('el estado `confirmado` tiene su propia etiqueta, no la de «pendiente»', async () => {
    getAgendaMock.mockResolvedValue({
      resumen: {
        total: 1,
        visitas: 1,
        firmasPendientes: 0,
        vencimientos: 0,
        seguimientos: 0,
        inspecciones: 0,
        tareas: 0,
      },
      eventos: [
        {
          id: 'visit-v-1',
          tipo: 'visita',
          origen: 'usuario',
          estado: 'confirmado',
          estadoRaw: 'ACCEPTED',
          titulo: 'Visita a Apto 402',
          fecha: '2026-10-01T10:00:00',
        },
      ],
      total: 1,
    })
    await montar()

    const fila = container.querySelector('[data-testid="agenda-fila"]')
    // El stub de i18n devuelve la clave: alcanza para ver que NO reusa la de pendiente.
    expect(fila?.textContent).toContain('estado_confirmado')
    expect(fila?.textContent).not.toContain('estado_pendiente')
  })
})
