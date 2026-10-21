/**
 * Los pasos de la barra de avance (`AvanceDeLaSolicitud`) para cada cosa que
 * sigue una persona desde su portal (Portofino, 21-10-2026).
 */
import type { PqrsEstado } from '@/lib/types/tenant-case'
import type { PasoDelAvance } from '@/components/estado/AvanceDeLaSolicitud'

export interface AvanceCalculado {
  pasos: PasoDelAvance[]
  actual: number
  detenida: string | null
}

/** Una PQRS o una reparación radicada por el inquilino. */
export function avanceDeLaPqrs(estado: PqrsEstado, esReparacion: boolean): AvanceCalculado {
  const conCotizacion = esReparacion || estado === 'en_cotizacion'
  const pasos: PasoDelAvance[] = [
    { clave: 'recibida', nombre: 'Recibida' },
    { clave: 'asignada', nombre: 'En revisión' },
    ...(conCotizacion ? [{ clave: 'en_cotizacion', nombre: 'En cotización' }] : []),
    { clave: 'en_proceso', nombre: 'En proceso' },
    { clave: 'resuelta', nombre: 'Resuelta' },
  ]
  const clave = estado === 'cerrada' ? 'resuelta' : estado
  const actual = Math.max(0, pasos.findIndex((p) => p.clave === clave))
  return { pasos, actual, detenida: null }
}

type EstadoDelMantenimiento = 'reported' | 'quoted' | 'approved' | 'in_progress' | 'completed' | 'cancelled'

/** Una solicitud de mantenimiento (los estados del tablero de la inmobiliaria). */
export function avanceDelMantenimiento(
  estado: EstadoDelMantenimiento,
  iba: Exclude<EstadoDelMantenimiento, 'completed' | 'cancelled'> = 'quoted',
): AvanceCalculado {
  const pasos: PasoDelAvance[] = [
    { clave: 'reported', nombre: 'Reportada' },
    { clave: 'quoted', nombre: 'Cotizada' },
    { clave: 'approved', nombre: 'Aprobada' },
    { clave: 'in_progress', nombre: 'En arreglo' },
    { clave: 'completed', nombre: 'Terminada' },
  ]
  if (estado === 'cancelled') {
    return { pasos, actual: pasos.findIndex((p) => p.clave === iba), detenida: 'No aprobada' }
  }
  return { pasos, actual: Math.max(0, pasos.findIndex((p) => p.clave === estado)), detenida: null }
}
