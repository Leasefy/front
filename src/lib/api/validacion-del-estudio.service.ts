/**
 * validacion-del-estudio.service.ts — la validación de identidad por WhatsApp.
 *
 * Nico, 2026-09-15 (acordado con Fianly): después de pagar, Fianly le manda a
 * la persona un WhatsApp con los pasos para validar su identidad. Estos son los
 * dos botones de esa espera:
 *  · «Ya la validé»           → `POST /pre-scoring/current/verificar-autorizacion`
 *  · «Reenviar la validación» → `POST /pre-scoring/current/reenviar-autorizacion`
 *
 * El back resuelve la orden por la sesión: el front nunca manda un id. Los
 * mensajes de 409/429 los escribe el back para la persona («espera un par de
 * minutos», «ya te la reenviamos varias veces») y se muestran tal cual.
 */

import { apiClient, ApiError } from '@/lib/api/client'

/**
 * - `preparando`: pagó, la validación todavía no sale.
 * - `pendiente`: salió y Fianly aún no la ve hecha.
 * - `validada`: Fianly ya la tiene; el estudio sigue solo.
 * - `lista`: hay respuesta (paso 3).
 * - `cerrada`: no hay estudio en curso.
 */
export type EstadoDeLaValidacion = 'preparando' | 'pendiente' | 'validada' | 'lista' | 'cerrada'

const ESTADOS: ReadonlySet<string> = new Set(['preparando', 'pendiente', 'validada', 'lista', 'cerrada'])

export class ValidacionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidacionError'
  }
}

const NO_SE_PUDO_REVISAR = 'No pudimos revisar tu validación. Intenta de nuevo en un momento.'
const NO_SE_PUDO_REENVIAR = 'No pudimos reenviar tu validación. Intenta de nuevo en unos minutos.'

function mensajeDe(err: unknown, porDefecto: string): string {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      return 'Tu sesión expiró. Inicia sesión de nuevo para continuar.'
    }
    if (err.status === 0) {
      return 'No pudimos conectarnos. Verifica tu conexión e intenta de nuevo.'
    }
    if ((err.status === 409 || err.status === 429) && err.message) {
      return err.message
    }
  }
  return porDefecto
}

/** «Ya la validé». */
export async function verificarValidacion(): Promise<EstadoDeLaValidacion> {
  let respuesta: { estado?: unknown }
  try {
    respuesta = await apiClient.post<{ estado?: unknown }>(
      '/pre-scoring/current/verificar-autorizacion',
      {},
    )
  } catch (err) {
    throw new ValidacionError(mensajeDe(err, NO_SE_PUDO_REVISAR))
  }
  if (typeof respuesta?.estado === 'string' && ESTADOS.has(respuesta.estado)) {
    return respuesta.estado as EstadoDeLaValidacion
  }
  throw new ValidacionError(NO_SE_PUDO_REVISAR)
}

/** «Reenviar la validación». */
export async function reenviarValidacion(): Promise<{ reenviosRestantes: number | null }> {
  let respuesta: { enviada?: unknown; reenviosRestantes?: unknown }
  try {
    respuesta = await apiClient.post<{ enviada?: unknown; reenviosRestantes?: unknown }>(
      '/pre-scoring/current/reenviar-autorizacion',
      {},
    )
  } catch (err) {
    throw new ValidacionError(mensajeDe(err, NO_SE_PUDO_REENVIAR))
  }
  if (respuesta?.enviada === true) {
    return {
      reenviosRestantes:
        typeof respuesta.reenviosRestantes === 'number' ? respuesta.reenviosRestantes : null,
    }
  }
  throw new ValidacionError(NO_SE_PUDO_REENVIAR)
}
