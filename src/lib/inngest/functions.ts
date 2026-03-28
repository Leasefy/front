import { inngest } from './client'
import { mastra } from '@/mastra'

// =============================================================================
// Event: application.submitted
// Triggers: Tenant Scoring → then Smart Matching
// =============================================================================

export const scoreThenMatch = inngest.createFunction(
  {
    id: 'score-then-match',
    name: 'Score Tenant → Match Properties',
    retries: 2,
    triggers: [{ event: 'application/submitted' }],
  },
  async ({ event, step }: { event: { data: { applicationId: string; agencyId: string } }; step: any }) => {
    const { applicationId, agencyId } = event.data

    // Step 1: Run tenant scoring pipeline
    const scoreResult = await step.run('tenant-scoring', async () => {
      const workflow = mastra.getWorkflow('tenant-scoring-pipeline')
      const run = await workflow.createRun()
      const result = await run.start({
        inputData: { applicationId, agencyId },
      })

      if (result.status !== 'success') {
        throw new Error(`Scoring failed: ${result.status}`)
      }

      return result.result
    })

    // Step 2: Run smart matching pipeline (only if not escalated)
    if (!scoreResult?.escalate) {
      const matchResult = await step.run('smart-matching', async () => {
        const workflow = mastra.getWorkflow('smart-matching-pipeline')
        const run = await workflow.createRun()
        const result = await run.start({
          inputData: {
            applicationId,
            agencyId,
            trigger: 'new_application',
          },
        })

        if (result.status !== 'success') {
          throw new Error(`Matching failed: ${result.status}`)
        }

        return result.result
      })

      return { scoring: scoreResult, matching: matchResult }
    }

    return {
      scoring: scoreResult,
      matching: null,
      note: 'Matching skipped — scoring was escalated for human review',
    }
  },
)

// =============================================================================
// Event: application.rejected
// Triggers: Smart Matching with rejection context
// =============================================================================

export const matchOnRejection = inngest.createFunction(
  {
    id: 'match-on-rejection',
    name: 'Find Alternatives After Rejection',
    retries: 2,
    triggers: [{ event: 'application/rejected' }],
  },
  async ({ event, step }: { event: { data: { applicationId: string; agencyId: string } }; step: any }) => {
    const { applicationId, agencyId } = event.data

    return await step.run('smart-matching-alternatives', async () => {
      const workflow = mastra.getWorkflow('smart-matching-pipeline')
      const run = await workflow.createRun()
      const result = await run.start({
        inputData: { applicationId, agencyId, trigger: 'rejection' },
      })

      if (result.status !== 'success') {
        throw new Error(`Matching failed: ${result.status}`)
      }

      return result.result
    })
  },
)

// =============================================================================
// Cron: Daily scan for properties with no applicants (7+ days)
// =============================================================================

export const dailyNoApplicantsScan = inngest.createFunction(
  {
    id: 'daily-no-applicants-scan',
    name: 'Daily Scan: Properties Without Applicants',
    retries: 1,
    triggers: [{ cron: '0 9 * * 1-5' }], // Monday-Friday at 9am
  },
  async ({ step }: { step: any }) => {
    // Step 1: Find properties with no applicants for 7+ days
    const staleProperties = await step.run('find-stale-properties', async () => {
      const { db } = await import('@/lib/db')

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const properties = await (db as any).property.findMany({
        where: {
          status: 'ACTIVE',
          createdAt: { lte: sevenDaysAgo },
          applications: { none: {} },
        },
        include: { owner: { select: { id: true } } },
        take: 20,
      })

      return properties
        .filter((p: any) => p.owner?.id)
        .map((p: any) => ({
          propertyId: p.id,
          title: p.title,
          agencyId: p.owner.id,
        }))
    })

    // Step 2: Notify agencies about stale properties
    if (staleProperties.length > 0) {
      await step.run('notify-stale-properties', async () => {
        const sendTool = mastra.getTool('send-notification')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const execSend = sendTool?.execute as ((input: any) => Promise<any>) | undefined
        if (!execSend) return { notified: 0 }

        let notified = 0
        for (const prop of staleProperties) {
          await execSend({
            recipientId: prop.agencyId,
            templateId: 'property_no_applicants',
            data: { propertyTitle: prop.title, daysListed: '7+' },
            agencyId: prop.agencyId,
          })
          notified++
        }
        return { notified }
      })
    }

    return { scanned: true, stalePropertiesFound: staleProperties.length }
  },
)
