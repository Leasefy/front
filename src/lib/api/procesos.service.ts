/**
 * El centro de procesos — `/inmobiliaria/procesos`.
 *
 * Nico (22-09-2026): «creemos un CENTRO DE PROCESOS para esas cargas y
 * descargas de todos los documentos que tenemos en la plataforma». Todo lo
 * largo que se lanza —reprocesar asientos, el archivo del lote al banco, la
 * emisión del mes, las cargas de la migración, una exportación— queda acá con
 * su avance, quién lo lanzó y el archivo que dejó.
 */

import { apiClient } from '@/lib/api/client'
import { invalidar } from './refresco-de-datos'
import type {
  DescargaDeProceso,
  FiltrosDeProcesos,
  ListaDeProcesos,
  Proceso,
} from './procesos.types'

export const BASE_DE_PROCESOS = '/inmobiliaria/procesos'

/** El recurso que escucha el centro (`useRefrescoAutomatico` / `alCambiar`). */
export const RECURSO_DE_PROCESOS = 'procesos'

/** Con qué nombre el back cuelga un proceso de un lote (`lotes.controller.ts#RECURSO_LOTE`). */
export const RECURSO_LOTE = 'LOTE_DE_DISPERSION'

function consulta(filtros: FiltrosDeProcesos | Record<string, string | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(filtros)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

/**
 * «Acabo de lanzar algo largo»: el centro deja de consultar cada minuto y
 * pasa a mirar seguido un rato, para que el anillo del header aparezca
 * mientras el proceso corre y no cuando ya terminó.
 *
 * Se llama ANTES de esperar la respuesta del proceso — la fila del centro
 * nace en el back apenas empieza, pero la respuesta llega cuando termina.
 */
export function anunciarProceso(): void {
  invalidar(RECURSO_DE_PROCESOS)
}

export const procesosApi = {
  listar(filtros: FiltrosDeProcesos = {}): Promise<ListaDeProcesos> {
    return apiClient.get<ListaDeProcesos>(`${BASE_DE_PROCESOS}${consulta(filtros)}`)
  },
  ver(id: string): Promise<Proceso> {
    return apiClient.get<Proceso>(`${BASE_DE_PROCESOS}/${id}`)
  },
  /** URL firmada de una hora que baja el archivo con su nombre. */
  descarga(id: string): Promise<DescargaDeProceso> {
    return apiClient.get<DescargaDeProceso>(`${BASE_DE_PROCESOS}/${id}/descarga`)
  },
  cancelar(id: string): Promise<Proceso> {
    return apiClient.post<Proceso>(`${BASE_DE_PROCESOS}/${id}/cancelar`, {})
  },
  /**
   * El libro contable del rango, armado EN SEGUNDO PLANO: responde de una con
   * el id y el archivo aparece en el centro cuando está.
   */
  exportarLibro(rango: { desde?: string; hasta?: string } = {}): Promise<{ procesoId: string }> {
    anunciarProceso()
    return apiClient.post<{ procesoId: string }>(
      `/inmobiliaria/contabilidad/reportes/libro.csv/exportar${consulta(rango)}`,
      {},
    )
  },
}
