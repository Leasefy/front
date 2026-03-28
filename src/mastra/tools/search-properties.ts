import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const searchPropertiesTool = createTool({
  id: 'search-properties',
  description:
    'Searches available properties in the agency portfolio with filters for zone, price range, type, and features.',
  inputSchema: z.object({
    agencyId: z.string().describe('Agency ID to search within'),
    minPrice: z.number().optional().describe('Minimum monthly rent in COP'),
    maxPrice: z.number().optional().describe('Maximum monthly rent in COP'),
    zone: z.string().optional().describe('Preferred zone or neighborhood'),
    propertyType: z
      .enum(['apartamento', 'casa', 'estudio', 'habitacion', 'local', 'oficina'])
      .optional()
      .describe('Type of property'),
    bedrooms: z.number().optional().describe('Minimum number of bedrooms'),
    excludePropertyId: z
      .string()
      .optional()
      .describe('Property ID to exclude (the one they already applied to)'),
    daysWithoutApplicants: z
      .number()
      .optional()
      .describe('Only show properties with no applicants for N+ days'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    properties: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        zone: z.string(),
        price: z.number(),
        propertyType: z.string(),
        bedrooms: z.number(),
        bathrooms: z.number(),
        area: z.number(),
        features: z.array(z.string()),
        daysListed: z.number(),
        applicantCount: z.number(),
        assignedAgentId: z.string().optional(),
      }),
    ),
    totalFound: z.number(),
    error: z.string().optional(),
  }),
  execute: async ({
    agencyId,
    minPrice,
    maxPrice,
    zone,
    propertyType,
    bedrooms,
    excludePropertyId,
    daysWithoutApplicants,
  }) => {
    try {
      const { db } = await import('@/lib/db')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = (db as any).property
      if (!model?.findMany) {
        console.warn('[search-properties] Prisma stub mode — returning empty')
        return { success: true, properties: [], totalFound: 0 }
      }

      // Build Prisma where clause
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {
        status: 'ACTIVE',
        ownerId: agencyId, // Properties owned by this agency
      }

      if (excludePropertyId) {
        where.id = { not: excludePropertyId }
      }

      if (minPrice || maxPrice) {
        where.priceMonthly = {}
        if (minPrice) where.priceMonthly.gte = minPrice
        if (maxPrice) where.priceMonthly.lte = maxPrice
      }

      if (zone) {
        where.neighborhood = { contains: zone, mode: 'insensitive' }
      }

      if (bedrooms) {
        where.bedrooms = { gte: bedrooms }
      }

      const properties = await model.findMany({
        where,
        include: {
          applications: {
            select: { id: true },
          },
          _count: {
            select: { applications: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      })

      const now = new Date()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped = properties.map((p: any) => {
        const daysListed = Math.floor(
          (now.getTime() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24),
        )
        const applicantCount = p._count?.applications ?? 0

        // Build features list from boolean fields
        const features: string[] = []
        if (p.petFriendly) features.push('mascotas')
        if (p.furnished) features.push('amoblado')
        if (p.parking) features.push('parqueadero')

        return {
          id: p.id,
          title: p.title,
          zone: p.neighborhood,
          price: p.priceMonthly,
          propertyType: propertyType ?? 'apartamento', // Schema doesn't have type yet
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          area: p.area,
          features,
          daysListed,
          applicantCount,
          assignedAgentId: undefined,
        }
      })

      // Filter by daysWithoutApplicants if specified
      let filtered = mapped
      if (daysWithoutApplicants) {
        filtered = mapped.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (p: any) => p.applicantCount === 0 && p.daysListed >= daysWithoutApplicants,
        )
      }

      return {
        success: true,
        properties: filtered,
        totalFound: filtered.length,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('[search-properties] Error:', errorMessage)
      return {
        success: false,
        properties: [],
        totalFound: 0,
        error: errorMessage,
      }
    }
  },
})
