/**
 * La pantalla «Recibos» (Juan, Portofino, 15-10-2026: «¿dónde se ven los
 * recibos de caja que se generaron? ¿y los egresos de la dispersión?»).
 *
 * `GET /inmobiliaria/recibos-de-caja/lista` es paginada y trae a quién (el
 * listado de siempre, `recibosDeCajaApi.listar`, devuelve todo sin nombres y lo
 * siguen usando otras pantallas). El PDF del recibo es el mismo papel del
 * portal del inquilino; el del egreso, el extracto de la liquidación.
 */
import { apiClient } from '@/lib/api/client'
import { descargarBlob } from '@/lib/reportes/exportables'

export type EstadoDeLosRecibos = 'vivos' | 'anulados' | 'todos'

export interface FiltrosDeLaListaDeRecibos {
  pagina?: number
  porPagina?: number
  /** Número del recibo o del contrato, inquilino, documento, inmueble o referencia. */
  q?: string
  desde?: string
  hasta?: string
  medio?: string
  estado?: EstadoDeLosRecibos
}

export interface FilaDeLaListaDeRecibos {
  id: string
  numero: number
  /** `AAAA-MM-DD`. */
  fecha: string
  valorCop: number
  interesesCop: number
  medio: string
  medioLegible: string
  referencia: string | null
  /** `AAAA-MM` de la cuota que pagó. */
  mes: string | null
  anulado: boolean
  anuladoAt: string | null
  motivoDeLaAnulacion: string | null
  inquilino: string | null
  documento: string | null
  inmueble: string | null
  contrato: { id: string; numero: number; externalId: string | null } | null
  cobroId: string | null
  cuotaId: string | null
}

export interface ListaDeRecibos {
  recibos: FilaDeLaListaDeRecibos[]
  total: number
  pagina: number
  porPagina: number
  /** Lo que suman los VIVOS que cumplen el filtro (todas las páginas). */
  totalCop: number
}

const BASE = '/inmobiliaria/recibos-de-caja'

export function consultaDeLaLista(f: FiltrosDeLaListaDeRecibos): string {
  const q = new URLSearchParams()
  if (f.pagina && f.pagina > 1) q.set('pagina', String(f.pagina))
  if (f.porPagina) q.set('porPagina', String(f.porPagina))
  const texto = f.q?.trim()
  if (texto) q.set('q', texto)
  if (f.desde) q.set('desde', f.desde)
  if (f.hasta) q.set('hasta', f.hasta)
  if (f.medio) q.set('medio', f.medio)
  if (f.estado && f.estado !== 'todos') q.set('estado', f.estado)
  const s = q.toString()
  return s ? `?${s}` : ''
}

export const listaDeRecibosApi = {
  lista(f: FiltrosDeLaListaDeRecibos): Promise<ListaDeRecibos> {
    return apiClient.get<ListaDeRecibos>(`${BASE}/lista${consultaDeLaLista(f)}`)
  },

  /** Baja el recibo en PDF (el anulado sale con el sello y el motivo). */
  async bajarPdf(recibo: { id: string; numero: number }): Promise<void> {
    const blob = await apiClient.getBlob(`${BASE}/${recibo.id}/pdf`)
    descargarBlob(blob, `recibo-de-caja-${recibo.numero}.pdf`)
  },

  /** El extracto de un giro al propietario: el «egreso» de la liquidación. */
  async bajarExtractoDelGiro(giro: { id: string; month: string; propietarioName: string }): Promise<void> {
    const blob = await apiClient.getBlob(`/inmobiliaria/dispersiones/${giro.id}/extracto.pdf`)
    const nombre = giro.propietarioName.normalize('NFD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase()
    descargarBlob(blob, `extracto-${giro.month}-${nombre || 'propietario'}.pdf`)
  },
}
