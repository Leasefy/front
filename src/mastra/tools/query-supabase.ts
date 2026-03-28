import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

/**
 * Database query tool using Prisma.
 * Named "query-supabase" for backwards compatibility with agent instructions,
 * but actually queries PostgreSQL via Prisma ORM.
 *
 * Note: Uses dynamic import of db to avoid circular dependencies
 * and to work in both server component and API route contexts.
 */
export const querySupabaseTool = createTool({
  id: 'query-supabase',
  description:
    'Queries the database for application data, candidate profiles, property information, and scoring history using Prisma ORM.',
  inputSchema: z.object({
    table: z
      .enum([
        'applications',
        'users',
        'properties',
        'riskScoreResults',
        'applicationEvents',
      ])
      .describe('Database table/model to query'),
    filters: z
      .record(z.unknown())
      .describe(
        'Prisma where clause filters (e.g., { id: "abc123" } or { status: "SUBMITTED" })',
      ),
    include: z
      .record(z.boolean())
      .optional()
      .describe('Relations to include (e.g., { property: true, riskScore: true })'),
    limit: z.number().optional().describe('Max rows to return (default: 50)'),
    orderBy: z
      .record(z.enum(['asc', 'desc']))
      .optional()
      .describe('Sort order (e.g., { createdAt: "desc" })'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    data: z.array(z.record(z.unknown())),
    count: z.number(),
    error: z.string().optional(),
  }),
  execute: async ({ table, filters, include, limit, orderBy }) => {
    try {
      // Dynamic import to avoid issues with Prisma client in different contexts
      const { db } = await import('@/lib/db')

      const modelMap: Record<string, keyof typeof db> = {
        applications: 'application' as keyof typeof db,
        users: 'user' as keyof typeof db,
        properties: 'property' as keyof typeof db,
        riskScoreResults: 'riskScoreResult' as keyof typeof db,
        applicationEvents: 'applicationEvent' as keyof typeof db,
      }

      const modelName = modelMap[table]
      if (!modelName) {
        return { success: false, data: [], count: 0, error: `Unknown table: ${table}` }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = db[modelName] as any
      if (!model?.findMany) {
        return {
          success: false,
          data: [],
          count: 0,
          error: `Prisma client not available for model: ${table}. Ensure prisma generate has been run.`,
        }
      }

      const results = await model.findMany({
        where: filters,
        include: include ?? undefined,
        take: limit ?? 50,
        orderBy: orderBy ?? { createdAt: 'desc' },
      })

      return {
        success: true,
        data: JSON.parse(JSON.stringify(results)), // Serialize dates/BigInt
        count: results.length,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('[query-supabase] Error:', errorMessage)

      return {
        success: false,
        data: [],
        count: 0,
        error: errorMessage,
      }
    }
  },
})
