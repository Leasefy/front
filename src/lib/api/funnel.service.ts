/**
 * funnel.service.ts — client for the public tenant-funnel pre-approval (F1).
 *
 * Calls the AGENT backend (`NEXT_PUBLIC_AGENT_URL`) endpoint
 * `POST /api/funnel/preaprobacion`. Public / unauthenticated — no token.
 * See agent: src/server/routes/funnel-preaprobacion.ts.
 */

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || ''

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
}

export interface PreApprovalRequest {
  /** Cédula digits (6–10). Hashed server-side; never stored raw. */
  documentNumber: string
  /** E.164 phone, e.g. +573001112233. */
  phoneE164: string
  ciudad: string
  /** Monthly rent (canon) in integer COP. */
  canonCop: number
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
  let res: Response
  try {
    res = await fetch(`${AGENT_URL}/api/funnel/preaprobacion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
  } catch {
    throw new PreApprovalRequestError('network', 'No pudimos conectarnos. Verifica tu conexión e intenta de nuevo.')
  }

  if (res.status === 429) {
    throw new PreApprovalRequestError('rate_limited', 'Demasiados intentos. Espera un momento e intenta de nuevo.')
  }
  if (res.status === 404 || res.status === 503) {
    throw new PreApprovalRequestError('unavailable', 'El servicio no está disponible en este momento. Intenta más tarde.')
  }
  if (res.status === 422) {
    throw new PreApprovalRequestError('validation', 'Revisa los datos ingresados e intenta de nuevo.')
  }
  if (!res.ok) {
    throw new PreApprovalRequestError('network', `No pudimos procesar tu solicitud (error ${res.status}).`)
  }

  return (await res.json()) as PreApprovalResult
}
