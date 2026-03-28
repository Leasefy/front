// ============================================================================
// GET /api/evaluation/:id
// ============================================================================
// Returns a specific evaluation (RiskScoreResult) for an application.
//
// REQUEST:
//   Headers: Authorization: Bearer <token> (or x-api-key in production)
//   Params: id — the application UUID
//
// RESPONSE (200):
//   {
//     id: string;
//     applicationId: string;
//     score: number;
//     level: 'A' | 'B' | 'C' | 'D';
//     breakdown: { ... };
//     drivers: string[];
//     flags: string[];
//     conditions: string[];
//     explanation: string;
//     verificationCode: string | null;
//     createdAt: string;
//     application: { ... } | null;
//     property: { ... } | null;
//   }
//
// ERROR HANDLING:
//   401 — Unauthorized
//   404 — Not found
//   500 — Internal server error
// ============================================================================

import { NextResponse } from 'next/server'
import { validateAgentRequest, unauthorizedResponse } from '@/app/api/agents/_middleware'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = validateAgentRequest(req)
  if (!auth.valid) return unauthorizedResponse(auth.error!)

  const { id: applicationId } = await params

  if (!applicationId) {
    return NextResponse.json(
      { error: 'Application ID is required' },
      { status: 400 },
    )
  }

  try {
    const { db } = await import('@/lib/db')

    const riskModel = (db as any).riskScoreResult

    if (!riskModel?.findFirst) {
      return NextResponse.json(
        { error: 'Evaluation service unavailable' },
        { status: 503 },
      )
    }

    const score = await riskModel.findFirst({
      where: { applicationId },
      include: {
        application: {
          select: {
            id: true,
            documentNumber: true,
            monthlyIncome: true,
            contractType: true,
            status: true,
            applicant: { select: { id: true, name: true, email: true } },
            property: {
              select: {
                id: true,
                title: true,
                city: true,
                priceMonthly: true,
                neighborhood: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!score) {
      return NextResponse.json(
        { error: 'Evaluation not found for this application' },
        { status: 404 },
      )
    }

    // Extract verification code from featuresJson if present
    const featuresJson = score.featuresJson as Record<string, unknown> | null
    const verificationCode = featuresJson?.verificationCode ?? null

    return NextResponse.json({
      id: score.id,
      applicationId: score.applicationId,
      score: score.score,
      level: score.level,
      breakdown: score.breakdown,
      drivers: score.drivers,
      flags: score.flags,
      conditions: score.conditions,
      explanation: score.explanation,
      verificationCode,
      createdAt: score.createdAt,
      application: score.application ?? null,
      property: score.application?.property ?? null,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[evaluation/get] Error:', msg)
    return NextResponse.json(
      { error: 'Failed to fetch evaluation', details: msg },
      { status: 500 },
    )
  }
}
