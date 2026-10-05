import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

/**
 * 🔴 #14 «El propietario escoge» (MANOS-1, 04-10-2026) · «Escoger inquilino»
 * en el portal del propietario. El propietario ve a sus candidatos —sin
 * puntaje ni datos de contacto, el estudio en palabras— y escoge uno, o dice
 * que ninguno le sirve. Escoger NO adjudica: la inmobiliaria lo hace con un
 * clic en su Bandeja.
 */

const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast }))

const api = vi.hoisted(() => ({ delPortal: vi.fn(), escoger: vi.fn(), ninguno: vi.fn() }))
vi.mock('@/lib/api/elecciones-de-inquilino.service', () => ({ eleccionesDeInquilinoApi: api }))

import { ApiError } from '@/lib/api/client'
import EscogerInquilinoPage from './page'

const PENDIENTE = {
  id: 'el1',
  estado: 'PENDIENTE',
  inmobiliaria: 'Inmobiliaria Uno',
  inmueble: 'Apto 101 · Calle 10 # 43-12',
  canonCop: 1_500_000,
  pedidaAt: '2026-10-04T15:00:00.000Z',
  decididaAt: null,
  escogido: null,
  motivo: null,
  candidatos: [
    {
      applicationId: 'app-a',
      nombre: 'Ana Gómez',
      deQueVive: 'Empleada · Contadora',
      ingresosCop: 6_000_000,
      personasACargo: 1,
      estudio: 'Sin estudio de arrendamiento (es opcional).',
      postuladoEl: '2026-10-01T12:00:00.000Z',
    },
    {
      applicationId: 'app-b',
      nombre: 'Bruno Díaz',
      deQueVive: null,
      ingresosCop: null,
      personasACargo: 0,
      estudio: 'Tiene estudio de arrendamiento aprobado.',
      postuladoEl: null,
    },
  ],
}

const HISTORIAL = {
  ...PENDIENTE,
  id: 'el0',
  estado: 'ESCOGIDA',
  inmueble: 'Casa 7',
  decididaAt: '2026-09-20T15:00:00.000Z',
  escogido: 'Carla Ruiz',
  candidatos: [],
}

let container: HTMLDivElement
let root: Root

async function montar() {
  await act(async () => {
    root.render(<EscogerInquilinoPage />)
  })
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  toast.success.mockClear()
  toast.error.mockClear()
  api.delPortal.mockReset()
  api.escoger.mockReset()
  api.ninguno.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const q = (sel: string) => container.querySelector(sel) as HTMLElement | null
const qa = (sel: string) => Array.from(container.querySelectorAll(sel)) as HTMLElement[]

async function clic(sel: string) {
  await act(async () => {
    q(sel)!.click()
    await Promise.resolve()
  })
}

async function escribir(sel: string, valor: string) {
  const el = q(sel) as HTMLTextAreaElement
  await act(async () => {
    const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
    set.call(el, valor)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('Escoger inquilino — lo que ve el propietario', () => {
  it('cada candidato con de qué vive, lo que declara ganar y el estudio en palabras; sin puntaje ni contacto', async () => {
    api.delPortal.mockResolvedValue({ pendientes: [PENDIENTE], historial: [] })
    await montar()

    const candidatos = qa('[data-testid="candidato"]')
    expect(candidatos).toHaveLength(2)
    const ana = candidatos[0].textContent ?? ''
    expect(ana).toContain('Ana Gómez')
    expect(ana).toContain('Empleada · Contadora')
    expect(ana).toMatch(/Declara ganar \$\s?6\.000\.000 al mes/)
    expect(ana).toContain('1 persona a cargo')
    expect(ana).toContain('Sin estudio de arrendamiento (es opcional).')
    expect(candidatos[1].textContent).toContain('No declaró sus ingresos')
    // Cero personas a cargo se dice en palabras (la prueba de punta a punta mostraba «0 personas a cargo»).
    expect(candidatos[1].textContent).toContain('Sin personas a cargo')
    expect(candidatos[1].textContent).not.toContain('0 personas')
    // Nada de puntajes ni datos de contacto (F-07).
    const todo = container.textContent ?? ''
    expect(todo).not.toMatch(/puntaje|score|@|\+57/i)
    expect(todo).toMatch(/Canon \$\s?1\.500\.000/)
    expect(todo).toContain('4 de octubre de 2026')
  })

  it('escoger manda la postulación y avisa que la inmobiliaria adjudica (no adjudica sola)', async () => {
    api.delPortal.mockResolvedValueOnce({ pendientes: [PENDIENTE], historial: [] })
    api.delPortal.mockResolvedValueOnce({ pendientes: [], historial: [{ ...PENDIENTE, estado: 'ESCOGIDA', escogido: 'Ana Gómez', candidatos: [] }] })
    api.escoger.mockResolvedValue({ ...PENDIENTE, estado: 'ESCOGIDA' })
    await montar()

    await clic('[data-testid="escoger-app-a"]')

    expect(api.escoger).toHaveBeenCalledWith('el1', 'app-a')
    expect(toast.success).toHaveBeenCalledTimes(1)
    expect(String(toast.success.mock.calls[0][0])).toBe('Escogiste a Ana Gómez')
    expect(String(toast.success.mock.calls[0][1]?.description)).toMatch(/Inmobiliaria Uno ya lo sabe y le adjudica/)
    // Vuelve a leer: ya está en el historial.
    expect(api.delPortal).toHaveBeenCalledTimes(2)
    expect(q('[data-testid="eleccion-historial-ESCOGIDA"]')?.textContent).toContain('Ana Gómez')
  })

  it('«Ninguno me sirve» pide el motivo antes de mandar y lo manda', async () => {
    api.delPortal.mockResolvedValue({ pendientes: [PENDIENTE], historial: [] })
    api.ninguno.mockResolvedValue({ ...PENDIENTE, estado: 'NINGUNO' })
    await montar()

    expect(q('[data-testid="eleccion-motivo"]')).toBeNull()
    await clic('[data-testid="eleccion-ninguno"]')
    await clic('[data-testid="eleccion-confirmar-ninguno"]')
    expect(api.ninguno).not.toHaveBeenCalled()
    expect(q('#motivo-el1-error')?.textContent).toMatch(/Cuéntanos en una frase/)

    await escribir('[data-testid="eleccion-motivo"]', 'Quiero a alguien sin mascotas')
    await clic('[data-testid="eleccion-confirmar-ninguno"]')
    expect(api.ninguno).toHaveBeenCalledWith('el1', 'Quiero a alguien sin mascotas')
    expect(String(toast.success.mock.calls[0][0])).toMatch(/ninguno te sirve/)
  })

  it('🔴 un 409 al escoger (ya no está pendiente) se dice con la frase del back, sin «conexión»', async () => {
    api.delPortal.mockResolvedValue({ pendientes: [PENDIENTE], historial: [] })
    api.escoger.mockRejectedValue(
      new ApiError(409, 'Esta elección ya no está esperando tu respuesta.', 'ELECCION_NO_PENDIENTE', {
        statusCode: 409,
        code: 'ELECCION_NO_PENDIENTE',
        message: 'Esta elección ya no está esperando tu respuesta.',
      }),
    )
    await montar()
    await clic('[data-testid="escoger-app-b"]')

    expect(toast.error).toHaveBeenCalledTimes(1)
    const descripcion = String(toast.error.mock.calls[0][1]?.description)
    expect(descripcion).toContain('ya no está esperando tu respuesta')
    expect(descripcion).not.toMatch(/conexi[oó]n/)
  })

  it('sin nada que escoger, lo dice en palabras', async () => {
    api.delPortal.mockResolvedValue({ pendientes: [], historial: [] })
    await montar()
    expect(q('[data-testid="elecciones-vacio"]')?.textContent).toMatch(/No tienes candidatos por escoger/)
  })

  it('el historial dice qué pasó, con la fecha en palabras', async () => {
    api.delPortal.mockResolvedValue({ pendientes: [], historial: [HISTORIAL] })
    await montar()
    const fila = q('[data-testid="eleccion-historial-ESCOGIDA"]')?.textContent ?? ''
    expect(fila).toContain('Ya escogiste: tu inmobiliaria lo adjudica')
    expect(fila).toContain('Carla Ruiz')
    expect(fila).toContain('20 de septiembre de 2026')
  })
})
