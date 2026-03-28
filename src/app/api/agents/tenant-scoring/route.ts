import { NextResponse } from 'next/server'
import { mastra } from '@/mastra'
import { validateAgentRequest, unauthorizedResponse } from '../_middleware'

/**
 * POST /api/agents/tenant-scoring
 *
 * Triggers the Tenant Scoring workflow (deterministic pipeline):
 * 1. Fetch application data from DB
 * 2. OCR document extraction (Claude Vision)
 * 3. Cross-document consistency & fraud detection
 * 4. Calculate risk score (0-100, A/B/C/D)
 * 5. Generate natural language explanation (Claude)
 * 6. Store result in RiskScoreResult table
 *
 * Request body:
 * {
 *   applicationId: string   — ID of the submitted application
 *   agencyId: string        — Agency that owns the property
 * }
 */
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

    const workflow = mastra.getWorkflow('tenant-scoring-pipeline')
    const run = await workflow.createRun()

    const result = await run.start({
      inputData: { applicationId, agencyId },
    })

    // Extract the final step result
    if (result.status === 'success') {
      return NextResponse.json({
        success: true,
        ...(result.result as Record<string, unknown>),
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Workflow did not complete successfully',
        status: result.status,
      },
      { status: 500 },
    )
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('[tenant-scoring] API error:', errorMessage)

    return NextResponse.json(
      { error: 'Scoring pipeline failed', details: errorMessage },
      { status: 500 },
    )
  }
}
