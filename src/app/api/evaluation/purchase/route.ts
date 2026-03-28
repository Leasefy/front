// ============================================================================
// POST /api/evaluation/purchase
// ============================================================================
// Triggers the tenant scoring workflow for an application.
//
// In the future, payment processing will happen before scoring.
// For now this acts as a proxy to the scoring workflow with "purchase"
// semantics — the caller indicates intent to evaluate a candidate.
//
// REQUEST:
//   Headers: Authorization: Bearer <token> (or x-api-key in production)
//   Body: {
//     applicationId: string;
//     agencyId: string;
//   }
//
// RESPONSE (201):
//   {
//     success: true;
//     score: number;
//     level: 'A' | 'B' | 'C' | 'D';
//     recommendation: string;
//     explanation: string;
//     verificationCode: string | null;
//     escalate: boolean;
//     storedSuccessfully: boolean;
//   }
//
// ERROR HANDLING:
//   400 — Bad request (missing fields)
//   401 — Unauthorized
//   409 — Conflict (evaluation already exists for this application)
//   500 — Internal server error (workflow failure)
// ============================================================================

import { NextResponse } from 'next/server'
import { mastra } from '@/mastra'
import { validateAgentRequest, unauthorizedResponse } from '@/app/api/agents/_middleware'

export async function POST(req: Request) {
  const auth = validateAgentRequest(req)
  if (!auth.valid) return unauthorizedResponse(auth.error!)

  try {
    const body = await req.json()
    const { applicationId, agencyId } = body

    if (!applicationId || !agencyId) {
      return NextResponse.json(
        { error: 'applicationId and agencyId are required' },
        { status: 400 },
      )
    }

    // Check if an evaluation already exists for this application
    try {
      const { db } = await import('@/lib/db')
      const riskModel = (db as any).riskScoreResult

      if (riskModel?.findFirst) {
        const existing = await riskModel.findFirst({
          where: { applicationId },
          select: { id: true, totalScore: true, level: true, createdAt: true },
        })

        if (existing) {
          return NextResponse.json(
            {
              error: 'Evaluation already exists for this application',
              existingEvaluation: {
                id: existing.id,
                score: existing.score,
                level: existing.level,
                createdAt: existing.createdAt,
              },
            },
            { status: 409 },
          )
        }
      }
    } catch (dbErr) {
      // If DB check fails, proceed anyway — the workflow will handle storage
      console.warn('[evaluation/purchase] DB check failed, proceeding:', dbErr)
    }

    // Run the tenant scoring workflow
    const workflow = mastra.getWorkflow('tenant-scoring-pipeline')
    const run = await workflow.createRun()

    const result = await run.start({
      inputData: { applicationId, agencyId },
    })

    if (result.status === 'success') {
      const data = result.result as Record<string, unknown>

      // Retrieve the verification code from the stored result
      let verificationCode: string | null = null
      try {
        const { db } = await import('@/lib/db')
        const riskModel = (db as any).riskScoreResult

        if (riskModel?.findFirst) {
          const stored = await riskModel.findFirst({
            where: { applicationId },
            select: { featuresJson: true },
            orderBy: { createdAt: 'desc' },
          })

          const featuresJson = stored?.featuresJson as Record<string, unknown> | null
          verificationCode = (featuresJson?.verificationCode as string) ?? null
        }
      } catch {
        // Verification code retrieval is non-critical
      }

      return NextResponse.json(
        {
          success: true,
          score: data.score,
          level: data.level,
          recommendation: data.recommendation,
          explanation: data.explanation,
          verificationCode,
          escalate: data.escalate ?? false,
          storedSuccessfully: data.storedSuccessfully ?? false,
        },
        { status: 201 },
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Scoring workflow did not complete successfully',
        status: result.status,
      },
      { status: 500 },
    )
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('[evaluation/purchase] Error:', errorMessage)

    return NextResponse.json(
      { error: 'Evaluation purchase failed', details: errorMessage },
      { status: 500 },
    )
  }
}
