/**
 * WOMPI_INTEGRITY_SECRET must NEVER be prefixed NEXT_PUBLIC_
 * — computing the hash client-side leaks the secret. This route is the single
 * server-side source of the integrity hash.
 */

import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  // --- Parse and validate body ---
  let submissionId: string | undefined
  try {
    const body = (await req.json()) as { submissionId?: string }
    submissionId = body.submissionId
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!submissionId) {
    return NextResponse.json({ error: 'submissionId required' }, { status: 400 })
  }

  // --- Server-only env vars (no NEXT_PUBLIC_ prefix) ---
  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET
  const publicKey = process.env.WOMPI_PUBLIC_KEY

  if (!integritySecret || !publicKey) {
    return NextResponse.json({ error: 'wompi_not_configured' }, { status: 500 })
  }

  // --- Payment params ---
  const amountInCents = 5_000_000 // $50.000 COP
  const currency = 'COP'
  const reference = 'avaluo-' + submissionId

  // --- Integrity hash (Wompi spec: ref + amountInCents + currency + secret, no separators) ---
  const integrity = createHash('sha256')
    .update(`${reference}${amountInCents}${currency}${integritySecret}`)
    .digest('hex')

  return NextResponse.json({ reference, amountInCents, currency, integrity, publicKey })
}
