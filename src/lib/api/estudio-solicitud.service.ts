/**
 * estudio-solicitud.service.ts — crea la ORDEN del pre-scoring de
 * afianzamiento y obtiene el link de pago hosteado.
 *
 * Pega directo a `POST /pre-scoring` con `apiClient` (Bearer JWT de Supabase
 * en memoria). El caso de uso de este paso es la persona YA LOGUEADA; si no
 * hay sesión, quien llama a este servicio no debería invocarlo (ver
 * `src/app/aprobacion/page.tsx`, que redirige a `/auth` antes de intentarlo).
 *
 * El back puede devolver dos cosas:
 *  - `201 { reused:false, orderId, paymentUrl }` — orden nueva: el back ya
 *    generó el link de pago hosteado (mismo patrón que el checkout de planes
 *    de agencia, `agencySubscriptionApi.chargePaymentLink`). El front NUNCA
 *    calcula hash de integridad ni arma la URL de Wompi — solo redirige a
 *    `paymentUrl`.
 *  - `200 { reused:true, orderId, status, evaluationId?, result? }` — ya
 *    existe un estudio para esta persona: no se cobra de nuevo.
 */

import { apiClient, ApiError } from '@/lib/api/client'

export interface CrearOrdenPreScoringRequest {
  /** Cédula, solo dígitos (6–10). */
  documentNumber: string
  /** Celular en E.164, ej: +573001112233. El back lo persiste en la orden
   * aunque el micro de afianzamiento todavía no lo consuma. */
  phoneE164: string
  candidate: {
    names: string
    surnames: string
    email: string
  }
  ciudad: string
  /** COP enteros > 0. Requerido: el back lo exige para armar el estudio. */
  canonCop: number
  tipoInmueble: 'apartamento' | 'casa' | 'local'
  consent: boolean
}

/** Orden nueva: falta pagar. `paymentUrl` ya es el checkout hosteado por el back. */
export interface PreScoringOrdenNueva {
  reused: false
  orderId: string
  paymentUrl: string
}

/** Ya existe un estudio para esta persona: NO se paga de nuevo. */
export interface PreScoringOrdenExistente {
  reused: true
  orderId: string
  status: string
  evaluationId?: string
  result?: unknown
}

export type CrearOrdenPreScoringResponse = PreScoringOrdenNueva | PreScoringOrdenExistente

export type PreScoringErrorKind = 'validation' | 'unauthorized' | 'unavailable' | 'network'

export class PreScoringError extends Error {
  constructor(
    public readonly kind: PreScoringErrorKind,
    message: string,
  ) {
    super(message)
    this.name = 'PreScoringError'
  }
}

/** Forma cruda que puede mandar el back — se valida antes de confiar en ella. */
interface RawPreScoringResponse {
  reused?: unknown
  orderId?: unknown
  paymentUrl?: unknown
  status?: unknown
  evaluationId?: unknown
  result?: unknown
}

/**
 * Crea la orden de pre-scoring. Lanza `PreScoringError` con un `kind` y un
 * mensaje en español presentable ante cualquier falla — sin fallback de
 * demo: acá no hay dato inventado que mostrar, el flujo termina en un pago
 * real.
 */
export async function crearOrdenPreScoring(
  datos: CrearOrdenPreScoringRequest,
): Promise<CrearOrdenPreScoringResponse> {
  const body: Record<string, unknown> = {
    cedula: datos.documentNumber,
    ciudad: datos.ciudad,
    tipo_inmueble: datos.tipoInmueble,
    candidate: datos.candidate,
    consent_granted: datos.consent,
    phoneE164: datos.phoneE164,
    // Requerido: el back lo confirmó (entero > 0, sin `?` en el contrato).
    canon_mensual_cop: datos.canonCop,
  }

  let raw: RawPreScoringResponse
  try {
    raw = await apiClient.post<RawPreScoringResponse>('/pre-scoring', body)
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 400 || err.status === 422) {
        throw new PreScoringError('validation', 'Revisa los datos ingresados e intenta de nuevo.')
      }
      if (err.status === 401 || err.status === 403) {
        throw new PreScoringError(
          'unauthorized',
          'Tu sesión expiró. Inicia sesión de nuevo para continuar.',
        )
      }
      if (err.status === 0) {
        throw new PreScoringError(
          'network',
          'No pudimos conectarnos. Verifica tu conexión e intenta de nuevo.',
        )
      }
      throw new PreScoringError(
        'unavailable',
        'El servicio no está disponible en este momento. Intenta más tarde.',
      )
    }
    throw new PreScoringError(
      'network',
      'No pudimos conectarnos. Verifica tu conexión e intenta de nuevo.',
    )
  }

  if (
    raw.reused === false &&
    typeof raw.orderId === 'string' &&
    typeof raw.paymentUrl === 'string' &&
    raw.paymentUrl !== ''
  ) {
    return { reused: false, orderId: raw.orderId, paymentUrl: raw.paymentUrl }
  }

  if (raw.reused === true && typeof raw.orderId === 'string' && typeof raw.status === 'string') {
    return {
      reused: true,
      orderId: raw.orderId,
      status: raw.status,
      ...(typeof raw.evaluationId === 'string' ? { evaluationId: raw.evaluationId } : {}),
      ...(raw.result !== undefined ? { result: raw.result } : {}),
    }
  }

  // Una respuesta 2xx con una forma que no reconocemos es tan inválida como
  // un error: no se inventa una orden a partir de un dato que no vino.
  throw new PreScoringError(
    'unavailable',
    'El servicio no está disponible en este momento. Intenta más tarde.',
  )
}
