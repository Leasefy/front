/**
 * Orden de la tabla de rentabilidad por inmueble.
 *
 * Vive fuera de la página porque `page.tsx` sólo puede exportar la página
 * (Next lo verifica en el build) y el orden se prueba solo.
 */

import type { RentabilidadFila } from '@/lib/types/inmobiliaria'

export type ColumnaDeRentabilidad =
  | 'inmueble'
  | 'canon'
  | 'ocupacion'
  | 'recaudado'
  | 'comision'
  | 'gastos'
  | 'neto'
  | 'rentabilidad'

export type Direccion = 'asc' | 'desc'

export interface OrdenDeRentabilidad {
  columna: ColumnaDeRentabilidad
  direccion: Direccion
}

export const ORDEN_INICIAL: OrdenDeRentabilidad = { columna: 'neto', direccion: 'desc' }

/** El valor por el que se ordena cada columna. `null` va siempre al final. */
const VALOR_DE: Record<ColumnaDeRentabilidad, (f: RentabilidadFila) => number | string | null> = {
  inmueble: (f) => f.propertyTitle,
  canon: (f) => (f.canonDesconocido ? null : f.canonCop),
  ocupacion: (f) => f.ocupacionPct,
  recaudado: (f) => f.recaudadoCop,
  comision: (f) => f.comisionCop,
  gastos: (f) => f.gastosMantenimientoCop,
  neto: (f) => f.netoPropietarioCop,
  rentabilidad: (f) => f.rentabilidadNetaAnualPct,
}

export function ordenarFilas(filas: RentabilidadFila[], orden: OrdenDeRentabilidad): RentabilidadFila[] {
  const valor = VALOR_DE[orden.columna]
  const signo = orden.direccion === 'asc' ? 1 : -1
  return [...filas].sort((a, b) => {
    const va = valor(a)
    const vb = valor(b)
    if (va === null && vb === null) return 0
    if (va === null) return 1
    if (vb === null) return -1
    if (typeof va === 'string' || typeof vb === 'string') {
      return signo * String(va).localeCompare(String(vb), 'es')
    }
    return signo * (va - vb)
  })
}

/** Clic en un encabezado: la misma columna alterna; otra arranca en su orden natural. */
export function alternarOrden(prev: OrdenDeRentabilidad, columna: ColumnaDeRentabilidad): OrdenDeRentabilidad {
  if (prev.columna === columna) {
    return { columna, direccion: prev.direccion === 'asc' ? 'desc' : 'asc' }
  }
  return { columna, direccion: columna === 'inmueble' ? 'asc' : 'desc' }
}
