/**
 * page.test.tsx — Mantenimientos: tres cosas que la página decía mal.
 *
 * M2 — Crear una solicitud que el back rechazaba mostraba «Error al crear
 *      solicitud de mantenimiento» y tiraba el motivo (que el back sí manda).
 * M3 — «Seleccionar» una cotización (aprobarla) no tenía gate: CONTADOR y
 *      VIEWER veían el botón y comían un 403 disfrazado de mensaje genérico.
 * M4 — Si los inmuebles no llegaban, «Nueva solicitud» abría con el selector
 *      vacío diciendo «no tienes inmuebles arrendados»: un fallo contado como
 *      un vacío, sin forma de reintentar.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { ApiError } from '@/lib/api/client'

void React // jsx-preserve
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type Props = Record<string, unknown>

const h = vi.hoisted(() => ({
  canAccess: vi.fn((_modulo: string, _accion: string) => true),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  consignaciones: {
    consignaciones: [] as unknown[],
    isLoading: false,
    errorCrudo: null as unknown,
    refetch: vi.fn(async () => []),
  },
  api: {
    create: vi.fn(),
    approveQuote: vi.fn(),
    updateStatus: vi.fn(),
    addQuote: vi.fn(),
    subirFoto: vi.fn(),
    registrarSeguimiento: vi.fn(),
  },
  mantenimientos: [] as unknown[],
  ultimoForm: null as Props | null,
  ultimoViewer: null as Props | null,
  ultimoKanban: null as Props | null,
}))

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k, formatDate: (d: string) => d }),
}))

vi.mock('@/components/ui/toast', () => ({ toast: h.toast }))

vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: h.canAccess, isLoading: false }),
}))

vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useMantenimientos: () => ({
    mantenimientos: h.mantenimientos,
    isLoading: false,
    errorCrudo: null,
    refetch: async () => [],
  }),
  useConsignaciones: () => h.consignaciones,
  mantenimientoApi: h.api,
}))

// Las piezas de la pantalla se prueban en sus propios archivos; acá importa
// qué les pasa la página.
vi.mock('@/components/inmobiliaria', () => ({
  MantenimientoList: () => null,
  MantenimientoKanban: (props: Props) => {
    h.ultimoKanban = props
    return null
  },
  AgregarCotizacionDialog: () => null,
  MantenimientoForm: (props: Props) => {
    h.ultimoForm = props
    return <div data-testid="form-stub" />
  },
  MantenimientoViewer: (props: Props) => {
    h.ultimoViewer = props
    return null
  },
}))

import MantenimientosPage from './page'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  vi.clearAllMocks()
  h.canAccess.mockImplementation(() => true)
  h.consignaciones.errorCrudo = null
  h.mantenimientos = []
  h.ultimoForm = null
  h.ultimoViewer = null
  h.ultimoKanban = null
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
    root.render(<MantenimientosPage />)
  })
}

async function abrirNuevaSolicitud() {
  await act(async () => {
    container.querySelector<HTMLElement>('[data-testid="nueva-solicitud"]')!.click()
  })
}

describe('M2 — crear una solicitud que el back rechaza', () => {
  it('el aviso dice el motivo que mandó el back', async () => {
    h.api.create.mockRejectedValue(new Error('El inmueble no tiene un contrato activo'))
    await render()
    await abrirNuevaSolicitud()
    expect(h.ultimoForm).not.toBeNull()

    await act(async () => {
      await (h.ultimoForm!.onSubmit as (d: unknown) => Promise<void>)({
        consignacionId: 'cons-1',
        type: 'plumbing',
        priority: 'medium',
        title: 'Gotera',
        description: 'Gotea',
        photoUrls: [],
        paidBy: 'owner',
      })
    })

    expect(h.toast.error).toHaveBeenCalledWith('No se pudo crear la solicitud', {
      description: 'El inmueble no tiene un contrato activo',
    })
  })
})

/** Un 5xx como lo manda el back desde el 02-10-2026: con `code` y `referencia`. */
const falloNuestro = () =>
  new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
    statusCode: 500,
    code: 'ERROR_INTERNO',
    message: 'Error interno del servidor',
    referencia: 'ab12cd34',
  })

const SOLICITUD = {
  consignacionId: 'cons-1',
  type: 'plumbing',
  priority: 'medium',
  title: 'Gotera',
  description: 'Gotea',
  photoUrls: [],
  paidBy: 'owner',
}

async function crear() {
  await render()
  await abrirNuevaSolicitud()
  await act(async () => {
    await (h.ultimoForm!.onSubmit as (d: unknown) => Promise<void>)(SOLICITUD)
  })
}

describe('M2 · 02-10 — el error de crear, por el sistema de errores', () => {
  it('🔴 un 400 con campos va al formulario, campo por campo, y no a un toast', async () => {
    h.api.create.mockRejectedValue(
      new ApiError(400, ['El título puede tener hasta 200 caracteres.'], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: ['El título puede tener hasta 200 caracteres.'],
        campos: [
          { campo: 'title', regla: 'longitud_maxima', mensaje: 'El título puede tener hasta 200 caracteres.' },
        ],
      }),
    )
    await crear()
    expect(h.ultimoForm!.erroresDelServidor).toEqual({
      title: 'El título puede tener hasta 200 caracteres.',
    })
    expect(h.toast.error).not.toHaveBeenCalled()
  })

  it('🔴 un 5xx dice que falló de nuestro lado, con la referencia', async () => {
    h.api.create.mockRejectedValue(falloNuestro())
    await crear()
    const descripcion = h.toast.error.mock.calls[0]?.[1]?.description as string
    expect(descripcion).toContain('de nuestro lado')
    expect(descripcion).toContain('ab12cd34')
    expect(descripcion).not.toMatch(/conexi[oó]n/i)
  })

  it('🔴 sin respuesta (status 0) habla de la conexión', async () => {
    h.api.create.mockRejectedValue(new ApiError(0, 'Failed to fetch'))
    await crear()
    const descripcion = h.toast.error.mock.calls[0]?.[1]?.description as string
    expect(descripcion).toMatch(/conexi[oó]n/i)
  })
})

describe('Mover una solicitud de estado · 02-10', () => {
  async function mover(fallo: unknown) {
    h.api.updateStatus.mockRejectedValue(fallo)
    await render()
    await act(async () => {
      ;(h.ultimoViewer!.onStatusChange as (id: string, s: string) => void)('sol-1', 'completed')
    })
    await act(async () => {
      await Promise.resolve()
    })
    return h.toast.error.mock.calls[0]?.[1]?.description as string
  }

  it('un 400 que explica la transición dice el motivo del back', async () => {
    const d = await mover(new ApiError(400, 'Desde Reportada sólo puede pasar a Cotizada o Cancelada.'))
    expect(d).toBe('Desde Reportada sólo puede pasar a Cotizada o Cancelada.')
  })

  it('🔴 un 5xx dice que falló de nuestro lado, con la referencia', async () => {
    const d = await mover(falloNuestro())
    expect(d).toContain('de nuestro lado')
    expect(d).toContain('ab12cd34')
  })

  it('🔴 sin respuesta (status 0) habla de la conexión', async () => {
    const d = await mover(new ApiError(0, 'Failed to fetch'))
    expect(d).toMatch(/conexi[oó]n/i)
  })
})

describe('M3 — aprobar una cotización', () => {
  it('sin permiso de edición (CONTADOR, VIEWER) el detalle no recibe con qué aprobar', async () => {
    h.canAccess.mockImplementation((_m: string, accion: string) => accion === 'view')
    await render()

    expect(h.ultimoViewer).not.toBeNull()
    expect(h.ultimoViewer!.onApproveQuote).toBeUndefined()
  })

  it('con permiso, aprueba; si el back rechaza, el aviso dice por qué', async () => {
    h.api.approveQuote.mockRejectedValue(new Error('La cotización ya no está vigente'))
    await render()

    const aprobar = h.ultimoViewer!.onApproveQuote as (s: string, q: string) => Promise<void>
    expect(aprobar).toBeTypeOf('function')
    await act(async () => {
      await aprobar('sol-1', 'q-1')
    })
    // Aprobar pregunta primero a cargo de quién queda: no se aprueba sin decirlo.
    expect(h.api.approveQuote).not.toHaveBeenCalled()
    await act(async () => {
      document.body.querySelector<HTMLElement>('[data-testid="a-cargo-de-PROPIETARIO"]')!.click()
    })
    await act(async () => {
      document.body.querySelector<HTMLElement>('[data-testid="a-cargo-de-confirmar"]')!.click()
    })

    expect(h.api.approveQuote).toHaveBeenCalledWith('sol-1', 'q-1', {
      aCargoDe: 'PROPIETARIO',
    })
    expect(h.toast.error).toHaveBeenCalledWith('No se pudo aprobar la cotización', {
      description: 'La cotización ya no está vigente',
    })
    // Rechazada, el diálogo sigue abierto para reintentar.
    expect(document.body.querySelector('[data-testid="a-cargo-de"]')).not.toBeNull()
  })

  it('a cargo del inquilino: el aviso dice que el cobro no es automático', async () => {
    h.api.approveQuote.mockResolvedValue({
      id: 'sol-1',
      cargo: {
        aCargoDe: 'INQUILINO',
        deduccionIds: [],
        avisos: ['El cobro todavía no entra solo al estado de cuenta del inquilino.'],
      },
    })
    await render()
    const aprobar = h.ultimoViewer!.onApproveQuote as (s: string, q: string) => Promise<void>
    await act(async () => {
      await aprobar('sol-1', 'q-1')
    })
    await act(async () => {
      document.body.querySelector<HTMLElement>('[data-testid="a-cargo-de-INQUILINO"]')!.click()
    })
    await act(async () => {
      document.body.querySelector<HTMLElement>('[data-testid="a-cargo-de-confirmar"]')!.click()
    })

    expect(h.api.approveQuote).toHaveBeenCalledWith('sol-1', 'q-1', {
      aCargoDe: 'INQUILINO',
    })
    expect(h.toast.success).toHaveBeenCalledWith(
      'inmobiliaria.deducciones.aCargoDe.aprobadaInquilino',
      { description: 'El cobro todavía no entra solo al estado de cuenta del inquilino.' },
    )
  })
})

describe('M5 — el agente propone, una persona aprueba', () => {
  async function abrirAprobacion(quoteId: string) {
    await render()
    const aprobar = h.ultimoViewer!.onApproveQuote as (s: string, q: string) => Promise<void>
    await act(async () => {
      await aprobar('sol-1', quoteId)
    })
  }

  const conPropuesta = (propuesta: Record<string, unknown>) => {
    h.mantenimientos = [
      {
        id: 'sol-1',
        quotes: [],
        propuesta: {
          quoteId: 'q-1',
          aCargoDeSugerido: 'INQUILINO',
          nota: null,
          propuestaPor: 'AGENTE',
          propuestaAt: '2026-09-15T11:00:00.000Z',
          atendidaAt: null,
          ...propuesta,
        },
      },
    ]
  }

  it('al aprobar la cotización que propuso el agente, el diálogo dice su sugerencia', async () => {
    conPropuesta({})
    await abrirAprobacion('q-1')

    expect(document.body.querySelector('[data-testid="a-cargo-de-sugerencia"]')).not.toBeNull()
    // Decir no es elegir: nada queda marcado.
    expect(
      document.body
        .querySelector('[data-testid="a-cargo-de-INQUILINO"]')
        ?.getAttribute('aria-checked'),
    ).toBe('false')
  })

  it('otra cotización, o una propuesta ya atendida, no arrastra la sugerencia', async () => {
    conPropuesta({})
    await abrirAprobacion('q-2')
    expect(document.body.querySelector('[data-testid="a-cargo-de"]')).not.toBeNull()
    expect(document.body.querySelector('[data-testid="a-cargo-de-sugerencia"]')).toBeNull()

    await act(async () => root.unmount())
    root = createRoot(container)
    conPropuesta({ atendidaAt: '2026-09-16T09:00:00.000Z' })
    await abrirAprobacion('q-1')
    expect(document.body.querySelector('[data-testid="a-cargo-de-sugerencia"]')).toBeNull()
  })

  it('con el cargo puesto en la cuota del inquilino, el aviso dice dónde quedó', async () => {
    h.api.approveQuote.mockResolvedValue({
      id: 'sol-1',
      cargo: {
        aCargoDe: 'INQUILINO',
        deduccionIds: [],
        avisos: [],
        cargoAlInquilino: {
          id: 'c-1',
          contractId: 'k-1',
          nombre: 'Reparación',
          valorCop: 180000,
          mesDesde: '2026-09',
          mes: '2026-10',
          cuotaId: 'cuota-10',
        },
      },
    })
    await abrirAprobacion('q-1')
    await act(async () => {
      document.body.querySelector<HTMLElement>('[data-testid="a-cargo-de-INQUILINO"]')!.click()
    })
    await act(async () => {
      document.body.querySelector<HTMLElement>('[data-testid="a-cargo-de-confirmar"]')!.click()
    })

    expect(h.toast.success).toHaveBeenCalledWith(
      'inmobiliaria.deducciones.aCargoDe.aprobadaInquilino',
      { description: 'inmobiliaria.deducciones.cargoAlInquilino.aprobada' },
    )
  })
})

describe('M4 — «Nueva solicitud» cuando los inmuebles no llegaron', () => {
  it('el cajón dice que no se pudieron traer, con reintento, en vez del selector vacío', async () => {
    h.consignaciones.errorCrudo = new ApiError(0, 'fetch failed')
    await render()
    await abrirNuevaSolicitud()

    expect(document.body.querySelector('[data-testid="form-stub"]')).toBeNull()
    const fallo = document.body.querySelector('[data-testid="fallo-de-carga"]')
    expect(fallo).not.toBeNull()

    await act(async () => {
      fallo!.querySelector<HTMLElement>('[data-testid="reintentar"]')!.click()
    })
    expect(h.consignaciones.refetch).toHaveBeenCalledTimes(1)
  })

  it('🔴 sin portafolio:view (CONTADOR) el botón está apagado y dice por qué (QA 22-09)', async () => {
    h.canAccess.mockImplementation((m: string) => m !== 'portafolio')
    await render()
    const boton = document.body.querySelector<HTMLButtonElement>('[data-testid="nueva-solicitud"]')!
    expect(boton.disabled).toBe(true)
    expect(document.body.querySelector('[data-testid="nueva-solicitud-motivo"]')?.textContent).toContain(
      'no puede ver los inmuebles',
    )
  })

  it('sin operaciones:create también se apaga', async () => {
    h.canAccess.mockImplementation((_m: string, accion: string) => accion !== 'create')
    await render()
    expect(document.body.querySelector<HTMLButtonElement>('[data-testid="nueva-solicitud"]')!.disabled).toBe(true)
  })

  it('con los inmuebles cargados, el cajón es el formulario de siempre', async () => {
    await render()
    await abrirNuevaSolicitud()

    expect(document.body.querySelector('[data-testid="form-stub"]')).not.toBeNull()
    expect(document.body.querySelector('[data-testid="fallo-de-carga"]')).toBeNull()
  })
})

/**
 * 02-10-2026 · Las fotos se suben de verdad, DESPUÉS de crear la solicitud.
 *
 * Antes la página mandaba `photoUrls` con la vista previa del navegador
 * (`blob:`), que nadie más podía abrir. Ahora crea la solicitud sin fotos y
 * sube cada archivo a `POST …/mantenimiento/:id/fotos`. Una foto que falla no
 * deshace la solicitud: se dice cuál y por qué.
 */
describe('Las fotos de una solicitud nueva', () => {
  const archivo = (nombre: string) => new File([new Uint8Array(64)], nombre, { type: 'image/jpeg' })

  async function crearCon(fotos: File[]) {
    await render()
    await abrirNuevaSolicitud()
    await act(async () => {
      await (h.ultimoForm!.onSubmit as (d: unknown) => Promise<void>)({ ...SOLICITUD, fotos })
    })
  }

  it('🔴 crea la solicitud SIN fotos y después sube cada archivo a ella, en orden', async () => {
    const orden: string[] = []
    h.api.create.mockImplementation(async () => {
      orden.push('crear')
      return { id: 'sol-1' }
    })
    h.api.subirFoto.mockImplementation(async (_id: string, f: File) => {
      orden.push(`foto ${f.name}`)
      return { ruta: 'x', photoUrls: [] }
    })
    const a = archivo('a.jpg')
    const b = archivo('b.jpg')
    await crearCon([a, b])

    const cuerpo = h.api.create.mock.calls[0][0] as Record<string, unknown>
    expect(cuerpo).not.toHaveProperty('photoUrls')
    expect(cuerpo).not.toHaveProperty('fotos')
    // 🔴 02-10 · las fotos del reporte no mandan `destino` (el back toma `reporte`).
    expect(h.api.subirFoto.mock.calls).toEqual([
      ['sol-1', a],
      ['sol-1', b],
    ])
    expect(orden).toEqual(['crear', 'foto a.jpg', 'foto b.jpg'])
    expect(h.toast.success).toHaveBeenCalledTimes(1)
    expect(h.toast.error).not.toHaveBeenCalled()
  })

  it('🔴 una foto que no sube NO deshace la solicitud: se dice cuál y por qué', async () => {
    h.api.create.mockResolvedValue({ id: 'sol-1' })
    h.api.subirFoto
      .mockResolvedValueOnce({ ruta: 'x', photoUrls: [] })
      .mockRejectedValueOnce(
        new ApiError(400, 'La foto no puede pesar más de 5 MB.', 'FOTO_MUY_PESADA', {
          statusCode: 400,
          code: 'FOTO_MUY_PESADA',
          message: 'La foto no puede pesar más de 5 MB.',
        }),
      )
    await crearCon([archivo('a.jpg'), archivo('b.jpg')])

    // La solicitud quedó: el aviso de creada sale y el cajón se cierra.
    expect(h.toast.success).toHaveBeenCalledTimes(1)
    expect(document.body.querySelector('[data-testid="form-stub"]')).toBeNull()
    expect(h.toast.error).toHaveBeenCalledWith(
      'La solicitud quedó creada, pero una foto no se subió',
      { description: '«b.jpg»: La foto no puede pesar más de 5 MB.' },
    )
  })

  it('un 5xx al subir dice que fue de nuestro lado, con la referencia', async () => {
    h.api.create.mockResolvedValue({ id: 'sol-1' })
    h.api.subirFoto.mockRejectedValue(falloNuestro())
    await crearCon([archivo('a.jpg'), archivo('b.jpg')])
    const [titulo, { description }] = h.toast.error.mock.calls[0] as [string, { description: string }]
    expect(titulo).toBe('La solicitud quedó creada, pero 2 fotos no se subieron')
    expect(description).toContain('de nuestro lado')
    expect(description).toContain('ab12cd34')
    expect(description).not.toMatch(/conexi[oó]n/i)
  })

  it('si la solicitud no se creó, ninguna foto se intenta subir', async () => {
    h.api.create.mockRejectedValue(falloNuestro())
    await crearCon([archivo('a.jpg')])
    expect(h.api.subirFoto).not.toHaveBeenCalled()
  })
})

describe('Quién gestiona la reparación (Portofino, 29-10-2026)', () => {
  const sol = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    status: 'reported',
    priority: 'medium',
    title: `Arreglo ${id}`,
    quotes: [],
    paidBy: 'owner',
    ...extra,
  })
  const base = {
    consignacionId: 'cons-1',
    type: 'plumbing',
    priority: 'medium',
    title: 'Filtración por la fachada',
    description: 'Entra agua por la ventana del estudio cuando llueve.',
    paidBy: 'owner',
  }
  const visibles = () => (h.ultimoKanban!.data as Array<{ id: string }>).map((s) => s.id)

  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('al crear, el campo viaja sólo si no la gestiona la inmobiliaria', async () => {
    h.api.create.mockResolvedValue({ id: 'nueva' })
    await render()
    await abrirNuevaSolicitud()
    await act(async () => {
      await (h.ultimoForm!.onSubmit as (d: unknown) => Promise<void>)({ ...base, gestionadoPor: 'propietario' })
    })
    expect(h.api.create).toHaveBeenLastCalledWith(expect.objectContaining({ gestionadoPor: 'propietario' }))

    await abrirNuevaSolicitud()
    await act(async () => {
      await (h.ultimoForm!.onSubmit as (d: unknown) => Promise<void>)({ ...base, gestionadoPor: 'inmobiliaria' })
    })
    expect(h.api.create.mock.calls.at(-1)![0]).not.toHaveProperty('gestionadoPor')
  })

  it('sin la migración del back (503) el aviso dice su frase y el formulario no se rompe', async () => {
    const frase =
      'Todavía no se puede dejar la gestión de una reparación al propietario, a la administración o al inquilino: falta una actualización de Leasefy en la base de datos. Mientras tanto la gestiona la inmobiliaria, como siempre.'
    h.api.create.mockRejectedValue(
      new ApiError(503, frase, 'GESTIONADO_POR_SIN_MIGRAR', { statusCode: 503, code: 'GESTIONADO_POR_SIN_MIGRAR', message: frase }),
    )
    await render()
    await abrirNuevaSolicitud()
    await act(async () => {
      await (h.ultimoForm!.onSubmit as (d: unknown) => Promise<void>)({ ...base, gestionadoPor: 'administracion' })
    })
    // La frase del back, tal cual (el traductor le suma su coletilla de soporte, como a todo 5xx).
    expect(h.toast.error).toHaveBeenCalledWith('No se pudo crear la solicitud', {
      description: expect.stringContaining(frase),
    })
    // El cajón sigue abierto (va en un portal) con el formulario listo para cambiar la opción.
    expect(document.body.querySelector('[data-testid="form-stub"]')).not.toBeNull()
    expect(h.ultimoForm!.isSubmitting).toBe(false)
  })

  it('filtra por quién gestiona (desde la URL) y «Limpiar» lo quita', async () => {
    h.mantenimientos = [sol('a'), sol('b', { gestionadoPor: 'propietario' }), sol('c', { gestionadoPor: 'administracion' })]
    window.history.replaceState(null, '', '/panel/inmobiliaria/mantenimientos?gestiona=propietario')
    await render()
    expect(visibles()).toEqual(['b'])

    await act(async () => {
      container.querySelector<HTMLElement>('[data-testid="limpiar-filtro-de-gestion"]')!.click()
    })
    expect(visibles()).toEqual(['a', 'b', 'c'])
    expect(window.location.search).toBe('')
  })

  it('filtrado a cero no dice «todavía no tienes»: ofrece quitar el filtro', async () => {
    h.mantenimientos = [sol('a')]
    window.history.replaceState(null, '', '/panel/inmobiliaria/mantenimientos?gestiona=inquilino')
    await render()
    expect(container.querySelector('[data-caso="filtros"]')).not.toBeNull()
  })

  it('soltar en «Aprobada» una que gestiona otro: no se mueve y dice por qué', async () => {
    h.mantenimientos = [sol('b', { gestionadoPor: 'administracion' })]
    await render()
    let seEncargo: boolean | undefined
    act(() => {
      seEncargo = (h.ultimoKanban!.alSoltar as (s: unknown, d: string) => boolean)(h.mantenimientos[0], 'approved')
    })
    expect(seEncargo).toBe(true)
    expect(h.toast.info).toHaveBeenCalledWith('Esta reparación no pasa por cotización ni aprobación', {
      description: expect.stringContaining('La gestiona la administración'),
    })
    expect(h.api.updateStatus).not.toHaveBeenCalled()
    expect(h.api.registrarSeguimiento).not.toHaveBeenCalled()
  })

  it('soltarla en «En arreglo» registra ese paso del seguimiento (sin pasar por la aprobación)', async () => {
    h.api.registrarSeguimiento.mockResolvedValue({})
    h.mantenimientos = [sol('b', { gestionadoPor: 'propietario' })]
    await render()
    let seEncargo: boolean | undefined
    await act(async () => {
      seEncargo = (h.ultimoKanban!.alSoltar as (s: unknown, d: string) => boolean)(h.mantenimientos[0], 'in_progress')
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(seEncargo).toBe(true)
    expect(h.api.registrarSeguimiento).toHaveBeenCalledWith('b', 'en_arreglo')
    expect(h.toast.success).toHaveBeenCalledWith('Listo: quedó registrado «En arreglo»', {
      description: 'La tarjeta pasa a «En arreglo».',
    })
  })

  it('el detalle recibe con qué cambiar la gestión sólo con permiso de editar', async () => {
    await render()
    expect(h.ultimoViewer!.onGestionCambio).toEqual(expect.any(Function))

    h.canAccess.mockImplementation((_m: string, accion: string) => accion !== 'edit')
    await render()
    expect(h.ultimoViewer!.onGestionCambio).toBeUndefined()
  })
})
