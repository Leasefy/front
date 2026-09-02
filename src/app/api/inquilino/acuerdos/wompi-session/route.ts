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
 */

import { NextResponse } from 'next/server'

import { computeWompiIntegrity } from '@/lib/payments/wompi-integrity'
import type { AcuerdoDetail } from '@/lib/api/tenant-acuerdos.types'

export const runtime = 'nodejs'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'

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
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!planId) {
    return NextResponse.json({ error: 'planId required' }, { status: 400 })
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

  // --- Resolve the authoritative cuota amount server-side from the agent record ---
  const planRes = await fetch(`${BACKEND_URL}/cartera/payment-plans/${planId}`, {
    headers: { Authorization: authorization, 'Content-Type': 'application/json' },
  })

  if (!planRes.ok) {
    // Also enforces tenant ownership — the agent rejects a plan not owned by the caller.
    return NextResponse.json(
      { error: 'payment_plan_failed' },
      { status: planRes.status }
    )
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
    return NextResponse.json({ error: 'invalid_amount' }, { status: 502 })
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
