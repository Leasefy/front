import { NextResponse } from 'next/server'
import { validateAgentRequest, unauthorizedResponse } from '../_middleware'

/**
 * GET /api/agents/activity
 *
 * Returns recent ApplicationEvents where actorType='system',
 * mapped to the AgentActivity format for the activity feed.
 *
 * Query params:
 *   limit — max items to return (default 20, max 50)
 */
export async function GET(req: Request) {
  const auth = validateAgentRequest(req)
  if (!auth.valid) return unauthorizedResponse(auth.error!)

  try {
    const { db } = await import('@/lib/db')
    const url = new URL(req.url)
    const limit = Math.min(Number(url.searchParams.get('limit') || '20'), 50)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eventModel = (db as any).applicationEvent

    if (!eventModel?.findMany) {
      return NextResponse.json({ activities: [], source: 'fallback' })
    }

    const events = await eventModel.findMany({
      where: { actorType: 'system' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        application: {
          select: {
            id: true,
            documentNumber: true,
            applicant: { select: { name: true } },
            property: { select: { title: true, neighborhood: true } },
            riskScore: { select: { totalScore: true, level: true } },
          },
        },
      },
    })

    const activities = events.map((event: EventRow) => mapEventToActivity(event))

    return NextResponse.json({ activities, source: 'db' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (process.env.NODE_ENV === 'development') {
      console.error('[activity] API error:', msg)
    }
    return NextResponse.json({ activities: [], source: 'error' }, { status: 500 })
  }
}

// =============================================================================
// Mapping
// =============================================================================

interface EventRow {
  id: string
  type: string
  metadata: Record<string, unknown> | null
  createdAt: Date | string
  applicationId: string
  application: {
    id: string
    documentNumber: string | null
    applicant: { name: string | null } | null
    property: { title: string | null; neighborhood: string | null } | null
    riskScore: { totalScore: number; level: string } | null
  } | null
}

/**
 * Maps event types to the agent that produced them and to an activity type.
 */
function resolveAgent(eventType: string): { agentId: string; agentName: string } {
  if (
    eventType.startsWith('score_') ||
    eventType === 'notification_scoring_complete' ||
    eventType === 'score_calculated'
  ) {
    return { agentId: 'tenant-scoring', agentName: 'Evaluacion de Inquilinos' }
  }
  if (
    eventType.startsWith('match_') ||
    eventType === 'notification_match_suggestions' ||
    eventType === 'notification_lead_assigned'
  ) {
    return { agentId: 'smart-matching', agentName: 'Matching Inteligente' }
  }
  // Default: assign based on event content
  if (eventType === 'status_change') {
    return { agentId: 'tenant-scoring', agentName: 'Evaluacion de Inquilinos' }
  }
  return { agentId: 'tenant-scoring', agentName: 'Evaluacion de Inquilinos' }
}

function resolveActivityType(eventType: string): 'execution' | 'notification' | 'escalation' | 'error' {
  if (eventType.startsWith('notification_')) return 'notification'
  if (eventType === 'escalation' || eventType === 'human_review_required') return 'escalation'
  if (eventType === 'error' || eventType === 'agent_error') return 'error'
  return 'execution'
}

function resolveStatus(eventType: string, metadata: Record<string, unknown> | null): 'success' | 'pending' | 'failed' {
  if (eventType === 'error' || eventType === 'agent_error') return 'failed'
  if (eventType === 'escalation' || eventType === 'human_review_required') return 'pending'
  if (metadata && typeof metadata === 'object' && 'escalate' in metadata && metadata.escalate) return 'pending'
  return 'success'
}

function buildTitle(event: EventRow): string {
  const app = event.application
  const doc = app?.documentNumber ? `CC ${app.documentNumber}` : ''
  const name = app?.applicant?.name || ''

  switch (event.type) {
    case 'score_calculated':
      return doc ? `${doc} evaluado` : 'Aplicante evaluado'
    case 'notification_scoring_complete':
      return 'Resultado de evaluacion enviado'
    case 'notification_match_suggestions':
      return 'Sugerencias de propiedades enviadas'
    case 'notification_lead_assigned':
      return 'Lead asignado a agente de zona'
    case 'status_change':
      return `Estado actualizado${name ? ` — ${name}` : ''}`
    case 'escalation':
    case 'human_review_required':
      return 'Escalado a revision humana'
    default:
      return event.type.replace(/_/g, ' ')
  }
}

function buildDescription(event: EventRow): string | undefined {
  const app = event.application
  const score = app?.riskScore
  const name = app?.applicant?.name || ''
  const meta = event.metadata as Record<string, unknown> | null

  switch (event.type) {
    case 'score_calculated':
      if (score) return `${name} — Score ${score.totalScore}/100 (Nivel ${score.level})`
      return name || undefined
    case 'notification_match_suggestions': {
      const count = meta?.suggestionsCount
      const property = app?.property
      if (count && property) return `${count} propiedades sugeridas cerca de ${property.neighborhood}`
      if (count) return `${count} propiedades compatibles encontradas`
      return undefined
    }
    case 'notification_lead_assigned': {
      const zone = app?.property?.neighborhood
      return zone ? `Zona: ${zone}` : undefined
    }
    case 'escalation':
    case 'human_review_required':
      return meta?.reason as string | undefined
    default:
      return undefined
  }
}

function mapEventToActivity(event: EventRow) {
  const { agentId, agentName } = resolveAgent(event.type)
  const score = event.application?.riskScore
  const meta = event.metadata as Record<string, unknown> | null

  return {
    id: event.id,
    agentId,
    agentName,
    type: resolveActivityType(event.type),
    title: buildTitle(event),
    description: buildDescription(event),
    status: resolveStatus(event.type, meta),
    timestamp: event.createdAt,
    metadata: {
      applicationId: event.applicationId,
      ...(score ? { score: score.totalScore, level: score.level } : {}),
      ...(meta?.durationMs ? { durationMs: meta.durationMs as number } : {}),
      ...(meta?.result ? { result: meta.result as string } : {}),
    },
  }
}
