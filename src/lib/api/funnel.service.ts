/**
 * funnel.service.ts — client for the public tenant-funnel pre-approval (F1).
 *
 * Calls the AGENT backend (`NEXT_PUBLIC_AGENT_URL`) endpoint
 * `POST /api/funnel/preaprobacion`. Public / unauthenticated — no token.
 * See agent: src/server/routes/funnel-preaprobacion.ts.
 */

/**
 * Modo demo: sirve un resultado de ejemplo en vez de morir.
 *
 * Se activa cuando NO hay agente configurado, o con el override explícito, o
 * —el caso que duele hoy— cuando **el agente responde 404 en desarrollo**: la
 * ruta `POST /api/funnel/preaprobacion` está construida pero vive solo en
 * ramas locales del repo del agente (no está en `origin/develop` ni en
 * `origin/main`, y el agente que corre publica 181 rutas, ninguna de funnel).
 * Sin esto, el recorrido completo del inquilino queda intransitable en local.
 *
 * En producción NUNCA cae acá: un 404 real sigue siendo un error visible.
 */
function isMockMode(): boolean {
  if (process.env.NEXT_PUBLIC_USE_MOCK_API === 'true') return true
  return !process.env.NEXT_PUBLIC_AGENT_URL
}

const esDesarrollo = () => process.env.NODE_ENV !== 'production'

/** Tope de ejemplo cuando se consulta sin propiedad. Solo para la demo. */
const MAX_AFIANZABLE_DEMO_COP = 2_800_000

/**
 * Resultado de ejemplo. `stubMode: true` — el campo ya existía en el contrato
 * justamente para marcar "esto no es real", y la UI lo muestra con todas las
 * letras para que nadie confunda una demo con una aprobación.
 *
 * Refleja la forma REAL de la respuesta, no una simplificada: cuando no se
 * manda canon, la aseguradora devuelve el **máximo afianzable**. Si la demo no
 * lo trajera, la pantalla de "consulté sin propiedad" se vería como un callejón
 * en local y se construiría a ciegas justo el caso que más importa.
 */
function resultadoDemo(req?: PreApprovalRequest): PreApprovalResult {
  const sinPropiedad = req?.canonCop === undefined
  return {
    asegurabilidad: 'yes',
    aseguradoras: [
      { aseguradora: 'sura', status: 'approved' },
      { aseguradora: 'bolivar', status: 'approved' },
      { aseguradora: 'mapfre', status: 'conditional' },
    ],
    stubMode: true,
    message:
      'Resultado de ejemplo: el servicio de aprobación todavía no está publicado. Los datos reales llegan cuando el agente exponga la consulta.',
    maxAfianzableCop: sinPropiedad ? MAX_AFIANZABLE_DEMO_COP : null,
  }
}

/**
 * Se lee en cada llamada, no al cargar el módulo, para que la decisión de mock
 * y la URL base siempre coincidan (y los tests puedan stubearlas). Misma
 * convención que `funnel-applications.service.ts`.
 */
const agentUrl = () => process.env.NEXT_PUBLIC_AGENT_URL || ''

export type Asegurabilidad = 'yes' | 'partial' | 'no'

export interface PreApprovalCarrier {
  aseguradora: string
  status: 'approved' | 'conditional'
}

export interface PreApprovalResult {
  asegurabilidad: Asegurabilidad
  aseguradoras: PreApprovalCarrier[]
  stubMode: boolean
  message: string
  /**
   * Canon mensual máximo que la aseguradora respalda, en COP enteros.
   *
   * **Este es el dato que hace valer consultar sin propiedad.** Cuando la
   * persona no manda un canon, la aseguradora no responde un sí/no: responde
   * *hasta cuánto*. Ese número es el tope, y es el que vuelve personal al
   * catálogo.
   *
   * ⚠️ **El agente todavía no lo manda.** La ruta construida devuelve solo
   * `{ asegurabilidad, aseguradoras, stubMode, message }` y encima exige
   * `canonCop`, así que hoy el caso "sin propiedad" ni siquiera se puede
   * ejecutar contra el backend real. El front queda listo: llega en `null`,
   * la UI lo dice, y el día que Víctor lo mande se prende sin tocar la UI.
   *
   * Es el `maxAfianzableCop` del plan (`.planning/PLAN-EXPERIENCIA-ESTUDIOS.md`
   * §4-bis) — "máximo afianzable" del lado de la agencia, "tope" del lado del
   * inquilino (`docs/VOCABULARIO.md`).
   */
  maxAfianzableCop: number | null
}

/**
 * Normaliza la respuesta cruda. El backend actual no manda `maxAfianzableCop`,
 * así que hay que tolerar su ausencia sin romper ni inventar un cero.
 */
export function parsePreApprovalResult(data: unknown): PreApprovalResult {
  const d = (data ?? {}) as Partial<PreApprovalResult>
  const niveles: Asegurabilidad[] = ['yes', 'partial', 'no']
  return {
    asegurabilidad: niveles.includes(d.asegurabilidad as Asegurabilidad)
      ? (d.asegurabilidad as Asegurabilidad)
      : 'no',
    aseguradoras: Array.isArray(d.aseguradoras)
      ? d.aseguradoras.filter(
          (a): a is PreApprovalCarrier => !!a && typeof a.aseguradora === 'string',
        )
      : [],
    stubMode: d.stubMode === true,
    message: typeof d.message === 'string' ? d.message : '',
    maxAfianzableCop:
      typeof d.maxAfianzableCop === 'number' && Number.isFinite(d.maxAfianzableCop)
        ? d.maxAfianzableCop
        : null,
  }
}

export interface PreApprovalRequest {
  /** Cédula digits (6–10). Hashed server-side; never stored raw. */
  documentNumber: string
  /** E.164 phone, e.g. +573001112233. */
  phoneE164: string
  ciudad: string
  /**
   * Canon mensual en COP enteros. **Opcional**: el estudio dejó de necesitar
   * una propiedad — la persona se estudia primero y elige después con su tope.
   * Solo se manda cuando ya tiene una en mente.
   *
   * ⚠️ El schema del agente todavía lo exige (`z.number().int().positive()`),
   * así que hasta que Víctor lo relaje, omitirlo devuelve 422. El front ya
   * está listo del lado de acá.
   */
  canonCop?: number
  tipoInmueble: 'apartamento' | 'casa' | 'local'
  consent: boolean
  codeudores?: number
}

export type PreApprovalErrorKind = 'validation' | 'rate_limited' | 'unavailable' | 'network'

export class PreApprovalRequestError extends Error {
  constructor(
    public readonly kind: PreApprovalErrorKind,
    message: string,
  ) {
    super(message)
    this.name = 'PreApprovalRequestError'
  }
}

/** Display names for the carrier codes the agent returns. */
const CARRIER_DISPLAY: Record<string, string> = {
  sura: 'Sura',
  solidaria: 'Solidaria',
  mapfre: 'Mapfre',
  bolivar: 'Bolívar',
  estado: 'La Previsora',
  equidad: 'La Equidad',
  mundial: 'Mundial',
  zurich: 'Zurich',
  sekure: 'Sekure',
}

export function aseguradoraDisplayName(code: string): string {
  return CARRIER_DISPLAY[code] ?? code.charAt(0).toUpperCase() + code.slice(1)
}

/**
 * Submit a pre-approval request. Throws `PreApprovalRequestError` with a
 * user-presentable `kind` + Spanish message on any failure.
 */
export async function requestPreApproval(req: PreApprovalRequest): Promise<PreApprovalResult> {
  if (isMockMode()) return resultadoDemo(req)

  let res: Response
  try {
    res = await fetch(`${agentUrl()}/api/funnel/preaprobacion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
  } catch {
    // Agente caído o inalcanzable. En local ese es el estado normal mientras
    // la ruta no se publique, y no puede dejar el recorrido intransitable.
    if (esDesarrollo()) return resultadoDemo(req)
    throw new PreApprovalRequestError('network', 'No pudimos conectarnos. Verifica tu conexión e intenta de nuevo.')
  }

  // Estos dos se muestran SIEMPRE, también en desarrollo: dicen algo cierto
  // sobre lo que se envió. Taparlos con una demo escondería errores reales del
  // formulario y volvería inútil probarlo en local.
  if (res.status === 429) {
    throw new PreApprovalRequestError('rate_limited', 'Demasiados intentos. Espera un momento e intenta de nuevo.')
  }
  if (res.status === 422) {
    throw new PreApprovalRequestError('validation', 'Revisa los datos ingresados e intenta de nuevo.')
  }

  if (!res.ok) {
    /*
     * Cualquier otro fallo del servidor degrada a la demo en desarrollo.
     * Antes solo se cubrían 404 y 503: bastaba con que el agente devolviera un
     * 500, o con que se cayera a mitad, para que la pantalla volviera a decir
     * "el servicio no está disponible" — justo lo que no puede pasar mientras
     * el backend del funnel siga sin publicarse.
     *
     * En producción no se tapa nada.
     */
    if (esDesarrollo()) return resultadoDemo(req)
    if (res.status === 404 || res.status === 503) {
      throw new PreApprovalRequestError('unavailable', 'El servicio no está disponible en este momento. Intenta más tarde.')
    }
    throw new PreApprovalRequestError('network', `No pudimos procesar tu solicitud (error ${res.status}).`)
  }

  return parsePreApprovalResult(await res.json())
}
