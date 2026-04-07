import { NextResponse } from 'next/server'
import { validateAgentRequest, unauthorizedResponse } from '../../_middleware'

/**
 * GET /api/agents/scoring-report/[applicationId]
 *
 * Returns a structured JSON report of the scoring result for an application.
 * Includes a verification code and QR URL for public verification.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const auth = validateAgentRequest(req)
  if (!auth.valid) return unauthorizedResponse(auth.error!)

  const { applicationId } = await params

  if (!applicationId) {
    return NextResponse.json({ error: 'Missing applicationId' }, { status: 400 })
  }

  try {
    const { db } = await import('@/lib/db')

    const riskModel = (db as any).riskScoreResult
    const appModel = (db as any).application

    if (!riskModel?.findUnique || !appModel?.findUnique) {
      return NextResponse.json({ error: 'Database models not available' }, { status: 503 })
    }

    // Fetch the application with related data
    const application = await appModel.findUnique({
      where: { id: applicationId },
      include: {
        applicant: { select: { name: true, email: true, phone: true } },
        property: {
          select: {
            title: true,
            address: true,
            city: true,
            neighborhood: true,
            priceMonthly: true,
            bedrooms: true,
            bathrooms: true,
            area: true,
          },
        },
        riskScore: true,
      },
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (!application.riskScore) {
      return NextResponse.json(
        { error: 'No scoring result found for this application' },
        { status: 404 },
      )
    }

    const score = application.riskScore

    // Generate or retrieve verification code
    let verificationCode: string
    const existingMeta = (score.featuresJson as Record<string, unknown>) || {}

    if (existingMeta.verificationCode && typeof existingMeta.verificationCode === 'string') {
      verificationCode = existingMeta.verificationCode
    } else {
      verificationCode = generateVerificationCode()

      // Store the verification code in featuresJson (reusing the optional JSON field)
      await riskModel.update({
        where: { id: score.id },
        data: {
          featuresJson: {
            ...existingMeta,
            verificationCode,
            verificationGeneratedAt: new Date().toISOString(),
          },
        },
      })
    }

    const verifyUrl = `https://leasefy.co/verificar/${verificationCode}`
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}`

    // Parse JSON fields safely
    const subscores = parseJson(score.subscoresJson)
    const drivers = parseJson(score.driversJson)
    const flags = parseJson(score.flagsJson)
    const conditions = parseJson(score.conditionsJson)

    const report = {
      // Report metadata
      reportId: score.id,
      generatedAt: new Date().toISOString(),
      verificationCode,
      verifyUrl,
      qrApiUrl,

      // Candidate info (partially masked for security)
      candidate: {
        name: application.applicant?.name || 'N/A',
        documentType: application.documentType || 'CC',
        documentNumber: application.documentNumber
          ? maskDocument(application.documentNumber)
          : 'N/A',
        documentNumberFull: application.documentNumber || 'N/A',
      },

      // Property info
      property: {
        title: application.property?.title || 'N/A',
        address: application.property?.address || 'N/A',
        city: application.property?.city || 'N/A',
        neighborhood: application.property?.neighborhood || 'N/A',
        priceMonthly: application.property?.priceMonthly || 0,
        bedrooms: application.property?.bedrooms || 0,
        bathrooms: application.property?.bathrooms || 0,
        area: application.property?.area || 0,
      },

      // Score results
      scoring: {
        totalScore: score.totalScore,
        level: score.level,
        recommendation: score.recommendation,
        subscores,
        drivers,
        flags,
        conditions,
      },

      // Level description for the report
      levelDescription: getLevelDescription(score.level),

      // Application metadata
      applicationId: application.id,
      applicationStatus: application.status,
      scoredAt: score.createdAt,
    }

    return NextResponse.json(report)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (process.env.NODE_ENV === 'development') {
      console.error('[scoring-report] Error:', msg)
    }
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}

// =============================================================================
// Helpers
// =============================================================================

/** Generates an 8-character alphanumeric code using unambiguous characters */
function generateVerificationCode(): string {
  // Exclude ambiguous: 0, O, 1, I, L
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let code = ''
  const array = new Uint8Array(8)
  crypto.getRandomValues(array)
  for (let i = 0; i < 8; i++) {
    code += chars[array[i] % chars.length]
  }
  return code
}

/** Masks a document number: "1030567890" -> "103****890" */
function maskDocument(doc: string): string {
  if (doc.length <= 4) return '****'
  const visible = Math.min(3, Math.floor(doc.length / 3))
  return doc.slice(0, visible) + '****' + doc.slice(-visible)
}

function parseJson(value: unknown): unknown {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch { return null }
  }
  return value
}

function getLevelDescription(level: string): { es: string; en: string } {
  switch (level) {
    case 'A':
      return {
        es: 'Excelente (80-100) — Se recomienda aprobacion automatica',
        en: 'Excellent (80-100) — Auto-approve recommended',
      }
    case 'B':
      return {
        es: 'Bueno (60-79) — Aprobar con terminos estandar',
        en: 'Good (60-79) — Approve with standard terms',
      }
    case 'C':
      return {
        es: 'Regular (40-59) — Aprobar con condiciones',
        en: 'Fair (40-59) — Approve with conditions',
      }
    case 'D':
      return {
        es: 'Riesgo alto (0-39) — Rechazar o requerir garantias fuertes',
        en: 'High risk (0-39) — Decline or require strong conditions',
      }
    default:
      return { es: 'Desconocido', en: 'Unknown' }
  }
}
