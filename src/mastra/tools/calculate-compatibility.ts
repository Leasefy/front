import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const calculateCompatibilityTool = createTool({
  id: 'calculate-compatibility',
  description:
    'Calculates compatibility percentage between a candidate and a property based on affordability, risk fit, preferences, and acceptance probability.',
  inputSchema: z.object({
    candidateProfile: z.object({
      id: z.string(),
      score: z.number().min(0).max(100),
      level: z.enum(['A', 'B', 'C', 'D']),
      monthlyBudget: z.number().describe('Max budget in COP'),
      preferredZone: z.string().optional(),
      preferredType: z.string().optional(),
      preferredBedrooms: z.number().optional(),
      urgency: z.enum(['alta', 'media', 'baja']).optional(),
    }),
    property: z.object({
      id: z.string(),
      price: z.number().describe('Monthly rent in COP'),
      zone: z.string(),
      propertyType: z.string(),
      bedrooms: z.number(),
      minScoreRequired: z.number().optional().describe('Minimum tenant score required'),
      daysListed: z.number(),
      applicantCount: z.number(),
    }),
  }),
  outputSchema: z.object({
    compatibilityScore: z.number().min(0).max(100),
    breakdown: z.object({
      affordability: z.number(),
      riskFit: z.number(),
      preferences: z.number(),
      acceptanceProbability: z.number(),
    }),
    mainReason: z.string(),
    viable: z.boolean(),
  }),
  execute: async ({ candidateProfile, property }) => {
    // --- Affordability (40%) ---
    let affordability = 0

    // Guard against division by zero: if budget is zero, property is unaffordable
    const priceRatio = candidateProfile.monthlyBudget > 0
      ? property.price / candidateProfile.monthlyBudget
      : Infinity
    if (priceRatio <= 0.8) affordability = 100
    else if (priceRatio <= 0.9) affordability = 85
    else if (priceRatio <= 1.0) affordability = 70
    else if (priceRatio <= 1.1) affordability = 40
    else if (priceRatio <= 1.2) affordability = 15
    else affordability = 0

    // --- Risk Fit (30%) ---
    let riskFit = 0
    const minScore = property.minScoreRequired ?? 50
    const scoreDiff = candidateProfile.score - minScore
    if (scoreDiff >= 20) riskFit = 100
    else if (scoreDiff >= 10) riskFit = 80
    else if (scoreDiff >= 0) riskFit = 60
    else if (scoreDiff >= -10) riskFit = 30
    else riskFit = 0

    // --- Preferences (15%) ---
    let preferences = 0
    if (
      candidateProfile.preferredZone &&
      property.zone.toLowerCase().includes(candidateProfile.preferredZone.toLowerCase())
    ) {
      preferences += 40
    }
    if (
      candidateProfile.preferredType &&
      property.propertyType === candidateProfile.preferredType
    ) {
      preferences += 35
    }
    if (
      candidateProfile.preferredBedrooms &&
      property.bedrooms >= candidateProfile.preferredBedrooms
    ) {
      preferences += 25
    }
    preferences = Math.min(preferences, 100)

    // --- Acceptance Probability (15%) ---
    let acceptance = 50 // base
    if (property.applicantCount === 0) acceptance += 25
    if (property.daysListed > 14) acceptance += 15
    if (candidateProfile.urgency === 'alta') acceptance += 10
    acceptance = Math.min(acceptance, 100)

    // --- Weighted Total ---
    const compatibilityScore = Math.round(
      affordability * 0.4 + riskFit * 0.3 + preferences * 0.15 + acceptance * 0.15,
    )

    // --- Main Reason ---
    const scores = [
      { name: 'Precio dentro del presupuesto', value: affordability },
      { name: 'Perfil de riesgo compatible', value: riskFit },
      { name: 'Coincide con preferencias', value: preferences },
      { name: 'Alta probabilidad de disponibilidad', value: acceptance },
    ]
    scores.sort((a, b) => b.value - a.value)

    const viable = compatibilityScore >= 40 && affordability >= 15

    return {
      compatibilityScore,
      breakdown: {
        affordability,
        riskFit,
        preferences,
        acceptanceProbability: acceptance,
      },
      mainReason: scores[0].name,
      viable,
    }
  },
})
