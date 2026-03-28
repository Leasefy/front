import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'

// =============================================================================
// SCHEMAS — shared between steps
// =============================================================================

const applicationDataSchema = z.object({
  applicationId: z.string(),
  agencyId: z.string(),
  applicantName: z.string(),
  documentType: z.string().nullable(),
  documentNumber: z.string().nullable(),
  monthlyIncome: z.number().nullable(),
  employmentMonths: z.number().nullable(),
  contractType: z.string().nullable(),
  monthlyDebt: z.number().nullable(),
  monthlyExpenses: z.number().nullable(),
  hasCosigner: z.boolean(),
  currentAddressMonths: z.number().nullable(),
  identityDocUrl: z.string().nullable(),
  incomeProofUrl: z.string().nullable(),
  propertyId: z.string(),
  propertyPrice: z.number(),
  previousRentals: z.number(),
})

const extractedDocsSchema = z.object({
  identity: z.record(z.unknown()).nullable(),
  incomeProof: z.record(z.unknown()).nullable(),
  identityConfidence: z.number(),
  incomeConfidence: z.number(),
})

const consistencyResultSchema = z.object({
  consistencyScore: z.number().min(0).max(100),
  fraudFlags: z.array(z.string()),
  details: z.array(z.string()),
})

const scoreResultSchema = z.object({
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
})

const explanationSchema = z.object({
  explanation: z.string(),
  driversJson: z.array(
    z.object({
      text: z.string(),
      impact: z.enum(['positive', 'negative', 'neutral']),
      weight: z.number(),
    }),
  ),
  conditionsJson: z.array(
    z.object({
      type: z.string(),
      text: z.string(),
    }),
  ),
})

// =============================================================================
// STEP 1: Fetch Application Data
// =============================================================================

const fetchApplicationData = createStep({
  id: 'fetch-application-data',
  description: 'Retrieves application, applicant, and property data from the database',
  inputSchema: z.object({
    applicationId: z.string(),
    agencyId: z.string(),
  }),
  outputSchema: applicationDataSchema,
  execute: async ({ inputData }) => {
    const { db } = await import('@/lib/db')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const application = await (db as any).application.findUnique({
      where: { id: inputData.applicationId },
      include: { property: true, applicant: true },
    })

    if (!application) {
      throw new Error(`Application ${inputData.applicationId} not found`)
    }

    // Status validation — only score SUBMITTED applications
    const validStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_INFO']
    if (!validStatuses.includes(application.status)) {
      throw new Error(
        `Application ${inputData.applicationId} has status "${application.status}" — only SUBMITTED, UNDER_REVIEW, or NEEDS_INFO can be scored`,
      )
    }

    return {
      applicationId: application.id,
      agencyId: inputData.agencyId,
      applicantName: application.applicant?.name ?? 'Sin nombre',
      documentType: application.documentType,
      documentNumber: application.documentNumber,
      monthlyIncome: application.monthlyIncome,
      employmentMonths: application.employmentMonths,
      contractType: application.contractType,
      monthlyDebt: application.monthlyDebt,
      monthlyExpenses: application.monthlyExpenses,
      hasCosigner: application.hasCosigner ?? false,
      currentAddressMonths: application.currentAddressMonths,
      identityDocUrl: application.identityDocUrl,
      incomeProofUrl: application.incomeProofUrl,
      propertyId: application.propertyId,
      propertyPrice: application.property?.priceMonthly ?? 0,
      previousRentals: 0, // TODO: query from historical data
    }
  },
})

// =============================================================================
// STEP 2: Extract Documents (OCR)
// =============================================================================

const extractDocuments = createStep({
  id: 'extract-documents',
  description: 'Extracts data from uploaded documents using Claude Vision OCR',
  inputSchema: applicationDataSchema,
  outputSchema: applicationDataSchema.extend({
    extractedDocs: extractedDocsSchema,
  }),
  execute: async ({ inputData, mastra }) => {
    let identity: Record<string, unknown> | null = null
    let incomeProof: Record<string, unknown> | null = null
    let identityConfidence = 0
    let incomeConfidence = 0

    const extractTool = mastra?.getTool('extract-document')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const execExtract = extractTool?.execute as ((input: any) => Promise<any>) | undefined

    // Extract identity document if available
    if (inputData.identityDocUrl && execExtract) {
      const result = await execExtract({
        documentUrl: inputData.identityDocUrl,
        documentType: 'cedula',
        applicationId: inputData.applicationId,
      })
      if (result.success) {
        identity = result.extractedData
        identityConfidence = result.confidence
      }
    }

    // Extract income proof if available
    if (inputData.incomeProofUrl && execExtract) {
      // Detect if it's a certificación laboral or extracto bancario
      const docType = inputData.incomeProofUrl.includes('extracto')
        ? 'extracto_bancario'
        : 'certificacion_laboral'

      const result = await execExtract({
        documentUrl: inputData.incomeProofUrl,
        documentType: docType,
        applicationId: inputData.applicationId,
      })
      if (result.success) {
        incomeProof = result.extractedData
        incomeConfidence = result.confidence
      }
    }

    return {
      ...inputData,
      extractedDocs: {
        identity,
        incomeProof,
        identityConfidence,
        incomeConfidence,
      },
    }
  },
})

// =============================================================================
// STEP 3: Cross-Document Consistency & Fraud Detection
// =============================================================================

const checkConsistency = createStep({
  id: 'check-consistency',
  description:
    'Validates data consistency across documents and application form, detects fraud indicators',
  inputSchema: applicationDataSchema.extend({
    extractedDocs: extractedDocsSchema,
  }),
  outputSchema: applicationDataSchema.extend({
    extractedDocs: extractedDocsSchema,
    consistency: consistencyResultSchema,
  }),
  execute: async ({ inputData }) => {
    const flags: string[] = []
    const details: string[] = []
    let score = 100 // Start at 100, deduct for inconsistencies

    const { extractedDocs, ...appData } = inputData
    const { identity, incomeProof } = extractedDocs

    // --- Identity Document Checks ---
    if (identity) {
      // Check document number matches application
      if (
        appData.documentNumber &&
        identity.numero &&
        String(identity.numero) !== String(appData.documentNumber)
      ) {
        flags.push('DOCUMENT_NUMBER_MISMATCH')
        details.push(
          `Número de documento no coincide: formulario=${appData.documentNumber}, cédula=${identity.numero}`,
        )
        score -= 30
      }
    }

    // --- Income Proof Checks ---
    if (incomeProof) {
      const declaredIncome = appData.monthlyIncome ?? 0

      // Check salary from certificación laboral
      if (incomeProof.salarioMensual && declaredIncome > 0) {
        const certSalary = Number(incomeProof.salarioMensual)
        const variance = Math.abs(certSalary - declaredIncome) / declaredIncome

        if (variance > 0.2) {
          flags.push('INCOME_MISMATCH_CERT')
          details.push(
            `Salario declarado (${declaredIncome.toLocaleString('es-CO')} COP) vs certificación (${certSalary.toLocaleString('es-CO')} COP) — diferencia ${(variance * 100).toFixed(0)}%`,
          )
          score -= 25
        } else {
          details.push('Salario consistente entre formulario y certificación laboral')
        }
      }

      // Check income from bank statements
      if (incomeProof.totalIngresos && declaredIncome > 0) {
        const bankIncome = Number(incomeProof.totalIngresos)
        const variance = Math.abs(bankIncome - declaredIncome) / declaredIncome

        if (variance > 0.3) {
          flags.push('INCOME_MISMATCH_BANK')
          details.push(
            `Ingresos declarados vs extracto bancario — diferencia ${(variance * 100).toFixed(0)}%`,
          )
          score -= 20
        }
      }

      // Check employment consistency
      if (incomeProof.fechaIngreso && appData.employmentMonths) {
        const certDate = new Date(String(incomeProof.fechaIngreso))
        const now = new Date()
        const certMonths =
          (now.getFullYear() - certDate.getFullYear()) * 12 +
          (now.getMonth() - certDate.getMonth())
        const variance = Math.abs(certMonths - appData.employmentMonths)

        if (variance > 6) {
          flags.push('EMPLOYMENT_DURATION_MISMATCH')
          details.push(
            `Tiempo de empleo declarado (${appData.employmentMonths} meses) vs certificación (${certMonths} meses)`,
          )
          score -= 15
        }
      }
    }

    // --- General Fraud Heuristics ---

    // Suspiciously round income numbers
    if (appData.monthlyIncome && appData.monthlyIncome % 1_000_000 === 0) {
      details.push(
        'Ingreso declarado es número redondo exacto — revisar consistencia',
      )
      // Not a flag, just a note — many real salaries are round
    }

    // Income vs rent ratio sanity check
    if (appData.monthlyIncome && appData.monthlyIncome > 0 && appData.propertyPrice) {
      const ratio = appData.propertyPrice / appData.monthlyIncome
      if (ratio > 0.5) {
        flags.push('RENT_EXCEEDS_50_PERCENT')
        details.push(
          `Arriendo (${appData.propertyPrice.toLocaleString('es-CO')}) es ${(ratio * 100).toFixed(0)}% del ingreso`,
        )
        score -= 10
      }
    }

    // No documents provided at all
    const docsProvided =
      (inputData.identityDocUrl ? 1 : 0) + (inputData.incomeProofUrl ? 1 : 0)
    if (docsProvided === 0) {
      details.push('No se proporcionaron documentos — score basado solo en datos del formulario')
      score -= 15
    }

    // Low OCR confidence
    if (extractedDocs.identityConfidence > 0 && extractedDocs.identityConfidence < 0.5) {
      flags.push('LOW_OCR_CONFIDENCE_IDENTITY')
      details.push('Baja confianza en lectura de documento de identidad')
      score -= 10
    }
    if (extractedDocs.incomeConfidence > 0 && extractedDocs.incomeConfidence < 0.5) {
      flags.push('LOW_OCR_CONFIDENCE_INCOME')
      details.push('Baja confianza en lectura de comprobante de ingresos')
      score -= 10
    }

    return {
      ...inputData,
      consistency: {
        consistencyScore: Math.max(0, score),
        fraudFlags: flags,
        details,
      },
    }
  },
})

// =============================================================================
// STEP 4: Calculate Score (deterministic)
// =============================================================================

const calculateScore = createStep({
  id: 'calculate-score',
  description: 'Calculates the tenant risk score using weighted algorithm',
  inputSchema: applicationDataSchema.extend({
    extractedDocs: extractedDocsSchema,
    consistency: consistencyResultSchema,
  }),
  outputSchema: applicationDataSchema.extend({
    extractedDocs: extractedDocsSchema,
    consistency: consistencyResultSchema,
    scoreResult: scoreResultSchema,
  }),
  execute: async ({ inputData, mastra }) => {
    const scoreTool = mastra?.getTool('calculate-score')

    if (!scoreTool) {
      throw new Error('calculate-score tool not found in Mastra context')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const execScore = scoreTool.execute as (input: any) => Promise<any>

    const docsProvided =
      (inputData.identityDocUrl ? 1 : 0) + (inputData.incomeProofUrl ? 1 : 0)

    const scoreResult = await execScore({
      applicationId: inputData.applicationId,
      financial: {
        monthlyIncome: inputData.monthlyIncome ?? 0,
        monthlyRent: inputData.propertyPrice,
        employmentMonths: inputData.employmentMonths ?? 0,
        contractType: (['indefinido', 'fijo', 'prestacion_servicios', 'independiente'].includes(
          inputData.contractType ?? '',
        )
          ? inputData.contractType
          : 'independiente') as 'indefinido' | 'fijo' | 'prestacion_servicios' | 'independiente',
        averageBankBalance:
          (inputData.monthlyIncome ?? 0) - (inputData.monthlyExpenses ?? 0),
      },
      rentalHistory: {
        previousRentals: inputData.previousRentals,
        paymentScore: 50, // Default — no historical data yet
        references: 0,
        evictions: 0,
      },
      documentVerification: {
        documentsProvided: docsProvided,
        documentsRequired: 2,
        consistencyScore: inputData.consistency.consistencyScore,
        fraudFlags: inputData.consistency.fraudFlags.length,
      },
      personalProfile: {
        yearsAtAddress: (inputData.currentAddressMonths ?? 0) / 12,
        dependents: 0,
        hasCoSigner: inputData.hasCosigner,
      },
    })

    return {
      ...inputData,
      scoreResult,
    }
  },
})

// =============================================================================
// STEP 5: Generate Explanation (LLM — this is where the agent shines)
// =============================================================================

const generateExplanation = createStep({
  id: 'generate-explanation',
  description:
    'Uses Claude to generate a natural language explanation of the score, drivers, and conditions',
  inputSchema: applicationDataSchema.extend({
    extractedDocs: extractedDocsSchema,
    consistency: consistencyResultSchema,
    scoreResult: scoreResultSchema,
  }),
  outputSchema: applicationDataSchema.extend({
    extractedDocs: extractedDocsSchema,
    consistency: consistencyResultSchema,
    scoreResult: scoreResultSchema,
    explanation: explanationSchema,
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('tenant-scoring')

    if (!agent) {
      // Fallback: generate basic explanation without LLM
      return {
        ...inputData,
        explanation: {
          explanation: inputData.scoreResult.recommendation,
          driversJson: inputData.scoreResult.flags.map((f) => ({
            text: f,
            impact: 'negative' as const,
            weight: 0.2,
          })),
          conditionsJson:
            inputData.scoreResult.level === 'C'
              ? [{ type: 'cosigner', text: 'Se recomienda codeudor' }]
              : [],
        },
      }
    }

    const prompt = `Genera una explicación en español para el siguiente resultado de evaluación de inquilino.
NO llames ninguna herramienta, solo responde con texto.

Datos del candidato:
- Nombre: ${inputData.applicantName}
- Ingreso mensual: $${(inputData.monthlyIncome ?? 0).toLocaleString('es-CO')} COP
- Arriendo: $${inputData.propertyPrice.toLocaleString('es-CO')} COP
- Tipo de contrato: ${inputData.contractType ?? 'No especificado'}
- Tiempo en empleo: ${inputData.employmentMonths ?? 0} meses
- Codeudor: ${inputData.hasCosigner ? 'Sí' : 'No'}

Resultado del scoring:
- Score: ${inputData.scoreResult.score}/100 (Nivel ${inputData.scoreResult.level})
- Estabilidad financiera: ${inputData.scoreResult.breakdown.financialStability}/100
- Historial de arriendo: ${inputData.scoreResult.breakdown.rentalHistory}/100
- Verificación documental: ${inputData.scoreResult.breakdown.documentVerification}/100
- Perfil personal: ${inputData.scoreResult.breakdown.personalProfile}/100
- Flags: ${inputData.scoreResult.flags.join(', ') || 'Ninguno'}

Consistencia documental:
- Score: ${inputData.consistency.consistencyScore}/100
- Alertas: ${inputData.consistency.fraudFlags.join(', ') || 'Ninguna'}
- Detalles: ${inputData.consistency.details.join('; ')}

Responde SOLO con un JSON con esta estructura:
{
  "explanation": "Párrafo de 2-3 oraciones explicando el resultado en lenguaje natural para un arrendador",
  "driversJson": [
    { "text": "Factor que influyó", "impact": "positive|negative|neutral", "weight": 0.3 }
  ],
  "conditionsJson": [
    { "type": "cosigner|deposit|guarantee", "text": "Condición recomendada" }
  ]
}`

    try {
      const result = await agent.generate(prompt, {
        maxSteps: 1, // No tool calls, just text generation
      })

      const jsonStr = result.text
        .replace(/```json?\n?/g, '')
        .replace(/```/g, '')
        .trim()
      const parsed = JSON.parse(jsonStr)

      return {
        ...inputData,
        explanation: {
          explanation: parsed.explanation ?? inputData.scoreResult.recommendation,
          driversJson: parsed.driversJson ?? [],
          conditionsJson: parsed.conditionsJson ?? [],
        },
      }
    } catch {
      // Fallback if LLM fails
      return {
        ...inputData,
        explanation: {
          explanation: inputData.scoreResult.recommendation,
          driversJson: [],
          conditionsJson: [],
        },
      }
    }
  },
})

// =============================================================================
// STEP 6: Store Result in Database
// =============================================================================

const storeResult = createStep({
  id: 'store-result',
  description: 'Saves the RiskScoreResult to the database and updates application status',
  inputSchema: applicationDataSchema.extend({
    extractedDocs: extractedDocsSchema,
    consistency: consistencyResultSchema,
    scoreResult: scoreResultSchema,
    explanation: explanationSchema,
  }),
  outputSchema: z.object({
    applicationId: z.string(),
    score: z.number(),
    level: z.enum(['A', 'B', 'C', 'D']),
    recommendation: z.string(),
    explanation: z.string(),
    escalate: z.boolean(),
    escalateReason: z.string().optional(),
    storedSuccessfully: z.boolean(),
  }),
  execute: async ({ inputData }) => {
    const { db } = await import('@/lib/db')

    const output = {
      applicationId: inputData.applicationId,
      score: inputData.scoreResult.score,
      level: inputData.scoreResult.level as 'A' | 'B' | 'C' | 'D',
      recommendation: inputData.scoreResult.recommendation,
      explanation: inputData.explanation.explanation,
      escalate: inputData.scoreResult.escalate,
      escalateReason: inputData.scoreResult.escalateReason,
      storedSuccessfully: false,
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const riskModel = (db as any).riskScoreResult
      if (!riskModel?.create) {
        console.warn('[store-result] Prisma stub mode — skipping DB write')
        return { ...output, storedSuccessfully: false }
      }

      // Upsert RiskScoreResult (handles re-scoring safely)
      const scoreData = {
        totalScore: inputData.scoreResult.score,
        level: inputData.scoreResult.level,
        recommendation: inputData.scoreResult.recommendation,
        subscoresJson: inputData.scoreResult.breakdown,
        driversJson: inputData.explanation.driversJson,
        flagsJson: inputData.scoreResult.flags.map((f: string) => ({
          type: 'warning',
          text: f,
        })),
        conditionsJson: inputData.explanation.conditionsJson,
        featuresJson: {
          consistency: inputData.consistency,
          extractedDocs: inputData.extractedDocs,
        },
      }

      await riskModel.upsert({
        where: { applicationId: inputData.applicationId },
        create: { applicationId: inputData.applicationId, ...scoreData },
        update: scoreData,
      })

      // Update application status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const appModel = (db as any).application
      if (appModel?.update) {
        const newStatus = inputData.scoreResult.escalate
          ? 'NEEDS_INFO'
          : 'UNDER_REVIEW'

        await appModel.update({
          where: { id: inputData.applicationId },
          data: { status: newStatus },
        })

        // Create audit event
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const eventModel = (db as any).applicationEvent
        if (eventModel?.create) {
          await eventModel.create({
            data: {
              applicationId: inputData.applicationId,
              type: 'score_calculated',
              toStatus: newStatus,
              actorType: 'system',
              metadata: {
                score: inputData.scoreResult.score,
                level: inputData.scoreResult.level,
                escalated: inputData.scoreResult.escalate,
              },
            },
          })
        }
      }

      return { ...output, storedSuccessfully: true }
    } catch (err) {
      console.error('[store-result] DB write failed:', err)
      return { ...output, storedSuccessfully: false }
    }
  },
})

// =============================================================================
// WORKFLOW: Tenant Scoring Pipeline
// =============================================================================

export const tenantScoringWorkflow = createWorkflow({
  id: 'tenant-scoring-pipeline',
  description:
    'Complete tenant evaluation pipeline: fetch data → OCR → consistency check → score → explain → store',
  inputSchema: z.object({
    applicationId: z.string(),
    agencyId: z.string(),
  }),
  outputSchema: z.object({
    applicationId: z.string(),
    score: z.number(),
    level: z.enum(['A', 'B', 'C', 'D']),
    recommendation: z.string(),
    explanation: z.string(),
    escalate: z.boolean(),
    escalateReason: z.string().optional(),
    storedSuccessfully: z.boolean(),
  }),
})
  .then(fetchApplicationData)
  .then(extractDocuments)
  .then(checkConsistency)
  .then(calculateScore)
  .then(generateExplanation)
  .then(storeResult)

tenantScoringWorkflow.commit()
