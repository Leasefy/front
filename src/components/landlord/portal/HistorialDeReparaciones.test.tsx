import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

/**
 * Nico, 12-10-2026: «ese historial puede ser muy grande, porque mejor no
 * metemos una tabla ahí con paginación? y con la posibilidad de ver todo el
 * detalle de lo que se hizo, con imágenes». Del detalle: sólo la cotización
 * aprobada y del proveedor sólo el nombre, en un cajón.
 */

const api = vi.hoisted(() => ({ historialDelPortal: vi.fn(), detalleDelPortal: vi.fn(), soporte: vi.fn() }))
vi.mock('@/lib/api/aprobaciones-de-reparacion.service', () => ({ aprobacionesDeReparacionApi: api }))

import { HistorialDeReparaciones } from './HistorialDeReparaciones'

const FILA = {
  id: 'ap1',
  solicitudId: 'sol1',
  estado: 'APROBADA',
  inmobiliaria: 'Nogal Inmobiliaria',
  inmueble: 'Calle 45 # 70-12 Apto 301',
  valorCop: 120_000,
  descontadoCop: 150_000,
  pedidaAt: '2026-10-04T15:00:00.000Z',
  decididaAt: '2026-10-04T16:00:00.000Z',
  anuladaAt: null,
  reparacion: { titulo: 'Goteo en la ducha', descripcion: 'La ducha gotea todo el día' },
  cotizacion: { proveedor: 'Plomería El Rayo', descripcion: 'Cambio del empaque', diasEstimados: 1 },
}

const DETALLE = {
  ...FILA,
  motivoDeRechazo: null,
  motivoDeAnulacion: null,
  motivoDeEmergencia: null,
  aviso: null,
  soporteNombre: null,
  reparacion: {
    titulo: 'Goteo en la ducha',
    descripcion: 'La ducha gotea todo el día',
    tipo: 'PLUMBING',
    prioridad: 'MEDIUM',
    estado: 'MAINT_COMPLETED',
    reportadaAt: '2026-10-03T15:00:00.000Z',
    fotos: ['https://firmada/reporte.jpg'],
  },
  cotizacion: { proveedor: 'Plomería El Rayo', valorCop: 120_000, descripcion: 'Cambio del empaque', diasEstimados: 1 },
  aCargoDe: { quien: 'PROPIETARIO', propietarioPct: null, inquilinoPct: null, motivo: 'Desgaste normal' },
  trabajo: {
    terminadoAt: '2026-10-04T20:00:00.000Z',
    notas: 'Se cambió el empaque y la llave completa.',
    fotos: ['https://firmada/trabajo-1.jpg', 'https://firmada/trabajo-2.jpg'],
    garantiaHasta: '2027-01-02',
  },
  sobrecosto: null,
}

let container: HTMLDivElement
let root: Root

async function pintar(total: number) {
  api.historialDelPortal.mockResolvedValue({ filas: [FILA], total, pagina: 1, porPagina: 10 })
  await act(async () => {
    root.render(<HistorialDeReparaciones recarga={0} />)
  })
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  api.historialDelPortal.mockReset()
  api.detalleDelPortal.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('el historial de reparaciones del propietario (Nico, 12-10)', () => {
  it('pide al back sólo la primera página y pinta cada reparación con su estado y su valor', async () => {
    await pintar(1)
    expect(api.historialDelPortal).toHaveBeenCalledWith(1, 10)
    const fila = container.querySelector('[data-testid="aprobacion-historial-APROBADA"]')
    expect(fila?.textContent).toContain('Goteo en la ducha')
    expect(fila?.textContent).toContain('Aprobada')
    expect(fila?.textContent).toContain('Se descuentan')
  })

  it('con 10 o menos no hay paginación', async () => {
    await pintar(10)
    expect(document.querySelector('[aria-label="Página siguiente"]')).toBeNull()
  })

  it('con más de 10, «Página siguiente» pide la página 2 al back', async () => {
    await pintar(23)
    const siguiente = document.querySelector('[aria-label="Página siguiente"]') as HTMLElement | null
    expect(siguiente).not.toBeNull()
    await act(async () => {
      siguiente!.click()
      await Promise.resolve()
    })
    expect(api.historialDelPortal).toHaveBeenLastCalledWith(2, 10)
  })

  it('sin nada decidido no pinta nada (el vacío lo dice la página)', async () => {
    api.historialDelPortal.mockResolvedValue({ filas: [], total: 0, pagina: 1, porPagina: 10 })
    await act(async () => {
      root.render(<HistorialDeReparaciones recarga={0} />)
    })
    expect(container.querySelector('[data-testid="historial-de-reparaciones"]')).toBeNull()
  })

  it('una fila abre el cajón con el detalle completo: lo reportado, la cotización con el nombre del proveedor, lo hecho y las fotos', async () => {
    await pintar(1)
    api.detalleDelPortal.mockResolvedValue(DETALLE)
    await act(async () => {
      ;(container.querySelector('[data-testid="aprobacion-historial-APROBADA"]') as HTMLElement).click()
      await Promise.resolve()
    })
    expect(api.detalleDelPortal).toHaveBeenCalledWith('ap1')

    const cajon = document.querySelector('[data-testid="detalle-de-la-reparacion"]') as HTMLElement
    expect(cajon).not.toBeNull()
    const texto = cajon.textContent ?? ''
    expect(texto).toContain('Plomería · Prioridad media')
    expect(texto).toContain('Plomería El Rayo')
    expect(texto).toContain('Se cambió el empaque y la llave completa.')
    expect(texto).toContain('Garantía hasta el 2 de enero de 2027')
    expect(texto).toContain('Por qué: Desgaste normal')
    // Una foto del reporte y dos del trabajo terminado, que se abren en grande.
    expect(cajon.querySelectorAll('[data-testid="foto-de-la-reparacion"]')).toHaveLength(3)
  })
})
