import type { Agency, AgencyMemberRole } from './types'
import { apiClient, ApiError } from '@/lib/api/client'

export interface AgencyFetchResult {
  agency: Agency | null
  role: AgencyMemberRole | null
}

/** Backend response shape for GET /inmobiliaria/agency: agency fields spread
 *  together with `memberRole` and `memberStatus` (see back's
 *  agency.service.ts `getAgencyForUser`). `memberRole` is optional here so a
 *  legacy/partial payload degrades gracefully instead of throwing. */
type AgencyApiResponse = Agency & {
  memberRole?: AgencyMemberRole
  memberStatus?: string
  [key: string]: unknown
}

/**
 * Parse the raw `/inmobiliaria/agency` response into `{ agency, role }`.
 * Tolerant of legacy/partial shapes: only requires a non-empty string `id`.
 * A missing `memberRole` degrades to `role: null` instead of throwing —
 * previously any shape drift here was swallowed by the caller's blanket
 * try/catch with zero visibility into what went wrong.
 */
export function parseAgencyResponse(data: unknown): AgencyFetchResult {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { agency: null, role: null }
  }
  const raw = data as AgencyApiResponse
  if (typeof raw.id !== 'string' || !raw.id) {
    return { agency: null, role: null }
  }
  const { memberRole, memberStatus, ...agencyFields } = raw
  void memberStatus
  return { agency: agencyFields as Agency, role: memberRole ?? null }
}

/** Human-readable reason for a failed `/inmobiliaria/agency` fetch — used so
 *  failures are logged with an actual diagnosable signal instead of vanishing
 *  into a silent `{ agency: null, role: null }`. */
export function describeAgencyFetchFailure(err: unknown): string {
  if (err instanceof ApiError) return `${err.status} ${err.message}`
  if (err instanceof Error) return err.message
  return String(err)
}

/**
 * Fetch the current user's agency membership. Never throws: on any failure
 * (no membership yet, network error, malformed response) it resolves to
 * `{ agency: null, role: null }` — same contract as before — but now logs
 * the reason via `console.warn` so a "healthy account has no agency" report
 * has something to go on instead of total silence.
 */
export async function fetchAgencyProfile(token?: string): Promise<AgencyFetchResult> {
  try {
    const data = await apiClient.get<AgencyApiResponse>('/inmobiliaria/agency', token)
    return parseAgencyResponse(data)
  } catch (err) {
    console.warn(
      `[Auth] fetchAgency failed — falling back to no agency: ${describeAgencyFetchFailure(err)}`,
    )
    return { agency: null, role: null }
  }
}
