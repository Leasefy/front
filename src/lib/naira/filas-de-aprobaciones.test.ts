/**
 * filas-de-aprobaciones.test.ts — las propuestas de acción y los cambios de modo en UNA tabla (Nico, 18-10-2026): por
 * decidir y decididas, el orden del servidor intacto para las acciones y los cambios intercalados por fecha.
 */

import { describe, expect, it } from 'vitest'

import type { CambioDeModo } from '@/lib/api/naira/cambios-de-modo'
import type { NairaActionSummary } from '@/lib/api/naira/contrato'
import { EJEMPLOS_DE_NAIRA } from '@/lib/data/mock-naira'

import { filasDeAprobaciones, paginaDe } from './filas-de-aprobaciones'

const BASE = EJEMPLOS_DE_NAIRA['acciones.lista'].acciones[0] as NairaActionSummary
const accion = (proposalId: string, estado: NairaActionSummary['estado'], venceEn: string, propuestaEn = '2026-10-10T00:00:00.000Z'): NairaActionSummary => ({
  ...BASE,
  proposalId,
  estado,
  venceEn,
  propuestaEn,
})
const cambio = (id: string, estado: CambioDeModo['estado'], expiraEn: string, propuestoEn = '2026-10-10T00:00:00.000Z'): CambioDeModo => ({
  id,
  agente: 'calidad',
  nombre: 'Niti',
  de: 'copiloto',
  a: 'sombra',
  regla: 'manual',
  cifras: { esperando: 60, dias: 7 },
  porQue: '',
  propuestoEn,
  expiraEn,
  estado,
  razon: null,
})
const ids = (filas: ReturnType<typeof filasDeAprobaciones>['porDecidir']) => filas.map((f) => (f.kind === 'accion' ? f.accion.proposalId : f.cambio.id))

describe('filasDeAprobaciones', () => {
  it('separa por decidir y decididas; las acciones quedan en el orden del servidor aunque sus fechas no lo estén', () => {
    const acciones = [accion('A3', 'pendiente', '2026-10-20T00:00:00Z'), accion('A1', 'aprobada', '2026-10-01T00:00:00Z'), accion('A2', 'vencible', '2026-10-15T00:00:00Z')]
    const { porDecidir, decididas } = filasDeAprobaciones(acciones, null)
    expect(ids(porDecidir)).toEqual(['A3', 'A2'])
    expect(ids(decididas)).toEqual(['A1'])
  })

  it('un cambio de modo abierto entra antes de la primera acción que vence después; uno decidido, por fecha (lo nuevo primero)', () => {
    const acciones = [
      accion('A1', 'pendiente', '2026-10-16T00:00:00Z'),
      accion('A2', 'pendiente', '2026-10-30T00:00:00Z'),
      accion('A3', 'rechazada', '2026-10-01T00:00:00Z', '2026-10-12T00:00:00Z'),
      accion('A4', 'ejecutada', '2026-10-01T00:00:00Z', '2026-10-05T00:00:00Z'),
    ]
    const cambios = [cambio('M1', 'abierto', '2026-10-25T00:00:00Z'), cambio('M2', 'aplicado', '2026-10-20T00:00:00Z', '2026-10-08T00:00:00Z')]
    const { porDecidir, decididas } = filasDeAprobaciones(acciones, cambios)
    expect(ids(porDecidir)).toEqual(['A1', 'M1', 'A2'])
    expect(ids(decididas)).toEqual(['A3', 'M2', 'A4'])
  })

  it('sin cambios (null: sin permiso) solo están las acciones; la página corta bien', () => {
    expect(filasDeAprobaciones([], null)).toEqual({ porDecidir: [], decididas: [] })
    expect(paginaDe([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4])
    expect(paginaDe([1, 2, 3], 0, 2)).toEqual([1, 2])
  })
})
