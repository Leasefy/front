import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'

// =============================================================================
// SCHEMAS
// =============================================================================

const candidateProfileSchema = z.object({
  applicationId: z.string(),
  agencyId: z.string(),
  candidateId: z.string(),
  candidateName: z.string(),
  score: z.number(),
  level: z.enum(['A', 'B', 'C', 'D']),
  monthlyBudget: z.number(),
  preferredZone: z.string().nullable(),
  preferredType: z.string().nullable(),
  preferredBedrooms: z.number().nullable(),
  urgency: z.enum(['alta', 'media', 'baja']),
  originalPropertyId: z.string(),
  originalPropertyTitle: z.string(),
  trigger: z.string(),
})

const propertyMatchSchema = z.object({
  id: z.string(),
  title: z.string(),
  zone: z.string(),
  price: z.number(),
  bedrooms: z.number(),
  bathrooms: z.number(),
  area: z.number(),
  features: z.array(z.string()),
  daysListed: z.number(),
  applicantCount: z.number(),
})

const suggestionSchema = z.object({
  propertyId: z.string(),
  title: z.string(),
  zone: z.string(),
  price: z.number(),
  compatibility: z.number(),
  breakdown: z.object({
    affordability: z.number(),
    riskFit: z.number(),
    preferences: z.number(),
    acceptanceProbability: z.number(),
  }),
  mainReason: z.string(),
  viable: z.boolean(),
})

// =============================================================================
// STEP 1: Fetch Candidate Profile
// =============================================================================

const fetchCandidateProfile = createStep({
  id: 'fetch-candidate-profile',
  description: 'Retrieves candidate profile, score, and original application data',
  inputSchema: z.object({
    applicationId: z.string(),
    agencyId: z.string(),
    trigger: z.string().default('new_application'),
  }),
  outputSchema: candidateProfileSchema,
  execute: async ({ inputData }) => {
    const { db } = await import('@/lib/db')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const application = await (db as any).application.findUnique({
      where: { id: inputData.applicationId },
      include: {
        property: true,
        applicant: true,
        riskScore: true,
      },
    })

    if (!application) {
      throw new Error(`Application ${inputData.applicationId} not found`)
    }

    // If no score yet, use a default based on income ratio
    let score = application.riskScore?.totalScore ?? 50
    let level = application.riskScore?.level ?? 'C'

    // Estimate budget: income * 0.3 (30% rule) or declared preference
    const monthlyBudget = application.monthlyIncome
      ? Math.round(application.monthlyIncome * 0.35) // Slightly above 30% for flexibility
      : application.property?.priceMonthly ?? 0

    return {
      applicationId: application.id,
      agencyId: inputData.agencyId,
      candidateId: application.applicantId,
      candidateName: application.applicant?.name ?? 'Sin nombre',
      score,
      level: level as 'A' | 'B' | 'C' | 'D',
      monthlyBudget,
      preferredZone: application.property?.neighborhood ?? null,
      preferredType: null, // Schema doesn't have preference yet
      preferredBedrooms: application.property?.bedrooms ?? null,
      urgency: 'media' as const,
      originalPropertyId: application.propertyId,
      originalPropertyTitle: application.property?.title ?? 'N/A',
      trigger: inputData.trigger,
    }
  },
})

// =============================================================================
// STEP 2: Search Available Properties
// =============================================================================

const searchProperties = createStep({
  id: 'search-available-properties',
  description: 'Scans agency portfolio for available properties matching candidate criteria',
  inputSchema: candidateProfileSchema,
  outputSchema: candidateProfileSchema.extend({
    availableProperties: z.array(propertyMatchSchema),
  }),
  execute: async ({ inputData }) => {
    const { db } = await import('@/lib/db')

    // Build price range: budget -20% to +20%
    const minPrice = Math.round(inputData.monthlyBudget * 0.6)
    const maxPrice = Math.round(inputData.monthlyBudget * 1.2)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      status: 'ACTIVE',
      ownerId: inputData.agencyId,
      id: { not: inputData.originalPropertyId },
      priceMonthly: { gte: minPrice, lte: maxPrice },
    }

    // Prefer same zone but don't exclude others
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const properties = await (db as any).property.findMany({
      where,
      include: {
        _count: { select: { applications: true } },
      },
      orderBy: [
        // Prioritize same neighborhood, then by price
        { priceMonthly: 'asc' },
      ],
      take: 20,
    })

    const now = new Date()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped = properties.map((p: any) => ({
      id: p.id,
      title: p.title,
      zone: p.neighborhood,
      price: p.priceMonthly,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      area: p.area,
      features: [
        ...(p.petFriendly ? ['mascotas'] : []),
        ...(p.furnished ? ['amoblado'] : []),
        ...(p.parking ? ['parqueadero'] : []),
      ],
      daysListed: Math.floor(
        (now.getTime() - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24),
      ),
      applicantCount: p._count?.applications ?? 0,
    }))

    return {
      ...inputData,
      availableProperties: mapped,
    }
  },
})

// =============================================================================
// STEP 3: Calculate Compatibility for Each Property
// =============================================================================

const calculateCompatibilities = createStep({
  id: 'calculate-compatibilities',
  description: 'Calculates compatibility score for each available property',
  inputSchema: candidateProfileSchema.extend({
    availableProperties: z.array(propertyMatchSchema),
  }),
  outputSchema: candidateProfileSchema.extend({
    suggestions: z.array(suggestionSchema),
  }),
  execute: async ({ inputData }) => {
    const { availableProperties, ...profile } = inputData

    const scored = availableProperties.map((property) => {
      // --- Affordability (40%) ---
      let affordability = 0
      const priceRatio = profile.monthlyBudget > 0
        ? property.price / profile.monthlyBudget
        : Infinity
      if (priceRatio <= 0.8) affordability = 100
      else if (priceRatio <= 0.9) affordability = 85
      else if (priceRatio <= 1.0) affordability = 70
      else if (priceRatio <= 1.1) affordability = 40
      else if (priceRatio <= 1.2) affordability = 15
      else affordability = 0

      // --- Risk Fit (30%) ---
      let riskFit = 0
      const minScore = 50 // Default minimum
      const scoreDiff = profile.score - minScore
      if (scoreDiff >= 20) riskFit = 100
      else if (scoreDiff >= 10) riskFit = 80
      else if (scoreDiff >= 0) riskFit = 60
      else if (scoreDiff >= -10) riskFit = 30
      else riskFit = 0

      // --- Preferences (15%) ---
      let preferences = 0
      if (
        profile.preferredZone &&
        property.zone.toLowerCase().includes(profile.preferredZone.toLowerCase())
      ) {
        preferences += 50
      }
      if (
        profile.preferredBedrooms &&
        property.bedrooms >= profile.preferredBedrooms
      ) {
        preferences += 50
      }
      preferences = Math.min(preferences, 100)

      // --- Acceptance Probability (15%) ---
      let acceptance = 50
      if (property.applicantCount === 0) acceptance += 25
      if (property.daysListed > 14) acceptance += 15
      if (profile.urgency === 'alta') acceptance += 10
      acceptance = Math.min(acceptance, 100)

      // --- Weighted Total ---
      const compatibility = Math.round(
        affordability * 0.4 + riskFit * 0.3 + preferences * 0.15 + acceptance * 0.15,
      )

      // --- Main Reason ---
      const reasons = [
        { name: 'Precio dentro del presupuesto', value: affordability },
        { name: 'Perfil de riesgo compatible', value: riskFit },
        { name: 'Coincide con preferencias de zona/tipo', value: preferences },
        { name: 'Alta disponibilidad', value: acceptance },
      ]
      reasons.sort((a, b) => b.value - a.value)

      return {
        propertyId: property.id,
        title: property.title,
        zone: property.zone,
        price: property.price,
        compatibility,
        breakdown: {
          affordability,
          riskFit,
          preferences,
          acceptanceProbability: acceptance,
        },
        mainReason: reasons[0].name,
        viable: compatibility >= 40 && affordability >= 15,
      }
    })

    // Sort by compatibility descending, take top 3 viable
    const suggestions = scored
      .filter((s) => s.viable)
      .sort((a, b) => b.compatibility - a.compatibility)
      .slice(0, 3)

    return {
      ...profile,
      suggestions,
    }
  },
})

// =============================================================================
// STEP 4: Notify Candidate & Zone Agent
// =============================================================================

const notifyParties = createStep({
  id: 'notify-parties',
  description: 'Sends property suggestions to candidate and notifies zone agent',
  inputSchema: candidateProfileSchema.extend({
    suggestions: z.array(suggestionSchema),
  }),
  outputSchema: z.object({
    applicationId: z.string(),
    candidateName: z.string(),
    suggestionsCount: z.number(),
    suggestions: z.array(
      z.object({
        propertyId: z.string(),
        title: z.string(),
        zone: z.string(),
        price: z.number(),
        compatibility: z.number(),
        mainReason: z.string(),
      }),
    ),
    candidateNotified: z.boolean(),
    agentNotified: z.boolean(),
    trigger: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const sendTool = mastra?.getTool('send-notification')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const execSend = sendTool?.execute as ((input: any) => Promise<any>) | undefined

    let candidateNotified = false
    let agentNotified = false

    const simpleSuggestions = inputData.suggestions.map((s) => ({
      propertyId: s.propertyId,
      title: s.title,
      zone: s.zone,
      price: s.price,
      compatibility: s.compatibility,
      mainReason: s.mainReason,
    }))

    // --- Notify agency team (in-platform) ---
    if (inputData.suggestions.length > 0 && execSend) {
      // Matching results notification
      const matchResult = await execSend({
        recipientId: inputData.agencyId,
        templateId: inputData.trigger === 'rejection'
          ? 'application_rejected_alternatives'
          : 'match_suggestions',
        data: {
          applicationId: inputData.applicationId,
          candidateName: inputData.candidateName,
          propertyTitle: inputData.originalPropertyTitle,
          suggestions: simpleSuggestions,
        },
        agencyId: inputData.agencyId,
      })
      candidateNotified = matchResult.success

      // Lead assignment notification
      const leadResult = await execSend({
        recipientId: inputData.agencyId,
        templateId: 'lead_assigned',
        data: {
          applicationId: inputData.applicationId,
          candidateName: inputData.candidateName,
          propertyTitle: inputData.suggestions[0]?.title ?? 'N/A',
          score: inputData.score,
          compatibility: inputData.suggestions[0]?.compatibility ?? 0,
        },
        agencyId: inputData.agencyId,
      })
      agentNotified = leadResult.success
    }

    return {
      applicationId: inputData.applicationId,
      candidateName: inputData.candidateName,
      suggestionsCount: inputData.suggestions.length,
      suggestions: simpleSuggestions,
      candidateNotified,
      agentNotified,
      trigger: inputData.trigger,
    }
  },
})

// =============================================================================
// WORKFLOW: Smart Matching Pipeline
// =============================================================================

export const smartMatchingWorkflow = createWorkflow({
  id: 'smart-matching-pipeline',
  description:
    'Complete matching pipeline: fetch profile → search properties → calculate compatibility → notify',
  inputSchema: z.object({
    applicationId: z.string(),
    agencyId: z.string(),
    trigger: z.string().default('new_application'),
  }),
  outputSchema: z.object({
    applicationId: z.string(),
    candidateName: z.string(),
    suggestionsCount: z.number(),
    suggestions: z.array(
      z.object({
        propertyId: z.string(),
        title: z.string(),
        zone: z.string(),
        price: z.number(),
        compatibility: z.number(),
        mainReason: z.string(),
      }),
    ),
    candidateNotified: z.boolean(),
    agentNotified: z.boolean(),
    trigger: z.string(),
  }),
})
  .then(fetchCandidateProfile)
  .then(searchProperties)
  .then(calculateCompatibilities)
  .then(notifyParties)

smartMatchingWorkflow.commit()
