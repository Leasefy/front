/**
 * PI-28 (Nico, 05-10-2026): la «Reparación / mantenimiento» del portal llega
 * también a Mantenimiento. El cajón de la PQRS lleva a su solicitud; a una
 * reparación vieja sin solicitud le ofrece crearla (una sola por PQRS: el back
 * devuelve la misma si ya existe).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

const api = vi.hoisted(() => ({
  detalle: vi.fn(),
  aMantenimiento: vi.fn(),
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k, formatDate: () => '5 oct 2026' }),
}))
vi.mock('@/lib/hooks/useInmobiliaria', () => ({ useAgentes: () => ({ agentes: [] }) }))
vi.mock('@/lib/api/pqrs-agencia.service', () => ({
  pqrsApi: {
    detalle: api.detalle,
    aMantenimiento: api.aMantenimiento,
    responsables: () => Promise.resolve([]),
    actualizar: vi.fn(),
  },
}))
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { PqrsDrawer } from './PqrsDrawer'
import type { Pqrs } from '@/lib/api/pqrs-agencia.types'

const REPARACION = {
  id: 'q-16',
  numero: 16,
  radicado: 'PQRS-0016',
  tipo: 'SOLICITUD',
  subtipo: 'REPARACION',
  solicitanteTipo: 'INQUILINO',
  solicitanteNombre: 'Iván Pérez',
  solicitanteContacto: null,
  asunto: 'Gotera en la cocina',
  descripcion: 'Cae agua del techo',
  consignacionId: 'cons-1',
  inmuebleLabel: 'Calle 45',
  asignadoAUserId: null,
  asignadoANombre: null,
  estado: 'RECIBIDA',
  slaVenceAt: '2026-10-27T12:00:00.000Z',
  resueltaAt: null,
  cerradaAt: null,
  createdAt: '2026-10-05T12:00:00.000Z',
  updatedAt: '2026-10-05T12:00:00.000Z',
} as unknown as Pqrs

const DETALLE = { historial: [], respuesta: null, adjuntos: [], tienePortal: true, historialDisponible: true }

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  api.detalle.mockReset()
  api.aMantenimiento.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  document.body.innerHTML = ''
})

async function abrir(pqrs: Pqrs) {
  await act(async () => {
    root.render(React.createElement(PqrsDrawer, { pqrs, open: true, onOpenChange: () => undefined, onActualizado: () => undefined }))
  })
  await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
}
const $ = (s: string) => document.querySelector<HTMLElement>(s)

describe('PI-28 · el cajón de la PQRS y su solicitud de Mantenimiento', () => {
  it('con solicitud: dice cuál y en qué va, y lleva a ESA solicitud en Mantenimiento', async () => {
    api.detalle.mockResolvedValue({ ...REPARACION, ...DETALLE, mantenimiento: { id: 'sol-1', titulo: 'Gotera en la cocina', estado: 'REPORTED' } })
    await abrir(REPARACION)
    expect($('[data-testid="pqrs-mantenimiento"]')!.textContent).toContain('«Gotera en la cocina» · Reportada')
    expect($('[data-testid="pqrs-ir-a-mantenimiento"]')!.getAttribute('href')).toBe('/panel/inmobiliaria/mantenimientos?solicitud=sol-1')
    expect($('[data-testid="pqrs-pasar-a-mantenimiento"]')).toBeNull()
  })

  it('una reparación sin solicitud ofrece crearla; al crearla se vuelve a leer y ya lleva a ella', async () => {
    api.detalle
      .mockResolvedValueOnce({ ...REPARACION, ...DETALLE, mantenimiento: null })
      .mockResolvedValue({ ...REPARACION, ...DETALLE, mantenimiento: { id: 'sol-1', titulo: 'Gotera en la cocina', estado: 'REPORTED' } })
    api.aMantenimiento.mockResolvedValue({ solicitud: { id: 'sol-1', titulo: 'Gotera en la cocina', estado: 'REPORTED' }, creada: true })
    await abrir(REPARACION)
    await act(async () => { $('[data-testid="pqrs-pasar-a-mantenimiento"]')!.click() })
    await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
    expect(api.aMantenimiento).toHaveBeenCalledWith('q-16')
    expect($('[data-testid="pqrs-ir-a-mantenimiento"]')).not.toBeNull()
  })

  it('una queja no tiene nada que ver con Mantenimiento', async () => {
    const queja = { ...REPARACION, tipo: 'QUEJA', subtipo: null } as unknown as Pqrs
    api.detalle.mockResolvedValue({ ...queja, ...DETALLE, mantenimiento: null })
    await abrir(queja)
    expect($('[data-testid="pqrs-mantenimiento"]')).toBeNull()
  })
})
