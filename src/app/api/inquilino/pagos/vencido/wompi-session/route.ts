/**
 * «Pagar lo vencido» → sesión de Wompi (PAGO-ONLINE, Nico 04-10-2026).
 *
 * Mismas invariantes que `../../wompi-session/route.ts` (el canon del mes):
 *   - el secreto de integridad vive SÓLO aquí (servidor) y nunca sale;
 *   - el MONTO lo decide el back (`POST /portal/pago-en-linea/arriendos/:id`
 *     con el JWT del inquilino): el navegador sólo dice CUÁNTAS cuotas, de la
 *     más vieja a la más nueva; el back deja la solicitud PROCESSING con la
 *     referencia `vencido-<id>` y aquí sólo se firma lo que él devolvió;
 *   - los errores salen en el sobre del back (`{ statusCode, code, message }`).
 */
import { NextResponse } from 'next/server'

import { esIdentificadorSeguro } from '@/lib/utils/identificador-seguro'
import { computeWompiIntegrity } from '@/lib/payments/wompi-integrity'

export const runtime = 'nodejs'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'
const RECARGA = 'Recarga la página e intenta de nuevo.'

function sobre(statusCode: number, code: string, message: string | string[], extras: Record<string, unknown> = {}) {
  return NextResponse.json({ statusCode, code, message, ...extras }, { status: statusCode })
}

export async function POST(req: Request) {
  let leaseId: unknown
  let cuotas: unknown
  try {
    const body = (await req.json()) as { leaseId?: unknown; cuotas?: unknown }
    leaseId = body.leaseId
    cuotas = body.cuotas
  } catch {
    return sobre(400, 'DATOS_INVALIDOS', [`No pudimos leer el pedido de pago. ${RECARGA}`])
  }
  if (typeof leaseId !== 'string' || !esIdentificadorSeguro(leaseId)) {
    return sobre(400, 'DATOS_INVALIDOS', [`El arriendo que vas a pagar no es válido. ${RECARGA}`])
  }
  if (typeof cuotas !== 'number' || !Number.isInteger(cuotas) || cuotas < 1) {
    return sobre(400, 'DATOS_INVALIDOS', ['Escoge al menos una cuota.'], {
      campos: [{ campo: 'cuotas', regla: 'requerido', mensaje: 'Escoge al menos una cuota.' }],
    })
  }

  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET
  const publicKey = process.env.WOMPI_PUBLIC_KEY
  if (!integritySecret || !publicKey) {
    return sobre(
      503,
      'PAGOS_SIN_CONFIGURAR',
      'Los pagos en línea no están disponibles en este momento. No es nada que hayas hecho; prueba de nuevo más tarde o paga por transferencia con tu referencia de recaudo.',
      { servicio: 'pagos' },
    )
  }
  const authorization = req.headers.get('authorization') ?? ''
  if (!authorization) {
    return sobre(401, 'SESION_REQUERIDA', 'Tu sesión expiró. Vuelve a iniciar sesión para pagar.')
  }

  const res = await fetch(`${BACKEND_URL}/portal/pago-en-linea/arriendos/${leaseId}`, {
    method: 'POST',
    headers: { Authorization: authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({ cuotas }),
  })
  if (!res.ok) {
    // El sobre del back ya viene en español (409 PAGO_EN_VERIFICACION, 400 CUOTAS_INVALIDAS…).
    let cuerpo: Record<string, unknown> = {}
    try {
      cuerpo = (await res.json()) as Record<string, unknown>
    } catch {
      /* sin cuerpo: queda el status */
    }
    const status = res.status >= 400 && res.status <= 599 ? res.status : 502
    return sobre(
      status,
      typeof cuerpo.code === 'string' ? cuerpo.code : status >= 500 ? 'ERROR_INTERNO' : 'PAGO_NO_INICIADO',
      (cuerpo.message as string | string[] | undefined) ??
        (status >= 500
          ? 'No pudimos iniciar el pago: algo falló de nuestro lado. No es nada que hayas hecho; prueba de nuevo en un momento.'
          : `No pudimos iniciar el pago. ${RECARGA}`),
      typeof cuerpo.referencia === 'string' ? { referencia: cuerpo.referencia } : {},
    )
  }

  const iniciado = (await res.json()) as { reference: string; amountInCents: number; currency: string; totalCop: number }
  if (!Number.isInteger(iniciado.amountInCents) || iniciado.amountInCents <= 0 || !iniciado.reference) {
    return sobre(502, 'MONTO_INVALIDO', 'No pudimos calcular el valor del pago: algo falló de nuestro lado.')
  }
  const currency = 'COP'
  const integrity = computeWompiIntegrity(iniciado.reference, iniciado.amountInCents, currency, integritySecret)
  return NextResponse.json({
    reference: iniciado.reference,
    amountInCents: iniciado.amountInCents,
    currency,
    integrity,
    publicKey,
    totalCop: iniciado.totalCop,
  })
}
