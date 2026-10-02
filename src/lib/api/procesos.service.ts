/**
 * El centro de procesos — `/inmobiliaria/procesos`.
 *
 * Nico (22-09-2026): «creemos un CENTRO DE PROCESOS para esas cargas y
 * descargas de todos los documentos que tenemos en la plataforma». Todo lo
 * largo que se lanza —reprocesar asientos, el archivo del lote al banco, la
 * emisión del mes, las cargas de la migración, una exportación— queda acá con
 * su avance, quién lo lanzó y el archivo que dejó.
 */

import { ApiError, apiClient, fetchConSesion } from '@/lib/api/client'
import type { TipoDeExport } from '@/lib/reportes/exportables'
import { invalidar } from './refresco-de-datos'

/** Un reporte del zip de `exportarReportes`: el tipo y lo que acepta su export. */
export interface PedidoDeReporte {
  tipo: TipoDeExport
  period?: string
  month?: string
  desde?: string
  hasta?: string
}
import type {
  DescargaDeProceso,
  FiltrosDeProcesos,
  ListaDeProcesos,
  Proceso,
  TipoDeProceso,
} from './procesos.types'

export const BASE_DE_PROCESOS = '/inmobiliaria/procesos'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'

/** Los tipos que el navegador puede abrir por su cuenta (`TIPOS_DEL_NAVEGADOR` del back). */
export type TipoDelNavegador = Extract<
  TipoDeProceso,
  'EXPORTACION' | 'CARGA' | 'ENVIO_MASIVO' | 'GENERACION' | 'APROBACION_MASIVA'
>

/** Lo que el navegador manda al cerrar su proceso. */
export interface CierreDelNavegador {
  /** El archivo que armó (xlsx, CSV, ZIP, PDF, texto o JSON). */
  archivo?: Blob
  /** Con qué nombre se baja. Sin él: `archivo`. */
  nombreDelArchivo?: string
  mensaje?: string
  /** Un título mejor que el de la salida, si sólo al final se sabe. */
  titulo?: string
}

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
export function anunciarProceso(aviso: AvisoDeProceso = {}): void {
  invalidar(RECURSO_DE_PROCESOS)
  for (const cb of [...oyentesDelCentro]) {
    try {
      cb({ tipo: 'anuncio', ...aviso })
    } catch {
      /* un oyente roto no frena a los demás */
    }
  }
}

/**
 * 🔴 Que el centro SE HAGA PRESENTE (Nico, 22-09: «mandé a emitir algo y el
 * centro de procesos ni se abrió»). Quien lanza un proceso lo anuncia y el
 * botón del header se abre solo con ese proceso arriba —o, si la persona está
 * en medio de un diálogo, muestra un aviso con «Ver en el centro»—.
 */
export interface AvisoDeProceso {
  /** Cómo se llama lo que arrancó, para el aviso: «Emitiendo 450 facturas». */
  titulo?: string
  /** El proceso a resaltar, si ya se sabe. */
  procesoId?: string | null
  /**
   * De qué tipo es lo que arrancó (`EMISION_DE_FACTURAS`…). Con él, el
   * «Arrancando…» del centro se apaga en cuanto aparece un proceso NUEVO de
   * ese tipo, aunque ya haya terminado (`anuncioResuelto`).
   */
  tipoDeProceso?: string
}

export type EventoDelCentro = ({ tipo: 'anuncio' } | { tipo: 'abrir' }) & AvisoDeProceso

const oyentesDelCentro = new Set<(e: EventoDelCentro) => void>()

/** Lo escucha el botón del header. Devuelve cómo dejar de escuchar. */
export function alEventoDelCentro(cb: (e: EventoDelCentro) => void): () => void {
  oyentesDelCentro.add(cb)
  return () => {
    oyentesDelCentro.delete(cb)
  }
}

/** Abre el centro (el «Ver en el centro» de un toast), resaltando un proceso. */
export function abrirCentroDeProcesos(aviso: AvisoDeProceso = {}): void {
  for (const cb of [...oyentesDelCentro]) cb({ tipo: 'abrir', ...aviso })
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

  // ── El proceso del navegador ─────────────────────────────────────────────
  // Para lo que arma la pestaña o los bucles que maneja ella. Úsalos a través
  // de `correrEnElNavegador` (`@/lib/procesos/en-el-centro`), no sueltos: ése
  // es el que anuncia, registra «Detener», limita el avance y cierra siempre.

  /** Abre un proceso del navegador. 503 si el back no tiene la migración. */
  crear(datos: { tipo: TipoDelNavegador; titulo: string; total?: number }): Promise<{ procesoId: string }> {
    return apiClient.post<{ procesoId: string }>(BASE_DE_PROCESOS, {
      tipo: datos.tipo,
      titulo: datos.titulo.slice(0, 300),
      ...(datos.total !== undefined ? { total: Math.max(0, Math.floor(datos.total)) } : {}),
    })
  },
  /** Cuenta el avance. `cancelado: true` = alguien pidió cancelarlo desde el centro. */
  avance(
    id: string,
    datos: { hechos: number; total?: number; mensaje?: string },
  ): Promise<{ cancelado: boolean }> {
    return apiClient.post<{ cancelado: boolean }>(`${BASE_DE_PROCESOS}/${id}/avance`, {
      hechos: Math.max(0, Math.floor(datos.hechos)),
      ...(datos.total !== undefined ? { total: Math.max(0, Math.floor(datos.total)) } : {}),
      ...(datos.mensaje !== undefined ? { mensaje: datos.mensaje.slice(0, 2000) } : {}),
    })
  },
  /**
   * Lo cierra, con el archivo que armó si dejó uno. Multipart: `apiClient`
   * sólo manda JSON, así que va por `fetchConSesion` (token y un reintento
   * si el token venció en medio de un trabajo largo).
   */
  async terminar(id: string, cierre: CierreDelNavegador = {}): Promise<Proceso> {
    const form = new FormData()
    if (cierre.archivo) {
      // Un `File` con nombre, no el Blob suelto: multer toma `originalname` de
      // ahí y es el nombre con que se baja desde el centro.
      const nombre = cierre.nombreDelArchivo || 'archivo'
      form.append('archivo', new File([cierre.archivo], nombre, { type: cierre.archivo.type }))
    }
    if (cierre.mensaje) form.append('mensaje', cierre.mensaje.slice(0, 2000))
    if (cierre.titulo) form.append('titulo', cierre.titulo.slice(0, 300))
    let res: Response
    try {
      res = await fetchConSesion(`${BACKEND_URL}${BASE_DE_PROCESOS}/${id}/terminar`, {
        method: 'POST',
        body: form,
      })
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err)
      throw new ApiError(0, `No pudimos conectarnos al servidor. ${raw}`)
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string | string[]; code?: string }
      throw new ApiError(res.status, body.message || `No se pudo cerrar el proceso (${res.status}).`, body.code)
    }
    return res.json() as Promise<Proceso>
  },
  /** Falló. El mensaje es lo que la persona lee en el centro: en palabras. */
  fallar(id: string, mensaje: string): Promise<Proceso> {
    return apiClient.post<Proceso>(`${BASE_DE_PROCESOS}/${id}/fallar`, {
      mensaje: (mensaje || 'El proceso falló sin decir por qué.').slice(0, 2000),
    })
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
  /**
   * Varios reportes del portafolio en UN zip, armado en el centro (Nico,
   * 01-10: «esas cargas ¿por qué no las metes al centro de procesos?»). Cada
   * reporte lleva los mismos parámetros que su `GET /reports/export`.
   */
  exportarReportes(reportes: PedidoDeReporte[]): Promise<{ procesoId: string }> {
    anunciarProceso({
      titulo: reportes.length === 1 ? 'Exportando 1 reporte' : `Exportando ${reportes.length} reportes`,
      tipoDeProceso: 'EXPORTACION',
    })
    return apiClient.post<{ procesoId: string }>('/inmobiliaria/reports/exportar', { reportes })
  },
}
