// ============================================================================
// GET /api/evaluation/verify/:code
// ============================================================================
// Public endpoint — verifies a tenant evaluation by its verification code.
// Returns MASKED data (no full name, no full score details) so it's safe
// to call without authentication.
//
// This mirrors the logic in /api/agents/verify/[code] but lives under the
// /evaluation namespace for client convenience.
//
// REQUEST:
//   Params: code — 8-character verification code (e.g., "AB3K7FXN")
//   No auth required — this is a public verification endpoint
//
// RESPONSE (200):
//   {
//     valid: true;
//     verification: {
//       candidateName: string;   // masked, e.g. "C***** M*******"
//       documentNumber: string;  // masked, e.g. "123****56"
//       scoreLevel: string;
//       scoredAt: string;
//       property: { title, city } | null;
//       message: { es, en };
//     };
//   }
//
// RESPONSE (404):
//   { valid: false; error: 'Verification code not found' }
//
// ERROR HANDLING:
//   400 — Bad request (invalid code format)
//   404 — Not found (no matching evaluation)
//   500 — Internal server error
// ============================================================================

import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params

  if (!code || code.length !== 8) {
    return NextResponse.json(
      { valid: false, error: 'Invalid verification code format' },
      { status: 400 },
    )
  }

  try {
    const { db } = await import('@/lib/db')

    const riskModel = (db as any).riskScoreResult

    if (!riskModel?.findMany) {
      return NextResponse.json(
        { valid: false, error: 'Verification service unavailable' },
        { status: 503 },
      )
    }

    // Search for the verification code in featuresJson
    const results = await riskModel.findMany({
      where: {
        featuresJson: {
          path: ['verificationCode'],
          equals: code.toUpperCase(),
        },
      },
      include: {
        application: {
          select: {
            documentNumber: true,
            applicant: { select: { name: true } },
            property: { select: { title: true, city: true } },
          },
        },
      },
      take: 1,
    })

    if (!results || results.length === 0) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Verification code not found',
          message: {
            es: 'Codigo de verificacion no encontrado. Verifique que el codigo sea correcto.',
            en: 'Verification code not found. Please check the code and try again.',
          },
        },
        { status: 404 },
      )
    }

    const score = results[0]
    const app = score.application
    const candidateName = app?.applicant?.name || 'N/A'

    // Mask the name: "Carlos Martinez" -> "C***** M*******"
    const maskedName = candidateName
      .split(' ')
      .map((part: string) => {
        if (part.length <= 1) return part
        return part[0] + '*'.repeat(part.length - 1)
      })
      .join(' ')

    // Mask document number: "1234567890" -> "123****90"
    const docNumber = app?.documentNumber || ''
    const maskedDoc = docNumber.length > 4
      ? docNumber.slice(0, 3) + '****' + docNumber.slice(-2)
      : '****'

    return NextResponse.json({
      valid: true,
      verification: {
        candidateName: maskedName,
        documentNumber: maskedDoc,
        scoreLevel: score.level,
        scoredAt: score.createdAt,
        property: app?.property
          ? { title: app.property.title, city: app.property.city }
          : null,
        message: {
          es: `Este reporte de evaluacion es autentico. Nivel: ${score.level}. Generado el ${new Date(score.createdAt).toLocaleDateString('es-CO')}.`,
          en: `This scoring report is authentic. Level: ${score.level}. Generated on ${new Date(score.createdAt).toLocaleDateString('en-US')}.`,
        },
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (process.env.NODE_ENV === 'development') {
      console.error('[evaluation/verify] Error:', msg)
    }
    return NextResponse.json(
      { valid: false, error: 'Verification service error' },
      { status: 500 },
    )
  }
}
