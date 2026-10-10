/**
 * «¿Cuáles publicas?» contra el back (Nico, 10-10-2026): qué inmuebles del
 * portafolio salen en el marketplace. Una sola puerta.
 */

import { apiClient } from '@/lib/api/client'

export interface InmuebleParaElegir {
  id: string
  titulo: string
  direccion: string | null
  ciudad: string | null
  barrio: string | null
  canonCop: number | null
  venta: boolean
  fotos: number
  publicado: boolean
  /** Publicado y disponible: sale hoy en el marketplace. */
  seVe: boolean
  /** Por qué no se vería aunque esté publicado: `null` si se vería. */
  porQueNoSeVe: string | null
}

export interface ListaParaElegir {
  /** `false` = la base todavía no tiene la migración: todo lo disponible sale. */
  disponible: boolean
  motivo: string | null
  resumen: {
    publicados: number
    noPublicados: number
    noPublicadosConFotos: number
    seVen: number
  }
  inmuebles: InmuebleParaElegir[]
}

export interface ResultadoDelCambio {
  publicar: boolean
  cambiados: number
  sinFotos: number
}

const BASE = '/inmobiliaria/inmuebles/marketplace'

export const marketplaceDelPortafolioApi = {
  async lista(filtro: { publicado?: boolean; lote?: string } = {}): Promise<ListaParaElegir> {
    const q = new URLSearchParams()
    if (filtro.publicado !== undefined) q.set('publicado', String(filtro.publicado))
    if (filtro.lote) q.set('lote', filtro.lote)
    const qs = q.toString()
    return apiClient.get<ListaParaElegir>(`${BASE}${qs ? `?${qs}` : ''}`)
  },

  /** La ficha del inmueble: ¿está publicado y se ve? */
  async uno(propertyId: string): Promise<{ disponible: boolean; inmueble: InmuebleParaElegir | null }> {
    return apiClient.get(`${BASE}/${propertyId}`)
  },

  async cambiar(cuerpo: {
    publicar: boolean
    propertyIds?: string[]
    lote?: string
    soloConFotos?: boolean
  }): Promise<ResultadoDelCambio> {
    return apiClient.post<ResultadoDelCambio>(BASE, cuerpo)
  },
}

/** La frase del resultado, para el aviso. */
export function fraseDelCambio(r: ResultadoDelCambio): string {
  const cuantos = `${r.cambiados} ${r.cambiados === 1 ? 'inmueble' : 'inmuebles'}`
  const base = r.publicar
    ? r.cambiados === 0
      ? 'No se publicó ningún inmueble.'
      : `Publicamos ${cuantos} en el marketplace.`
    : r.cambiados === 0
      ? 'No se quitó ningún inmueble.'
      : `Quitamos ${cuantos} del marketplace.`
  const sinFotos =
    r.sinFotos > 0
      ? ` ${r.sinFotos} ${r.sinFotos === 1 ? 'quedó' : 'quedaron'} sin publicar porque no ${r.sinFotos === 1 ? 'tiene' : 'tienen'} fotos.`
      : ''
  return `${base}${sinFotos}`
}
