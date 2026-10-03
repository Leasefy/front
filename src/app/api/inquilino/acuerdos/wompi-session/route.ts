/**
 * Cuota Wompi session route — the security core of ACUE-03.
 *
 * A verbatim clone of the rent rail (src/app/api/inquilino/pagos/wompi-session/route.ts),
 * with the ONE change being where the amount comes from. Every v7-04 invariant carries:
 *   - The integrity secret is SERVER-ONLY: read from a non-public env var and never
 *     returned to the client. Computing the hash client-side would leak it, so this
 *     route is the single server-side source of the integrity hash.
 *   - The amount is resolved SERVER-SIDE from the agent's cartera/payment-plans record
 *     under the tenant's forwarded JWT — it is never a client-supplied value. The client
 *     sends only an identifier ({ planId, cuotaNumber }); a tampered amount in the body is
 *     ignored because this route never reads one.
 *   - The tenant JWT is forwarded to the BFF (auth + ownership: a plan not owned by the
 *     caller is rejected upstream and the status is propagated).
 *
 * The cuota amount originates in `installments[cuotaNumber].amountCop` (or the plan-level
 * `totalDueCop` when no cuota is given). Nothing is recomputed here beyond peso→centavos.
 *
 * ── Los errores salen en el sobre (Nico, 02-10-2026) ─────────────────────────
 *
 * Igual que su gemela de arriendos (`inquilino/pagos/wompi-session`, commit
 * `2e8e605c`). Antes respondía `{ error: 'payment_plan_failed' }` y otros
 * códigos en inglés. Ahora todo error sale con el sobre del back
 * (`back/src/common/errores/contrato-de-error.ts`): `{ statusCode, code,
 * message }` con `message` en español para la persona (y `campos` en un 400 del
 * cuerpo). Un 4xx de `/cartera/payment-plans/:id` se reenvía con SU `code` y SU
 * frase; un 5xx, con su `referencia` y su `servicio`, para que el front diga
 * «de nuestro lado» o la caída. La llama «Pagar cuota»
 * (`components/tenant/PagarCuota.tsx`) y lo lee con `falloDelMicro` y el
 * traductor (`mensajeParaLaPersona`), como `PayRentModal`.
 *
 * ── Quién sirve el plan (Nico, 02-10-2026, «seguimiento 3»: el back de puente) ─
 *
 * El plan vive en el micro (`agent/src/cartera/payment-plans/`). El back
 * expone `GET /cartera/payment-plans/:planId` con el alcance del inquilino
 * autenticado (`back/src/acuerdos-de-pago/`) y se lo pide al micro por S2S con
 * la llave interna (`POST /internal/cartera/payment-plans/{planId}/del-deudor`):
 * el deudor es el documento del inquilino dentro de SUS inmobiliarias. Un plan
 * que no existe, el de otra persona o el de otra inmobiliaria son el mismo 404
 * `ACUERDO_NO_ENCONTRADO` («No encontramos este acuerdo de pago a tu nombre.»),
 * que esta ruta reenvía con su `code` y su frase. Nunca hay un `agencyId` desde
 * el portal (sería un IDOR).
 *
 * ── Cómo se cierra la cuota ──────────────────────────────────────────────────
 *
 * La referencia `acuerdo-<planId>-c<n>` llega al webhook de Wompi del back, que
 * tiene registrado el prefijo `acuerdo-` (`AcuerdosDePagoService`): un
 * `APPROVED` le pide al micro cerrar ESA cuota (idempotente, y sólo si el
 * monto es el de la cuota). La referencia sin cuota (`acuerdo-<planId>`, el
 * plan entero por `totalDueCop`) NO se cierra sola: el back deja el evento
 * FALLIDO para una persona. «Pagar cuota» siempre manda `cuotaNumber`.
 */

import { NextResponse } from 'next/server'

import { esIdentificadorSeguro } from '@/lib/utils/identificador-seguro'
import { computeWompiIntegrity } from '@/lib/payments/wompi-integrity'
import type { AcuerdoDetail } from '@/lib/api/tenant-acuerdos.types'

export const runtime = 'nodejs'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'

/** Lo que se dice cuando el pedido llegó mal: no es algo que la persona escribió. */
const RECARGA = 'Recarga la página e intenta de nuevo.'

// Sin `export`: un `route.ts` sólo puede exportar lo que Next admite (POST, runtime…).
const MENSAJES_DE_LA_SESION_DE_PAGO = {
  cuerpoIlegible: `No pudimos leer el pedido de pago. ${RECARGA}`,
  faltaElAcuerdo: `Falta el acuerdo de pago que vas a pagar. ${RECARGA}`,
  acuerdoInvalido: `El acuerdo de pago que vas a pagar no es válido. ${RECARGA}`,
  cuotaInvalida: `La cuota que vas a pagar no es válida. ${RECARGA}`,
  datosDelPago: `No pudimos iniciar el pago con estos datos. ${RECARGA}`,
  sinConfigurar:
    'Los pagos en línea no están disponibles en este momento: algo falló de nuestro lado. No es nada que hayas hecho; prueba de nuevo más tarde.',
  sesion: 'Tu sesión expiró. Vuelve a iniciar sesión para pagar.',
  sinAcceso: `No encontramos este acuerdo de pago a tu nombre. ${RECARGA}`,
  montoInvalido:
    'No pudimos calcular el valor de la cuota: algo falló de nuestro lado. No es nada que hayas hecho; prueba de nuevo en un momento.',
  delBack: 'No pudimos iniciar el pago: algo falló de nuestro lado. No es nada que hayas hecho; prueba de nuevo en un momento.',
} as const

interface CampoConError {
  campo: string
  regla: string
  mensaje: string
}

/** El sobre de error, como lo manda el back. */
function sobre(
  statusCode: number,
  code: string,
  message: string | string[],
  extras: { campos?: CampoConError[]; referencia?: string; servicio?: string } = {},
) {
  return NextResponse.json({ statusCode, code, message, ...extras }, { status: statusCode })
}

/** Un 400 de un campo del cuerpo (`planId`, `cuotaNumber`), con su `campos`. */
function campoDelPedido(campo: 'planId' | 'cuotaNumber', regla: string, mensaje: string) {
  return sobre(400, 'DATOS_INVALIDOS', [mensaje], { campos: [{ campo, regla, mensaje }] })
}

/**
 * El `code` por defecto de un status del back que no trajo el suyo (un back
 * viejo, un balanceador).
 */
function codigoPorStatus(status: number): string {
  if (status === 401) return 'SESION_REQUERIDA'
  if (status === 403) return 'SIN_ACCESO'
  if (status === 404) return 'NO_ENCONTRADO'
  if (status >= 500) return 'ERROR_INTERNO'
  return 'PAGO_NO_INICIADO'
}

function mensajePorStatus(status: number): string {
  if (status === 401) return MENSAJES_DE_LA_SESION_DE_PAGO.sesion
  if (status === 403 || status === 404) return MENSAJES_DE_LA_SESION_DE_PAGO.sinAcceso
  if (status >= 500) return MENSAJES_DE_LA_SESION_DE_PAGO.delBack
  return MENSAJES_DE_LA_SESION_DE_PAGO.datosDelPago
}

function textoDelMensaje(m: unknown): string | string[] | undefined {
  if (typeof m === 'string') return m.trim() ? m : undefined
  if (Array.isArray(m)) {
    const partes = m.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    return partes.length ? partes : undefined
  }
  return undefined
}

/**
 * El fallo de `/cartera/payment-plans/:id` en el sobre, con su status.
 *
 * Un 400/422 de allá es un `planId` que no le sirvió (un texto de validación
 * en inglés que no es para nadie), así que va el nuestro. Lo demás (403, 404,
 * 409, un 5xx con `referencia`) se reenvía con su `code` y su frase.
 */
async function falloDelBack(res: Response) {
  let cuerpo: Record<string, unknown> = {}
  try {
    const leido: unknown = await res.json()
    if (leido && typeof leido === 'object' && !Array.isArray(leido)) cuerpo = leido as Record<string, unknown>
  } catch {
    // Sin cuerpo o no es JSON (un balanceador): queda el status.
  }
  const status = res.status >= 400 && res.status <= 599 ? res.status : 502
  if (status === 400 || status === 422) {
    return sobre(status, 'DATOS_INVALIDOS', [MENSAJES_DE_LA_SESION_DE_PAGO.datosDelPago])
  }
  const code = typeof cuerpo.code === 'string' && cuerpo.code.trim() ? cuerpo.code : codigoPorStatus(status)
  const message = textoDelMensaje(cuerpo.message) ?? mensajePorStatus(status)
  return sobre(status, code, message, {
    ...(typeof cuerpo.referencia === 'string' && cuerpo.referencia ? { referencia: cuerpo.referencia } : {}),
    ...(typeof cuerpo.servicio === 'string' && cuerpo.servicio ? { servicio: cuerpo.servicio } : {}),
  })
}

/**
 * Acuerdo-namespaced payment reference so a cuota reference never collides with a
 * rent (`rent-…`) or avalúo (`avaluo-…`) reference during reconciliation.
 *   buildAcuerdoReference('plan-1', 2) === 'acuerdo-plan-1-c2'
 *   buildAcuerdoReference('plan-1')    === 'acuerdo-plan-1'
 */
function buildAcuerdoReference(planId: string, cuotaNumber?: number): string {
  return typeof cuotaNumber === 'number'
    ? `acuerdo-${planId}-c${cuotaNumber}`
    : `acuerdo-${planId}`
}

export async function POST(req: Request) {
  // --- Parse body (only an identifier is accepted — never a client amount) ---
  let planId: string | undefined
  let cuotaNumber: number | undefined
  try {
    const body = (await req.json()) as { planId?: string; cuotaNumber?: number }
    planId = body.planId
    cuotaNumber = body.cuotaNumber
  } catch {
    return sobre(400, 'DATOS_INVALIDOS', [MENSAJES_DE_LA_SESION_DE_PAGO.cuerpoIlegible])
  }

  if (!planId) {
    return campoDelPedido('planId', 'requerido', MENSAJES_DE_LA_SESION_DE_PAGO.faltaElAcuerdo)
  }
  // `planId` va dentro de la ruta del back y de la referencia firmada; la cuota,
  // si viene, es un número de cuota y nada más. Ver `identificador-seguro.ts`.
  if (!esIdentificadorSeguro(planId)) {
    return campoDelPedido('planId', 'formato', MENSAJES_DE_LA_SESION_DE_PAGO.acuerdoInvalido)
  }
  if (cuotaNumber !== undefined && !(Number.isInteger(cuotaNumber) && cuotaNumber >= 1)) {
    return campoDelPedido('cuotaNumber', 'formato', MENSAJES_DE_LA_SESION_DE_PAGO.cuotaInvalida)
  }

  // --- Server-only env vars (no public prefix) ---
  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET
  const publicKey = process.env.WOMPI_PUBLIC_KEY

  if (!integritySecret || !publicKey) {
    return sobre(500, 'PAGOS_SIN_CONFIGURAR', MENSAJES_DE_LA_SESION_DE_PAGO.sinConfigurar)
  }

  // --- Forward the tenant's JWT to the backend (auth + ownership enforcement) ---
  const authorization = req.headers.get('authorization') ?? ''
  if (!authorization) {
    return sobre(401, 'SESION_REQUERIDA', MENSAJES_DE_LA_SESION_DE_PAGO.sesion)
  }

  // --- Resolve the authoritative cuota amount server-side from the agent record ---
  const planRes = await fetch(`${BACKEND_URL}/cartera/payment-plans/${planId}`, {
    headers: { Authorization: authorization, 'Content-Type': 'application/json' },
  })

  if (!planRes.ok) {
    // Also enforces tenant ownership — the agent rejects a plan not owned by the caller.
    return falloDelBack(planRes)
  }

  const plan = (await planRes.json()) as AcuerdoDetail

  // The cuota's amount (or the plan total when no cuota is specified). Read verbatim
  // from the record — the agent is the sole authority for every peso (no client math).
  const amountCop =
    typeof cuotaNumber === 'number'
      ? plan.installments.find((i) => i.number === cuotaNumber)?.amountCop
      : plan.totalDueCop

  // --- Server-resolved amount (anti-tamper) ---
  if (typeof amountCop !== 'number' || !Number.isFinite(amountCop) || amountCop <= 0) {
    return sobre(502, 'MONTO_INVALIDO', MENSAJES_DE_LA_SESION_DE_PAGO.montoInvalido)
  }

  const amountInCents = Math.round(amountCop * 100)
  const currency = 'COP'
  const reference = buildAcuerdoReference(planId, cuotaNumber)

  // --- Integrity hash (server-only; secret never leaves this process) ---
  const integrity = computeWompiIntegrity(
    reference,
    amountInCents,
    currency,
    integritySecret
  )

  return NextResponse.json({ reference, amountInCents, currency, integrity, publicKey })
}
