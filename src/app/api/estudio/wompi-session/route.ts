/**
 * Sesión de pago del estudio de aprobación (paso 3 del recorrido).
 *
 * Mismo patrón que `/api/avaluo/wompi-session`: el hash de integridad se
 * calcula SOLO acá. `WOMPI_INTEGRITY_SECRET` nunca puede llevar el prefijo
 * `NEXT_PUBLIC_` — calcularlo en el cliente filtraría el secreto.
 *
 * **Un solo precio, todas las aseguradoras.** Fue una decisión explícita: dar a
 * elegir cuántas aseguradoras consultar genera parálisis y pierde el negocio.
 *
 * El precio NO está hardcodeado. Sale de `ESTUDIO_PRECIO_COP` porque todavía no
 * está definido — la conversación cerró en "barato, uno solo, no monetizar el
 * estudio todavía" pero sin número. Inventar uno acá sería cobrarle a alguien
 * una cifra que nadie aprobó, así que sin la variable el endpoint responde
 * `estudio_precio_no_configurado` y la UI lo dice con todas las letras.
 */

import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  let solicitudId: string | undefined
  try {
    const body = (await req.json()) as { solicitudId?: string }
    solicitudId = body.solicitudId
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!solicitudId) {
    return NextResponse.json({ error: 'solicitudId required' }, { status: 400 })
  }

  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET
  const publicKey = process.env.WOMPI_PUBLIC_KEY

  if (!integritySecret || !publicKey) {
    return NextResponse.json({ error: 'wompi_not_configured' }, { status: 500 })
  }

  // Precio en pesos enteros; se convierte a centavos para Wompi.
  const precioCop = Number.parseInt(process.env.ESTUDIO_PRECIO_COP ?? '', 10)
  if (!Number.isInteger(precioCop) || precioCop <= 0) {
    return NextResponse.json({ error: 'estudio_precio_no_configurado' }, { status: 503 })
  }

  const amountInCents = precioCop * 100
  const currency = 'COP'
  const reference = 'estudio-' + solicitudId

  const integrity = createHash('sha256')
    .update(`${reference}${amountInCents}${currency}${integritySecret}`)
    .digest('hex')

  return NextResponse.json({ reference, amountInCents, currency, integrity, publicKey })
}
