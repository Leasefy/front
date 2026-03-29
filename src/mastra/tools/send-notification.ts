import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

// =============================================================================
// Notification Templates (Spanish — shown in-platform to agency team)
// =============================================================================

const TEMPLATES: Record<string, { title: string; body: (data: Record<string, unknown>) => string }> = {
  scoring_complete: {
    title: 'Evaluación completada',
    body: (data) =>
      `La evaluación del candidato ${data.candidateName ?? 'N/A'} para la propiedad ${data.propertyTitle ?? 'N/A'} ha sido completada.\n\nResultado: ${data.level ?? 'N/A'} (${data.score ?? 0}/100)\nRecomendación: ${data.recommendation ?? 'Ver detalles en el panel'}`,
  },
  scoring_escalated: {
    title: 'Evaluación requiere revisión manual',
    body: (data) =>
      `La evaluación del candidato ${data.candidateName ?? 'N/A'} ha sido escalada para revisión humana.\n\nRazón: ${data.escalateReason ?? 'Revisar manualmente'}\nScore provisional: ${data.score ?? 0}/100`,
  },
  match_suggestions: {
    title: 'Propiedades compatibles encontradas',
    body: (data) => {
      const suggestions = (data.suggestions as Array<{ title: string; compatibility: number; mainReason: string }>) ?? []
      const list = suggestions
        .map((s, i) => `${i + 1}. ${s.title} — ${s.compatibility}% compatible (${s.mainReason})`)
        .join('\n')
      return `Se encontraron ${suggestions.length} propiedades compatibles para ${data.candidateName ?? 'el candidato'}:\n\n${list}`
    },
  },
  lead_assigned: {
    title: 'Nuevo lead asignado',
    body: (data) =>
      `Candidato: ${data.candidateName ?? 'N/A'}\nPropiedad: ${data.propertyTitle ?? 'N/A'}\nScore: ${data.score ?? 'N/A'}/100\nCompatibilidad: ${data.compatibility ?? 'N/A'}%`,
  },
  application_rejected_alternatives: {
    title: 'Candidato rechazado — alternativas disponibles',
    body: (data) =>
      `La aplicación de ${data.candidateName ?? 'el candidato'} para ${data.propertyTitle ?? 'la propiedad'} no fue aprobada. Se están buscando alternativas compatibles.`,
  },
  property_no_applicants: {
    title: 'Propiedad sin aplicantes',
    body: (data) =>
      `"${data.propertyTitle ?? 'N/A'}" lleva ${data.daysListed ?? '7+'} días sin recibir aplicantes.\n\nSugerencias: revisar precio, actualizar fotos, ajustar requisitos.`,
  },
}

export const sendNotificationTool = createTool({
  id: 'send-notification',
  description:
    'Creates in-platform notifications for the agency team. All results are shown within the Leasefy dashboard.',
  inputSchema: z.object({
    recipientId: z.string().describe('User/agent ID to notify'),
    templateId: z
      .enum([
        'scoring_complete',
        'scoring_escalated',
        'match_suggestions',
        'lead_assigned',
        'application_rejected_alternatives',
        'property_no_applicants',
      ])
      .describe('Notification template to use'),
    data: z.record(z.unknown()).describe('Template variables to interpolate'),
    agencyId: z.string().describe('Agency ID'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    notificationId: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ recipientId, templateId, data, agencyId }) => {
    const template = TEMPLATES[templateId]
    if (!template) {
      return { success: false, error: `Unknown template: ${templateId}` }
    }

    const title = template.title
    const body = template.body(data)

    if (process.env.NODE_ENV === 'development') {
      console.log(`[notification] ${templateId} → ${recipientId} (agency: ${agencyId})`)
    }

    try {
      const { db } = await import('@/lib/db')

      // Store as ApplicationEvent if we have an applicationId
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const eventModel = (db as any).applicationEvent
      if (eventModel?.create && data.applicationId) {
        await eventModel.create({
          data: {
            applicationId: data.applicationId as string,
            type: `notification_${templateId}`,
            actorType: 'system',
            metadata: {
              recipientId,
              title,
              body,
              templateId,
              agencyId,
            },
          },
        })

        return {
          success: true,
          notificationId: `notif_${Date.now()}`,
        }
      }

      // Fallback: log only (no applicationId context)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[notification] ${title}: ${body}`)
      }

      return {
        success: true,
        notificationId: `notif_${Date.now()}`,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'DB error'
      return { success: false, error: errorMessage }
    }
  },
})
