/**
 * Rent Wompi session route — the security core of PAGO-02.
 *
 * Invariants (see also src/app/api/avaluo/wompi-session/route.ts and the sibling
 * cuota route src/app/api/inquilino/acuerdos/wompi-session/route.ts):
 *   - The integrity secret is SERVER-ONLY: read from a non-public env var and
 *     never returned to the client. Computing the hash client-side would leak
 *     it, so this route is the single server-side source of the integrity hash.
 *   - The amount is resolved SERVER-SIDE from NestJS /leases/:id/payment-info
 *     under the tenant's forwarded JWT — it is never read from the request body
 *     (removes the client-supplied-amount anti-pattern).
 *   - A period lock blocks double-pay: a session is issued only when the current
 *     period is payable (NONE or REJECTED).
 *
 * ── Los errores salen en el sobre (Nico, 02-10-2026) ─────────────────────────
 *
 * Antes respondía `{ error: 'payment_info_failed' }` y otros códigos en inglés;
 * el modal tenía que adivinar por el status. Ahora todo error sale con el sobre
 * del back (`back/src/common/errores/contrato-de-error.ts`):
 * `{ statusCode, code, message }` con `message` en español para la persona (y
 * `campos` en un 400 del cuerpo). Un 4xx del back (`/leases/:id/payment-info`)
 * se reenvía con SU `code` y SU frase, que ya vienen en español; un 5xx, con su
 * `referencia` y su `servicio` para que el front diga «de nuestro lado» o la
 * caída. `PayRentModal` lo lee con el traductor.
 */

import { NextResponse } from 'next/server'

import type { BackendPaymentInfo } from '@/lib/api/leases.types'
import { esIdentificadorSeguro } from '@/lib/utils/identificador-seguro'
import { computeWompiIntegrity } from '@/lib/payments/wompi-integrity'
import { aCentavosWompi } from '@/lib/plata/plata'
import {
  buildRentReference,
  isPeriodPayable,
} from '@/lib/payments/wompi-rent-session'

export const runtime = 'nodejs'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'

/** Lo que se dice cuando el pedido del modal llegó mal: no es algo que la persona escribió. */
const RECARGA = 'Recarga la página e intenta de nuevo.'

// Sin `export`: un `route.ts` sólo puede exportar lo que Next admite (POST, runtime…).
const MENSAJES_DE_LA_SESION_DE_PAGO = {
  cuerpoIlegible: `No pudimos leer el pedido de pago. ${RECARGA}`,
  faltaElArriendo: `Falta el arriendo que vas a pagar. ${RECARGA}`,
  arriendoInvalido: `El arriendo que vas a pagar no es válido. ${RECARGA}`,
  datosDelPago: `No pudimos iniciar el pago con estos datos. ${RECARGA}`,
  sinConfigurar:
    'Los pagos en línea no están disponibles en este momento: algo falló de nuestro lado. No es nada que hayas hecho; prueba de nuevo más tarde.',
  sesion: 'Tu sesión expiró. Vuelve a iniciar sesión para pagar.',
  sinAcceso: `No encontramos este arriendo a tu nombre. ${RECARGA}`,
  periodoNoPagable: 'Este período ya está pagado o en verificación.',
  montoInvalido:
    'No pudimos calcular el valor del arriendo: algo falló de nuestro lado. No es nada que hayas hecho; prueba de nuevo en un momento.',
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

function campoDelArriendo(regla: string, mensaje: string) {
  return sobre(400, 'DATOS_INVALIDOS', [mensaje], { campos: [{ campo: 'leaseId', regla, mensaje }] })
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
 * El fallo del back (`/leases/:id/payment-info`) en el sobre, con su status.
 *
 * Un 400 del back es un `leaseId` que no es UUID: ese texto lo arma
 * `ParseUUIDPipe` en inglés y no es para nadie, así que va el nuestro. Lo
 * demás (403 «No tienes acceso a este arriendo.», 404, 409, un 5xx con
 * `referencia`) se reenvía con su `code` y su frase.
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

export async function POST(req: Request) {
  // --- Parse and validate body (only leaseId is accepted — never an amount) ---
  let leaseId: string | undefined
  try {
    const body = (await req.json()) as { leaseId?: string }
    leaseId = body.leaseId
  } catch {
    return sobre(400, 'DATOS_INVALIDOS', [MENSAJES_DE_LA_SESION_DE_PAGO.cuerpoIlegible])
  }

  if (!leaseId) {
    return campoDelArriendo('requerido', MENSAJES_DE_LA_SESION_DE_PAGO.faltaElArriendo)
  }
  // Va dentro de la ruta del back Y de la referencia firmada: nada que cambie
  // la forma de la URL (`../`, `?`, `#`). Ver `identificador-seguro.ts`.
  if (!esIdentificadorSeguro(leaseId)) {
    return campoDelArriendo('formato', MENSAJES_DE_LA_SESION_DE_PAGO.arriendoInvalido)
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

  // --- Resolve the authoritative amount + period status server-side ---
  const infoRes = await fetch(`${BACKEND_URL}/leases/${leaseId}/payment-info`, {
    headers: { Authorization: authorization, 'Content-Type': 'application/json' },
  })

  if (!infoRes.ok) {
    // Also enforces tenant ownership — backend rejects a lease not owned by the caller.
    return falloDelBack(infoRes)
  }

  const info = (await infoRes.json()) as BackendPaymentInfo

  // --- Period lock: no double-pay ---
  if (!isPeriodPayable(info.currentPeriodStatus)) {
    return sobre(409, 'PERIODO_NO_PAGABLE', MENSAJES_DE_LA_SESION_DE_PAGO.periodoNoPagable)
  }

  // --- Server-resolved amount (anti-tamper) ---
  if (!Number.isFinite(info.monthlyRent) || info.monthlyRent <= 0) {
    return sobre(502, 'MONTO_INVALIDO', MENSAJES_DE_LA_SESION_DE_PAGO.montoInvalido)
  }
  // «Centavos en todo» (C3-FRONT, P7 a): el valor va a Wompi EXACTO al
  // centavo ($1.234.567,29 → 123456729), sin pasar por `pesos * 100` en
  // flotante (`0.29 * 100 === 28.999999999999996`). La guarda de arriba ya
  // dejó sólo un número finito y positivo, lo único que `aCentavosWompi` acepta.
  const amountInCents = aCentavosWompi(info.monthlyRent)
  const currency = 'COP'
  // Una referencia por intento (`-<epochMs>`, Nico 02-10-2026): ver `buildRentReference`.
  const reference = buildRentReference(
    leaseId,
    info.currentPeriod.year,
    info.currentPeriod.month,
    Date.now()
  )

  // --- Integrity hash (server-only; secret never leaves this process) ---
  const integrity = computeWompiIntegrity(
    reference,
    amountInCents,
    currency,
    integritySecret
  )

  return NextResponse.json({ reference, amountInCents, currency, integrity, publicKey })
}
