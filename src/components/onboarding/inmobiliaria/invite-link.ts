/**
 * Builds the shareable invite link for an onboarding `members` step
 * `rawToken` (`OnboardingSessionMembersResponse.inviteTokens[].rawToken`).
 *
 * TODO(back): CONFIRM the real accept-invite route before this ships to
 * production users. Verified during implementation (2026-07-14):
 *  - The existing front invitation flow (`/invitacion/[token]`,
 *    `src/app/invitacion/[token]/page.tsx`) is a DIFFERENT system — it reads
 *    `${NEXT_PUBLIC_BACKEND_URL}/inmobiliaria/agency/invitations/{token}`
 *    (the back's `agency_invitations` table, roles ADMIN/AGENTE/CONTADOR/
 *    VIEWER). It cannot resolve these onboarding `rawToken`s.
 *  - These `rawToken`s come from the AGENT's
 *    `onboarding_sessions.draft.members` step (SHA-256 hashed server-side —
 *    see the OpenAPI description on `POST /onboarding/session/{sessionId}/
 *    members`: "Raw tokens are returned ONCE for the SPA to deliver"). There
 *    is no documented accept endpoint for them anywhere in the agent's
 *    OpenAPI contract yet.
 *  - `/onboarding/invitacion/${rawToken}` below is a PLACEHOLDER path (no
 *    page exists at that route today — it 404s). Once back defines the real
 *    accept endpoint, build that page and update this function to match.
 */
export function buildMemberInviteLink(rawToken: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/onboarding/invitacion/${rawToken}`
}
