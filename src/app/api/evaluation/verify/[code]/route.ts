// ============================================================================
// GET /api/evaluation/verify/:code
// ============================================================================
// Public endpoint — verifies a tenant evaluation by its verification code.
// Returns MASKED data (no full name, no full score details) so it's safe
// to call without authentication.
//
// REQUEST:
//   Params: code — 8-character verification code (e.g., "AB3K7FXN")
//   No auth required — this is a public verification endpoint
//
// RESPONSE (200):
//   {
//     verified: true;
//     tenant: {
//       maskedName: string;    // e.g., "Nic*** Gar***"
//     };
//     evaluation: {
//       level: RiskLevel;       // 'A' | 'B' | 'C' | 'D'
//       numericScore: number;
//       label: string;          // 'Excelente' | 'Bueno' | etc.
//       evaluatedAt: string;
//       expiresAt: string;
//     };
//   }
//
// RESPONSE (404):
//   {
//     verified: false;
//     error: 'Verification code not found or evaluation expired.'
//   }
//
// IMPLEMENTATION STEPS:
//
// 1. Validate code format — must be 8 chars, alphanumeric
//    - If invalid, return 400 Bad Request
//
// 2. Look up evaluation by verification_code
//    SELECT e.*, t.first_name, t.last_name
//    FROM evaluations e
//    JOIN tenants t ON e.tenant_id = t.id
//    WHERE e.verification_code = :code
//      AND e.status = 'paid'
//      AND e.expires_at > NOW()
//
// 3. If not found, return 404 with verified: false
//
// 4. Mask tenant name:
//    - "Nicolas" → "Nic***"
//    - "Garcia" → "Gar***"
//    - Keep first 3 chars, replace rest with ***
//
// 5. Return masked response (do NOT return full score categories,
//    drivers, flags, or AI explanation — only level + numeric score)
//
// RATE LIMITING:
//   - Max 10 requests per IP per minute
//   - Consider adding CAPTCHA for web clients
//   - Log verification attempts for abuse detection
//
// ERROR HANDLING:
//   400 — Bad request (invalid code format)
//   404 — Not found (no matching active evaluation)
//   429 — Too many requests (rate limit exceeded)
//   500 — Internal server error
// ============================================================================

import { NextResponse } from 'next/server';

export async function GET() {
  // Stub: return 501 Not Implemented
  return NextResponse.json(
    { error: 'Not implemented. See comments in this file for implementation guide.' },
    { status: 501 }
  );
}
