/**
 * Reglas puras de la agenda: qué le falta a una tarea, a dónde lleva el
 * vínculo de un evento, y las fechas de calendario que no corren de día.
 */
import { describe, it, expect } from 'vitest'
import { validarTarea, TAREA_VACIA } from './NuevaTareaDrawer'
import { hrefDelVinculo } from './EventoAgendaDrawer'
import { aFechaIso, fechaLocal } from '@/lib/fechas-locales'
import type { EventoAgenda } from '@/lib/api/agenda.types'

describe('validarTarea', () => {
  it('pide título y día; nada más es obligatorio', () => {
    expect(Object.keys(validarTarea(TAREA_VACIA)).sort()).toEqual(['fecha', 'titulo'])
    expect(validarTarea({ ...TAREA_VACIA, titulo: 'Recoger llaves', fecha: '2026-09-10' })).toEqual({})
  })
})

describe('hrefDelVinculo', () => {
  const base = { id: 'x', origen: 'usuario', estado: 'pendiente', titulo: 't', fecha: '2026-09-10T10:00:00' } as const
  it('una tarea atada a un inmueble abre la ficha del mandato; una visita no abre nada', () => {
    const tarea = { ...base, tipo: 'tarea', vinculoTipo: 'propiedad', vinculoId: 'c-1' } as unknown as EventoAgenda
    expect(hrefDelVinculo(tarea)).toBe('/panel/inmobiliaria/inmuebles/c-1')
    const visita = { ...base, tipo: 'visita', vinculoTipo: 'propiedad', vinculoId: 'p-1' } as unknown as EventoAgenda
    expect(hrefDelVinculo(visita)).toBeNull()
  })
  it('una firma pendiente abre el contrato', () => {
    const firma = { ...base, tipo: 'firma_pendiente', vinculoTipo: 'contrato', vinculoId: 'k-1' } as unknown as EventoAgenda
    expect(hrefDelVinculo(firma)).toBe('/panel/inmobiliaria/contratos/k-1')
  })
})

describe('fechas locales', () => {
  it('ida y vuelta sin correr el día por la zona horaria', () => {
    const d = fechaLocal('2026-10-01')!
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 1])
    expect(aFechaIso(d)).toBe('2026-10-01')
    expect(fechaLocal('2026-10-01T10:00:00')?.getDate()).toBe(1)
    expect(fechaLocal('')).toBeNull()
  })
})
