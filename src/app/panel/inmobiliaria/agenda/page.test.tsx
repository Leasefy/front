/**
 * La agenda distingue «falló» de «no hay nada» — y no ofrece reintentar en vano.
 *
 * Antes la página guardaba el fallo como un booleano (`catch(() => setError(true))`),
 * así que una sesión vencida, un 500 y un corte de red se veían todos igual:
 * "No pudimos cargar la agenda. Reintenta." con un botón Reintentar. Sobre un
 * 401 ese botón no arregla nada — reintentas para siempre.
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

const toastMock = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))
vi.mock('sonner', () => ({ toast: toastMock }))

// `operaciones:edit` decide si se dibujan las acciones que escriben. Controlado por test.
let _puedeEditar = true
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({
    canAccess: (m: string, a: string) => (m === 'operaciones' && a === 'edit' ? _puedeEditar : true),
    isLoading: false,
  }),
}))

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
const aceptarCitaMock = vi.fn()
vi.mock('@/lib/api/agenda.service', () => ({
  agendaApi: {
    getAgenda: () => getAgendaMock(),
    aceptarCita: (id: string) => aceptarCitaMock(id),
  },
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
  _puedeEditar = true
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

// ── Casos de error del tramo A (auditoría del 13-09) ─────────────────────────

const CON_VISITA_PENDIENTE = {
  resumen: {
    total: 1,
    visitas: 3,
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
      estado: 'pendiente',
      estadoRaw: 'PENDING',
      titulo: 'Visita a Apto 402',
      fecha: '2026-10-01T10:00:00',
    },
  ],
  total: 1,
}

const tiles = () => Array.from(container.querySelectorAll<HTMLElement>('[data-testid="kpi-valor"]'))
const botonConTexto = (texto: string) =>
  Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.includes(texto))

describe('A1 — los tiles del resumen no dicen «0» cuando no saben', () => {
  it('mientras carga: los seis tiles en «cargando», ninguno con un número', async () => {
    getAgendaMock.mockReturnValue(new Promise(() => {}))
    await montar()

    expect(tiles()).toHaveLength(6)
    expect(tiles().every((el) => el.dataset.estado === 'cargando')).toBe(true)
  })

  it('con la carga caída: «—» en los seis, y ningún «0» afirmado encima del fallo', async () => {
    getAgendaMock.mockRejectedValue(new ApiError(500, 'boom'))
    await montar()

    expect(fallo()).not.toBeNull()
    expect(tiles().every((el) => el.dataset.estado === 'fallo')).toBe(true)
    expect(tiles().some((el) => el.textContent?.includes('0'))).toBe(false)
  })

  it('con datos: el número real', async () => {
    getAgendaMock.mockResolvedValue(CON_VISITA_PENDIENTE)
    await montar()

    expect(tiles()[0].dataset.estado).toBe('ok')
    expect(tiles()[0].textContent).toBe('3')
  })
})

describe('A3 — sin `operaciones:edit` no se dibuja lo que el back rechaza con 403', () => {
  it('CONTADOR/VIEWER: ni Pedir cita, ni Nueva tarea, ni Confirmar/Rechazar en la fila', async () => {
    _puedeEditar = false
    getAgendaMock.mockResolvedValue(CON_VISITA_PENDIENTE)
    await montar()

    expect(container.querySelector('[data-testid="pedir-cita"]')).toBeNull()
    expect(container.querySelector('[data-testid="nueva-tarea"]')).toBeNull()
    expect(botonConTexto('citaConfirmar')).toBeUndefined()
    expect(botonConTexto('citaRechazar')).toBeUndefined()
    // La fila se sigue viendo: leer la agenda sí puede.
    expect(container.querySelector('[data-testid="agenda-fila"]')).not.toBeNull()
  })

  it('CONTADOR/VIEWER con la agenda vacía: el vacío no ofrece «Agendar una visita»', async () => {
    _puedeEditar = false
    getAgendaMock.mockResolvedValue(AGENDA_VACIA)
    await montar()

    expect(container.textContent).toContain('emptyTitle')
    expect(container.textContent).not.toContain('Agendar una visita')
  })

  it('con permiso: los botones están', async () => {
    getAgendaMock.mockResolvedValue(CON_VISITA_PENDIENTE)
    await montar()

    expect(container.querySelector('[data-testid="pedir-cita"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="nueva-tarea"]')).not.toBeNull()
    expect(botonConTexto('citaConfirmar')).toBeDefined()
  })
})

describe('A2 — el motivo del back no se pierde en un catch sin argumento', () => {
  it('un 409 que explica viaja en la descripción del aviso', async () => {
    getAgendaMock.mockResolvedValue(CON_VISITA_PENDIENTE)
    aceptarCitaMock.mockRejectedValue(new ApiError(409, 'Esa cita ya fue cancelada.'))
    await montar()

    await act(async () => {
      botonConTexto('citaConfirmar')!.click()
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(toastMock.error).toHaveBeenCalledWith(
      'inmobiliaria.agenda.citaAccionError',
      { description: 'Esa cita ya fue cancelada.' },
    )
  })

  it('sesión vencida: no hay aviso de «no se pudo» encima del cierre de sesión', async () => {
    getAgendaMock.mockResolvedValue(CON_VISITA_PENDIENTE)
    aceptarCitaMock.mockRejectedValue(new ApiError(401, 'Tu sesión expiró.'))
    await montar()

    await act(async () => {
      botonConTexto('citaConfirmar')!.click()
    })
    await act(async () => {
      await Promise.resolve()
    })

    expect(toastMock.error).not.toHaveBeenCalled()
  })
})

describe('A7 — un doble clic no manda dos confirmaciones', () => {
  it('dos clics antes del siguiente render: una sola llamada al back', async () => {
    getAgendaMock.mockResolvedValue(CON_VISITA_PENDIENTE)
    aceptarCitaMock.mockReturnValue(new Promise(() => {}))
    await montar()

    const confirmar = botonConTexto('citaConfirmar')!
    await act(async () => {
      confirmar.click()
      confirmar.click()
    })

    expect(aceptarCitaMock).toHaveBeenCalledTimes(1)
  })
})
