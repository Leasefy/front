import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

const financialDataSchema = z.object({
  monthlyIncome: z.number().describe('Monthly net income in COP'),
  monthlyRent: z.number().describe('Monthly rent amount in COP'),
  employmentMonths: z.number().describe('Months at current employer'),
  contractType: z
    .enum(['indefinido', 'fijo', 'prestacion_servicios', 'independiente'])
    .describe('Employment contract type'),
  averageBankBalance: z.number().describe('Average bank balance in COP'),
})

const rentalHistorySchema = z.object({
  previousRentals: z.number().describe('Number of previous rentals'),
  paymentScore: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe('Historical payment compliance score'),
  references: z.number().optional().describe('Number of positive references'),
  evictions: z.number().optional().describe('Number of eviction records'),
})

const documentVerificationSchema = z.object({
  documentsProvided: z.number().describe('Number of documents submitted'),
  documentsRequired: z.number().describe('Number of required documents'),
  consistencyScore: z
    .number()
    .min(0)
    .max(100)
    .describe('Cross-document data consistency (0-100)'),
  fraudFlags: z.number().describe('Number of fraud indicators detected'),
})

const personalProfileSchema = z.object({
  yearsAtAddress: z.number().describe('Years at current address'),
  dependents: z.number().describe('Number of dependents'),
  hasCoSigner: z.boolean().describe('Whether a co-signer is provided'),
})

export const calculateScoreTool = createTool({
  id: 'calculate-score',
  description:
    'Calculates tenant score (0-100) with level A/B/C/D based on financial stability, rental history, document verification, and personal profile.',
  inputSchema: z.object({
    applicationId: z.string().describe('Application ID'),
    financial: financialDataSchema,
    rentalHistory: rentalHistorySchema,
    documentVerification: documentVerificationSchema,
    personalProfile: personalProfileSchema,
  }),
  outputSchema: z.object({
    score: z.number().min(0).max(100),
    level: z.enum(['A', 'B', 'C', 'D']),
    breakdown: z.object({
      financialStability: z.number(),
      rentalHistory: z.number(),
      documentVerification: z.number(),
      personalProfile: z.number(),
    }),
    flags: z.array(z.string()),
    recommendation: z.string(),
    escalate: z.boolean(),
    escalateReason: z.string().optional(),
  }),
  execute: async ({
    applicationId,
    financial,
    rentalHistory,
    documentVerification,
    personalProfile,
  }) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[calculate-score] Scoring application ${applicationId}`)
    }

    // --- Financial Stability (35%) ---
    let financialScore = 0

    // Guard against division by zero: if income is zero or negative, max penalty
    const rentToIncomeRatio = financial.monthlyIncome > 0
      ? financial.monthlyRent / financial.monthlyIncome
      : Infinity
    if (rentToIncomeRatio <= 0.25) financialScore += 40
    else if (rentToIncomeRatio <= 0.3) financialScore += 30
    else if (rentToIncomeRatio <= 0.4) financialScore += 15
    else financialScore += 0

    if (financial.contractType === 'indefinido') financialScore += 25
    else if (financial.contractType === 'fijo') financialScore += 15
    else if (financial.contractType === 'prestacion_servicios') financialScore += 10
    else financialScore += 5

    if (financial.employmentMonths >= 24) financialScore += 20
    else if (financial.employmentMonths >= 12) financialScore += 15
    else if (financial.employmentMonths >= 6) financialScore += 8
    else financialScore += 0

    if (financial.averageBankBalance >= financial.monthlyRent * 3) financialScore += 15
    else if (financial.averageBankBalance >= financial.monthlyRent * 2) financialScore += 10
    else financialScore += 0

    financialScore = Math.min(financialScore, 100)

    // --- Rental History (25%) ---
    let historyScore = 0
    if (rentalHistory.previousRentals >= 2) historyScore += 30
    else if (rentalHistory.previousRentals >= 1) historyScore += 15

    historyScore += (rentalHistory.paymentScore ?? 0) * 0.4

    if ((rentalHistory.references ?? 0) >= 2) historyScore += 15
    else if ((rentalHistory.references ?? 0) >= 1) historyScore += 8

    if ((rentalHistory.evictions ?? 0) > 0) historyScore -= 40

    historyScore = Math.max(0, Math.min(historyScore, 100))

    // --- Document Verification (25%) ---
    let docScore = 0
    const completeness = documentVerification.documentsRequired > 0
      ? (documentVerification.documentsProvided /
          documentVerification.documentsRequired) *
        40
      : 0
    docScore += completeness
    docScore += documentVerification.consistencyScore * 0.4

    if (documentVerification.fraudFlags > 0) {
      docScore -= documentVerification.fraudFlags * 20
    }

    docScore += 20 // base points for submitting documents
    docScore = Math.max(0, Math.min(docScore, 100))

    // --- Personal Profile (15%) ---
    let profileScore = 0
    if (personalProfile.yearsAtAddress >= 3) profileScore += 35
    else if (personalProfile.yearsAtAddress >= 1) profileScore += 20
    else profileScore += 5

    if (personalProfile.hasCoSigner) profileScore += 35
    profileScore += 30 // base points

    profileScore = Math.min(profileScore, 100)

    // --- Weighted Total ---
    const totalScore = Math.round(
      financialScore * 0.35 +
        historyScore * 0.25 +
        docScore * 0.25 +
        profileScore * 0.15,
    )

    // --- Level ---
    let level: 'A' | 'B' | 'C' | 'D'
    if (totalScore >= 80) level = 'A'
    else if (totalScore >= 60) level = 'B'
    else if (totalScore >= 40) level = 'C'
    else level = 'D'

    // --- Flags ---
    const flags: string[] = []
    if (rentToIncomeRatio > 0.3) flags.push('Arriendo supera 30% del ingreso')
    if (documentVerification.fraudFlags > 0) flags.push('Indicadores de fraude detectados')
    if ((rentalHistory.evictions ?? 0) > 0) flags.push('Historial de desahucios')
    if (financial.employmentMonths < 6) flags.push('Empleo reciente (< 6 meses)')
    if (documentVerification.consistencyScore < 50)
      flags.push('Baja consistencia documental')

    // --- Escalation ---
    const escalate =
      documentVerification.fraudFlags >= 2 ||
      totalScore < 30 ||
      documentVerification.consistencyScore < 30

    let escalateReason: string | undefined
    if (documentVerification.fraudFlags >= 2)
      escalateReason = 'Múltiples indicadores de fraude'
    else if (documentVerification.consistencyScore < 30)
      escalateReason = 'Consistencia documental muy baja'
    else if (totalScore < 30) escalateReason = 'Score extremadamente bajo'

    // --- Recommendation ---
    const recommendations: Record<string, string> = {
      A: 'Candidato excelente. Aprobación inmediata recomendada.',
      B: 'Buen candidato. Aprobación con verificación estándar.',
      C: 'Candidato con riesgo moderado. Solicitar codeudor o depósito adicional.',
      D: 'Candidato de alto riesgo. No se recomienda aprobar sin garantías adicionales significativas.',
    }

    return {
      score: totalScore,
      level,
      breakdown: {
        financialStability: Math.round(financialScore),
        rentalHistory: Math.round(historyScore),
        documentVerification: Math.round(docScore),
        personalProfile: Math.round(profileScore),
      },
      flags,
      recommendation: recommendations[level],
      escalate,
      escalateReason,
    }
  },
})
