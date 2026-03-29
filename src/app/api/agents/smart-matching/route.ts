import { NextResponse } from 'next/server'
import { mastra } from '@/mastra'
import { validateAgentRequest, unauthorizedResponse } from '../_middleware'

/**
 * POST /api/agents/smart-matching
 *
 * Triggers the Smart Matching workflow (deterministic pipeline):
 * 1. Fetch candidate profile + score
 * 2. Search available properties in portfolio
 * 3. Calculate compatibility per property
 * 4. Select top 3 and notify candidate + zone agent
 *
 * Request body:
 * {
 *   applicationId: string   — ID of the application
 *   agencyId: string        — Agency whose portfolio to scan
 *   trigger?: string        — "new_application" | "rejection" | "cron_no_applicants"
 * }
 */
export async function POST(req: Request) {
  const auth = validateAgentRequest(req)
  if (!auth.valid) return unauthorizedResponse(auth.error!)

  try {
    const body = await req.json()
    const { applicationId, agencyId, trigger } = body

    if (!applicationId || !agencyId) {
      return NextResponse.json(
        { error: 'applicationId and agencyId are required' },
        { status: 400 },
      )
    }

    const workflow = mastra.getWorkflow('smart-matching-pipeline')
    const run = await workflow.createRun()

    const result = await run.start({
      inputData: {
        applicationId,
        agencyId,
        trigger: trigger ?? 'new_application',
      },
    })

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
    if (process.env.NODE_ENV === 'development') {
      console.error('[smart-matching] API error:', errorMessage)
    }

    return NextResponse.json(
      { error: 'Matching pipeline failed', details: errorMessage },
      { status: 500 },
    )
  }
}
