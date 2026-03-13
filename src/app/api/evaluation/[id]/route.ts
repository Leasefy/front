// ============================================================================
// GET /api/evaluation/:id
// ============================================================================
// Returns a specific evaluation for the authenticated tenant.
//
// REQUEST:
//   Headers: Authorization: Bearer <token>
//   Params: id — the evaluation UUID
//
// RESPONSE (200):
//   {
//     id: string;
//     tenantId: string;
//     status: 'pending' | 'paid' | 'expired';
//     score: RiskScore | null;
//     verificationCode: string | null;
//     paidAt: string | null;
//     expiresAt: string | null;
//     createdAt: string;
//   }
//
// IMPLEMENTATION STEPS:
//
// 1. Authenticate the request — verify JWT token, extract tenantId
//
// 2. Fetch evaluation from database by id
//    SELECT * FROM evaluations WHERE id = :id
//
// 3. Authorization check — ensure evaluation.tenant_id matches authenticated user
//    - If not, return 403 Forbidden
//
// 4. Check expiration — if expires_at < NOW() and status is 'paid',
//    update status to 'expired' and return updated record
//
// 5. Return evaluation data
//
// ERROR HANDLING:
//   401 — Unauthorized
//   403 — Forbidden (evaluation belongs to another tenant)
//   404 — Not found
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
