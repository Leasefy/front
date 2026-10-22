/**
 * Pagar cuotas de UNO o VARIOS inmuebles en un solo pago → sesión de Wompi
 * (Nico, 21-10-2026: «como él quiera, si selecciona uno o dos o tres o los que
 * sea»).
 *
 * Mismas invariantes que `../../vencido/wompi-session/route.ts`:
 *   - el secreto de integridad vive SÓLO aquí (servidor) y nunca sale;
 *   - el MONTO lo decide el back (`POST /portal/pago-en-linea/varios` con el
 *     JWT del inquilino): el navegador sólo dice CUÁNTAS cuotas de cada
 *     inmueble, de la más vieja a la más nueva; el back deja una solicitud
 *     PROCESSING por inmueble y una sola referencia (`vencidos-<grupo>`, o
 *     `vencido-<id>` si es un inmueble), y aquí sólo se firma lo que él devolvió;
 *   - los errores salen en el sobre del back (`{ statusCode, code, message }`).
 */
import { NextResponse } from 'next/server'

import { esIdentificadorSeguro } from '@/lib/utils/identificador-seguro'
import { cabecerasDeLaCuentaQueLlegan } from '@/lib/payments/cabeceras-de-la-cuenta'
import { computeWompiIntegrity } from '@/lib/payments/wompi-integrity'

export const runtime = 'nodejs'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'
const RECARGA = 'Recarga la página e intenta de nuevo.'
/** El mismo tope del back (`MAXIMO_DE_ARRIENDOS_EN_UN_PAGO`). */
const MAXIMO_DE_INMUEBLES = 10

function sobre(statusCode: number, code: string, message: string | string[], extras: Record<string, unknown> = {}) {
  return NextResponse.json({ statusCode, code, message, ...extras }, { status: statusCode })
}

/** `[{ leaseId, cuotas }]` bien formado, o la frase de por qué no. */
function leerLasPartes(arriendos: unknown): { partes: { leaseId: string; cuotas: number }[] } | { error: string } {
  if (!Array.isArray(arriendos) || arriendos.length === 0) return { error: 'Escoge al menos una cuota.' }
  if (arriendos.length > MAXIMO_DE_INMUEBLES) {
    return { error: `Puedes pagar hasta ${MAXIMO_DE_INMUEBLES} inmuebles en un solo pago.` }
  }
  const partes: { leaseId: string; cuotas: number }[] = []
  for (const a of arriendos) {
    const leaseId = (a as { leaseId?: unknown })?.leaseId
    const cuotas = (a as { cuotas?: unknown })?.cuotas
    if (typeof leaseId !== 'string' || !esIdentificadorSeguro(leaseId)) {
      return { error: `Uno de los inmuebles que vas a pagar no es válido. ${RECARGA}` }
    }
    if (typeof cuotas !== 'number' || !Number.isInteger(cuotas) || cuotas < 1) return { error: 'Escoge al menos una cuota.' }
    partes.push({ leaseId, cuotas })
  }
  if (new Set(partes.map((p) => p.leaseId)).size !== partes.length) {
    return { error: `Cada inmueble va una sola vez en el pago. ${RECARGA}` }
  }
  return { partes }
}

export async function POST(req: Request) {
  let arriendos: unknown
  try {
    arriendos = ((await req.json()) as { arriendos?: unknown }).arriendos
  } catch {
    return sobre(400, 'DATOS_INVALIDOS', [`No pudimos leer el pedido de pago. ${RECARGA}`])
  }
  const leido = leerLasPartes(arriendos)
  if ('error' in leido) {
    return sobre(400, 'DATOS_INVALIDOS', [leido.error], {
      campos: [{ campo: 'arriendos', regla: 'requerido', mensaje: leido.error }],
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

  const res = await fetch(`${BACKEND_URL}/portal/pago-en-linea/varios`, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
      // «Cambiar de cuenta»: el back decide el papel con estas cabeceras; sin ellas una persona
      // que además es de una inmobiliaria no pasa el guard de inquilino.
      ...cabecerasDeLaCuentaQueLlegan(req),
    },
    body: JSON.stringify({ arriendos: leido.partes }),
  })
  if (!res.ok) {
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
      {
        ...(typeof cuerpo.referencia === 'string' ? { referencia: cuerpo.referencia } : {}),
        ...(typeof cuerpo.leaseId === 'string' ? { leaseId: cuerpo.leaseId } : {}),
      },
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
