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
 */

import { NextResponse } from 'next/server'

import type { BackendPaymentInfo } from '@/lib/api/leases.types'
import { computeWompiIntegrity } from '@/lib/payments/wompi-integrity'
import {
  buildRentReference,
  isPeriodPayable,
} from '@/lib/payments/wompi-rent-session'

export const runtime = 'nodejs'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'

export async function POST(req: Request) {
  // --- Parse and validate body (only leaseId is accepted — never an amount) ---
  let leaseId: string | undefined
  try {
    const body = (await req.json()) as { leaseId?: string }
    leaseId = body.leaseId
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!leaseId) {
    return NextResponse.json({ error: 'leaseId required' }, { status: 400 })
  }

  // --- Server-only env vars (no public prefix) ---
  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET
  const publicKey = process.env.WOMPI_PUBLIC_KEY

  if (!integritySecret || !publicKey) {
    return NextResponse.json({ error: 'wompi_not_configured' }, { status: 500 })
  }

  // --- Forward the tenant's JWT to the backend (auth + ownership enforcement) ---
  const authorization = req.headers.get('authorization') ?? ''
  if (!authorization) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // --- Resolve the authoritative amount + period status server-side ---
  const infoRes = await fetch(`${BACKEND_URL}/leases/${leaseId}/payment-info`, {
    headers: { Authorization: authorization, 'Content-Type': 'application/json' },
  })

  if (!infoRes.ok) {
    // Also enforces tenant ownership — backend rejects a lease not owned by the caller.
    return NextResponse.json(
      { error: 'payment_info_failed' },
      { status: infoRes.status }
    )
  }

  const info = (await infoRes.json()) as BackendPaymentInfo

  // --- Period lock: no double-pay ---
  if (!isPeriodPayable(info.currentPeriodStatus)) {
    return NextResponse.json({ error: 'period_not_payable' }, { status: 409 })
  }

  // --- Server-resolved amount (anti-tamper) ---
  if (!Number.isFinite(info.monthlyRent) || info.monthlyRent <= 0) {
    return NextResponse.json({ error: 'invalid_amount' }, { status: 502 })
  }
  const amountInCents = Math.round(info.monthlyRent * 100)
  const currency = 'COP'
  const reference = buildRentReference(
    leaseId,
    info.currentPeriod.year,
    info.currentPeriod.month
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
