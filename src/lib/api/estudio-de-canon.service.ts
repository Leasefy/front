/**
 * estudio-de-canon.service.ts — client for the free document study
 * (T-0193, contract §3.1 A). All routes are back-side, TENANT JWT:
 *
 *   POST /calificacion-leasefy/estudio                 { autorizo: true }
 *   POST /calificacion-leasefy/estudio/:id/documentos  multipart { file, tipo }
 *   POST /calificacion-leasefy/estudio/:id/iniciar
 *   GET  /calificacion-leasefy/estudio/actual          → { estudio | null }
 *
 * Every failure becomes an `EstudioDeCanonError` whose `message` is already
 * user-facing Spanish (see `mensajeDelErrorDelEstudio`) and whose `code` is the
 * stable back key, so screens branch on `code`, never on text.
 */

import { ApiError, apiClient, errorDeDemasiadasSolicitudes, fetchConSesion } from '@/lib/api/client'
import {
  mensajeDelErrorDelEstudio,
  parseEstudio,
  parseEstudioActual,
  TIPOS_OBLIGATORIOS,
  type EstudioDeCanon,
  type TipoDeDocumento,
  type TipoObligatorio,
} from '@/lib/api/estudio-de-canon.types'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'
const BASE = '/calificacion-leasefy/estudio'

export class EstudioDeCanonError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    /** Required documents the back says are missing (DOCUMENTOS_FALTANTES). */
    public faltan?: TipoObligatorio[],
  ) {
    super(message)
    this.name = 'EstudioDeCanonError'
  }
}

function faltanDelCuerpo(cuerpo: Record<string, unknown> | undefined): TipoObligatorio[] | undefined {
  const f = cuerpo?.faltan
  if (!Array.isArray(f)) return undefined
  return f.filter((t): t is TipoObligatorio => TIPOS_OBLIGATORIOS.includes(t as TipoObligatorio))
}

function aErrorDelEstudio(err: unknown): EstudioDeCanonError {
  if (err instanceof EstudioDeCanonError) return err
  if (err instanceof ApiError) {
    return new EstudioDeCanonError(
      err.status,
      mensajeDelErrorDelEstudio(err.code, err.status < 500 ? err.message : undefined),
      err.code,
      faltanDelCuerpo(err.detalle),
    )
  }
  return new EstudioDeCanonError(0, mensajeDelErrorDelEstudio(undefined))
}

function estudioONada(raw: unknown): EstudioDeCanon {
  const e = parseEstudio(raw)
  if (!e) throw new EstudioDeCanonError(502, mensajeDelErrorDelEstudio('ESTUDIO_FALLIDO'), 'ESTUDIO_FALLIDO')
  return e
}

async function envuelto<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    throw aErrorDelEstudio(err)
  }
}

export const estudioDeCanonApi = {
  /** The caller's most recent study (any status), or `null`. A GET on a PROCESSING study makes the back poll the agent. */
  actual(): Promise<EstudioDeCanon | null> {
    return envuelto(async () => parseEstudioActual(await apiClient.get<unknown>(`${BASE}/actual`)))
  },

  /** Creates (or reuses the DRAFT of) a study. Sends consent verbatim: `autorizo` must be `true`. */
  crear(): Promise<EstudioDeCanon> {
    return envuelto(async () => estudioONada(await apiClient.post<unknown>(BASE, { autorizo: true })))
  },

  /** Uploads one document; the same `tipo` again replaces the previous file. */
  subirDocumento(estudioId: string, tipo: TipoDeDocumento, file: File): Promise<EstudioDeCanon> {
    return envuelto(async () => {
      const formulario = new FormData()
      formulario.append('file', file)
      formulario.append('tipo', tipo)
      let res: Response
      try {
        // No Content-Type header: the browser sets the multipart boundary.
        res = await fetchConSesion(`${BACKEND_URL}${BASE}/${encodeURIComponent(estudioId)}/documentos`, {
          method: 'POST',
          body: formulario,
        })
      } catch {
        throw new EstudioDeCanonError(
          0,
          'No pudimos conectarnos. Revisa tu conexión e intenta subir el archivo de nuevo.',
        )
      }
      if (res.status === 429) throw await errorDeDemasiadasSolicitudes(res)
      const cuerpo = (await res.json().catch(() => ({}))) as Record<string, unknown>
      if (!res.ok) {
        const mensaje = Array.isArray(cuerpo.message)
          ? (cuerpo.message as string[]).join(' · ')
          : typeof cuerpo.message === 'string'
            ? cuerpo.message
            : `Error ${res.status}`
        throw new ApiError(res.status, mensaje, typeof cuerpo.code === 'string' ? cuerpo.code : undefined, cuerpo)
      }
      return estudioONada(cuerpo)
    })
  },

  /** Starts the agent run. Idempotent when already PROCESSING. */
  iniciar(estudioId: string): Promise<EstudioDeCanon> {
    return envuelto(async () =>
      estudioONada(await apiClient.post<unknown>(`${BASE}/${encodeURIComponent(estudioId)}/iniciar`)),
    )
  },
}
