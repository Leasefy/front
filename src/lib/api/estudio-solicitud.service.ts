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

import { apiClient } from '@/lib/api/client'
import { leerFallo, mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario'

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

/**
 * Qué pasó, para quien llama (02-10-2026, sistema de errores):
 *  · `validation`: un 400/422; trae `porCampo` con cada problema en SU campo;
 *  · `unauthorized`: 401 (sesión vencida) o 403;
 *  · `conflict`: un 409; el `message` del back dice qué choca;
 *  · `rejected`: otro 4xx (404, 429…), con lo que dijo el back;
 *  · `ours`: un 5xx o una respuesta que no se entiende; es nuestro, con la referencia;
 *  · `unavailable`: una caída (503 `SERVICIO_NO_DISPONIBLE`, Leasefy sin responder);
 *  · `network`: no hubo respuesta. SÓLO acá se habla de la conexión.
 *
 * Antes un 409 y un 5xx decían «El servicio no está disponible» y un 400 decía
 * «Revisa los datos ingresados» sin decir cuál.
 */
export type PreScoringErrorKind =
  | 'validation'
  | 'unauthorized'
  | 'conflict'
  | 'rejected'
  | 'ours'
  | 'unavailable'
  | 'network'

/** Los campos del formulario de `/aprobacion` (`PreApprovalFormFields`). */
export type CampoDelEstudio =
  | 'nombres'
  | 'apellidos'
  | 'email'
  | 'cedula'
  | 'phone'
  | 'ciudad'
  | 'canon'
  | 'tipoInmueble'
  | 'consent'

const CAMPOS_DEL_ESTUDIO: readonly CampoDelEstudio[] = [
  'nombres',
  'apellidos',
  'email',
  'cedula',
  'phone',
  'ciudad',
  'canon',
  'tipoInmueble',
  'consent',
]

/** El nombre del dato en el cuerpo (snake_case del contrato) → el campo del formulario. */
const CAMPO_DEL_FORMULARIO: Partial<Record<string, CampoDelEstudio>> = {
  cedula: 'cedula',
  ciudad: 'ciudad',
  canon_mensual_cop: 'canon',
  tipo_inmueble: 'tipoInmueble',
  'candidate.names': 'nombres',
  names: 'nombres',
  'candidate.surnames': 'apellidos',
  surnames: 'apellidos',
  'candidate.email': 'email',
  email: 'email',
  phoneE164: 'phone',
  consent_granted: 'consent',
}

const ACCION = 'crear tu estudio'
const SESION_VENCIDA = 'Tu sesión expiró. Inicia sesión de nuevo para continuar.'

export class PreScoringError extends Error {
  constructor(
    public readonly kind: PreScoringErrorKind,
    message: string,
    /** Lo que el back rechazó, en el campo del formulario que corresponde. */
    public readonly porCampo: Partial<Record<CampoDelEstudio, string>> = {},
    /** El error original, para quien quiera leer `referencia` o `code`. */
    public readonly original?: unknown,
    /**
     * Lo que no tiene campo donde ir (va al pie del formulario). En un 400
     * con todo repartido queda vacío y el `message` sólo invita a mirar los
     * campos marcados.
     */
    public readonly sueltos: string[] = message ? [message] : [],
  ) {
    super(message)
    this.name = 'PreScoringError'
  }
}

/** El fallo de `POST /pre-scoring`, leído con el traductor de la plataforma. */
function comoPreScoringError(err: unknown): PreScoringError {
  const fallo = leerFallo(err)
  switch (fallo.tipo) {
    case 'sinRespuesta':
      return new PreScoringError('network', mensajeParaLaPersona(err), {}, err)
    case 'leasefyNoResponde':
    case 'servicioCaido':
      return new PreScoringError('unavailable', mensajeParaLaPersona(err, { accion: ACCION }), {}, err)
    case 'sesion':
      return new PreScoringError('unauthorized', SESION_VENCIDA, {}, err)
    case 'sinPermiso':
      return new PreScoringError(
        'unauthorized',
        mensajeParaLaPersona(err, { porDefecto: 'No tienes permiso para pedir este estudio.' }),
        {},
        err,
      )
    case 'datos': {
      const reparto = repartirErroresDelServidor<CampoDelEstudio>(err, {
        mapa: CAMPO_DEL_FORMULARIO,
        campos: CAMPOS_DEL_ESTUDIO,
        accion: ACCION,
        porDefecto: 'Hay un dato que no pudimos aceptar. Revisa el formulario e intenta de nuevo.',
      })
      // Todo quedó en su campo: el mensaje general sólo invita a mirarlos.
      const mensaje = reparto.sueltos.length
        ? reparto.sueltos.join(' · ')
        : 'Revisa los campos marcados.'
      return new PreScoringError('validation', mensaje, reparto.porCampo, err, reparto.sueltos)
    }
    case 'conflicto':
      return new PreScoringError(
        'conflict',
        mensajeParaLaPersona(err, { porDefecto: 'Ya hay una solicitud de estudio en curso para estos datos.' }),
        {},
        err,
      )
    default:
      return new PreScoringError(
        fallo.tipo === 'nuestro' || fallo.tipo === 'desconocido' ? 'ours' : 'rejected',
        mensajeParaLaPersona(err, { accion: ACCION }),
        {},
        err,
      )
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
 * Crea la orden de pre-scoring. Lanza `PreScoringError` con un `kind`, un
 * mensaje en español presentable (el traductor de la plataforma, con la regla
 * de oro) y, en un 400, cada problema en su campo (`porCampo`) — sin fallback
 * de demo: acá no hay dato inventado que mostrar, el flujo termina en un pago
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
    throw comoPreScoringError(err)
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
  // un error: no se inventa una orden a partir de un dato que no vino. Es
  // nuestro (el back respondió algo que el front no sabe leer), no del
  // servicio ni de la persona.
  throw new PreScoringError(
    'ours',
    `No pudimos ${ACCION}: algo falló de nuestro lado. No es nada que hayas hecho; prueba de nuevo en un momento.`,
  )
}
