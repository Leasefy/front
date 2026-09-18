/**
 * Las visitas por atender (E-03 y D-02).
 *
 * Lo que fija este test:
 *   · 🔴 lo que FALTA va primero: una visita sin asesor es alguien que mañana se
 *     para en una puerta y no llega nadie, así que no puede quedar sepultada
 *     bajo diez visitas en orden cronológico;
 *   · el no-show se puede poner y QUITAR (el candidato llegó tarde);
 *   · 🔴 el botón de recordatorios dice «marcar como enviados», no «enviar»:
 *     esta pantalla no manda nada.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

const { api, permisos } = vi.hoisted(() => ({
  api: {
    porAtender: (() => Promise.resolve(null)) as () => Promise<unknown>,
    recordatorios: (() => Promise.resolve(null)) as () => Promise<unknown>,
    asesores: (() => Promise.resolve([])) as () => Promise<unknown>,
    marcarNoShow: vi.fn(async () => undefined),
    quitarNoShow: vi.fn(async () => undefined),
    asignarAsesor: vi.fn(async () => undefined),
    avisoAlInquilino: vi.fn(async () => undefined),
  },
  permisos: { edit: true },
}))

vi.mock('@/lib/api/crm.service', async () => {
  const real =
    await vi.importActual<typeof import('@/lib/api/crm.service')>(
      '@/lib/api/crm.service',
    )
  return {
    ...real,
    visitasApi: {
      porAtender: () => api.porAtender(),
      recordatorios: () => api.recordatorios(),
      marcarNoShow: api.marcarNoShow,
      quitarNoShow: api.quitarNoShow,
      asignarAsesor: api.asignarAsesor,
      avisoAlInquilino: api.avisoAlInquilino,
    },
    leadsApi: { asesores: () => api.asesores() },
  }
})
vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({
    isLoading: false,
    canAccess: (_m: string, a: string) => (a === 'edit' ? permisos.edit : true),
  }),
}))

import { VisitasClient } from './VisitasClient'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

function visita(extra: Record<string, unknown> = {}) {
  return {
    visitId: 'v-1',
    status: 'PENDING',
    visitaEn: '2026-09-20T20:00:00.000Z',
    comoSeLee: '20 de septiembre a las 15:00',
    quien: 'Ana Restrepo',
    correo: 'ana@ejemplo.com',
    telefono: null,
    inmueble: {
      id: 'p-1',
      title: 'Apto 402',
      neighborhood: 'Laureles',
      city: 'Medellín',
    },
    asesorUserId: 'ana',
    confirmadaEl: null,
    noShow: false,
    faltaElAsesor: false,
    ocupado: false,
    faltaElAvisoAlInquilino: null,
    ...extra,
  }
}

const POR_ATENDER = {
  disponible: true,
  motivo: null,
  horasDeAvisoAlInquilino: 24,
  visitas: [
    // La primera en el tiempo, pero sin nada pendiente.
    visita({ visitId: 'temprana', visitaEn: '2026-09-19T14:00:00.000Z' }),
    // Más tarde, pero SIN ASESOR: tiene que salir primero.
    visita({
      visitId: 'sin-asesor',
      visitaEn: '2026-09-25T14:00:00.000Z',
      asesorUserId: null,
      faltaElAsesor: true,
    }),
  ],
}

let root: Root | null = null
let contenedor: HTMLDivElement

async function pintar() {
  await act(async () => {
    root!.render(<VisitasClient />)
  })
}
const $ = (sel: string) => contenedor.querySelector(sel)

beforeEach(() => {
  api.porAtender = vi.fn(() => Promise.resolve(POR_ATENDER))
  api.recordatorios = vi.fn(() =>
    Promise.resolve({ disponible: true, motivo: null, visitas: [] }),
  )
  api.asesores = vi.fn(() =>
    Promise.resolve([{ userId: 'ana', leadsActivos: 2, ultimoLeadEl: null }]),
  )
  api.marcarNoShow.mockClear()
  api.quitarNoShow.mockClear()
  permisos.edit = true
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(async () => {
  await act(async () => {
    root!.unmount()
  })
  root = null
  contenedor.remove()
})

describe('VisitasClient', () => {
  it('🔴 lo que FALTA va primero, aunque sea más tarde en el tiempo', async () => {
    await pintar()
    const filas = Array.from(
      contenedor.querySelectorAll('[data-testid^="visita-"]'),
    ).map((el) => el.getAttribute('data-testid'))
    expect(filas[0]).toBe('visita-sin-asesor')
  })

  it('la visita sin asesor lo dice con su consecuencia', async () => {
    await pintar()
    expect($('[data-testid="falta-asesor-sin-asesor"]')?.textContent).toContain(
      'no se puede confirmar',
    )
  })

  it('🔴 D-02: la visita a un inmueble ocupado muestra el plazo del aviso', async () => {
    api.porAtender = vi.fn(() =>
      Promise.resolve({
        ...POR_ATENDER,
        visitas: [
          visita({
            visitId: 'ocupada',
            ocupado: true,
            faltaElAvisoAlInquilino: {
              code: 'SIN_AVISO_AL_INQUILINO',
              message:
                'Hay alguien viviendo en el inmueble: avísale antes de las 2026-09-19 15:00 (24 h antes de la visita).',
              avisarAntesDe: '2026-09-19T20:00:00.000Z',
            },
          }),
        ],
      }),
    )
    await pintar()
    expect($('[data-testid="falta-aviso-ocupada"]')?.textContent).toContain(
      'Hay alguien viviendo en el inmueble',
    )
  })

  it('el no-show se marca desde la fila', async () => {
    await pintar()
    await act(async () => {
      contenedor
        .querySelector<HTMLElement>('[data-testid="no-show-temprana"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(api.marcarNoShow).toHaveBeenCalledWith('temprana')
  })

  it('🔴 y se puede QUITAR: el candidato llegó tarde y no es justo que le quede', async () => {
    // Se monta de cero: `useCrm` no vuelve a pedir con las mismas `deps`, así
    // que re-renderizar con otro mock no cambiaría lo que ya trajo.
    api.porAtender = vi.fn(() =>
      Promise.resolve({
        ...POR_ATENDER,
        visitas: [visita({ visitId: 'temprana', noShow: true })],
      }),
    )
    await pintar()
    const boton = $('[data-testid="no-show-temprana"]')
    expect(boton?.textContent).toContain('sí llegó')
    await act(async () => {
      ;(boton as HTMLElement).dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
    })
    expect(api.quitarNoShow).toHaveBeenCalledWith('temprana')
  })

  it('🔴 el botón dice «marcar como enviados»: esta pantalla no manda nada', async () => {
    api.recordatorios = vi.fn(() =>
      Promise.resolve({
        disponible: true,
        motivo: null,
        visitas: [
          {
            visitId: 'v-9',
            visitaEn: '2026-09-20T20:00:00.000Z',
            correo: 'ana@ejemplo.com',
            telefono: null,
            mensaje: 'Ana: te recordamos tu visita…',
          },
        ],
      }),
    )
    await pintar()
    expect($('[data-testid="marcar-recordatorios"]')?.textContent).toContain(
      'Marcar como enviados',
    )
    expect(contenedor.textContent).toContain('NO envía')
  })

  it('sin permiso no ofrece ninguna acción', async () => {
    permisos.edit = false
    await pintar()
    expect($('[data-testid="no-show-temprana"]')).toBeNull()
  })
})
