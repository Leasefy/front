import type { Agency, AgencyMemberRole } from './types'
import { apiClient, ApiError } from '@/lib/api/client'
import type { BootstrapAgency } from '@/lib/api/bootstrap.service'

/** Parsed shape of a 200 OK `/inmobiliaria/agency` response. */
export interface ParsedAgency {
  agency: Agency | null
  role: AgencyMemberRole | null
  /** Membership status within the agency ('ACTIVE' | 'INVITED' | …) or null.
   *  Agency-panel access is granted ONLY when this is 'ACTIVE' — an INVITED
   *  (not-yet-accepted) member has no access until they accept. */
  memberStatus: string | null
}

export interface AgencyFetchResult extends ParsedAgency {
  /** Backend CONFIRMED there is no membership (403/404/410). Callers may safely
   *  DOWNGRADE cached agency state — a revoked member loses access next probe. */
  confirmedNoMembership: boolean
  /** TRANSIENT failure (5xx / network / client-side timeout). Callers must KEEP
   *  the last known state (don't flap) and may retry via the self-heal backstop. */
  transientFailure: boolean
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
export function parseAgencyResponse(data: unknown): ParsedAgency {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { agency: null, role: null, memberStatus: null }
  }
  const raw = data as AgencyApiResponse
  if (typeof raw.id !== 'string' || !raw.id) {
    return { agency: null, role: null, memberStatus: null }
  }
  const { memberRole, memberStatus, ...agencyFields } = raw
  return {
    agency: agencyFields as Agency,
    role: memberRole ?? null,
    memberStatus: typeof memberStatus === 'string' ? memberStatus : null,
  }
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
    // A parsed 200 is neither a confirmed-no-membership nor a transient failure.
    return { ...parseAgencyResponse(data), confirmedNoMembership: false, transientFailure: false }
  } catch (err) {
    // 404/403/410 = CONFIRMED no membership — the expected, non-error result now
    // that EVERY authenticated user probes membership (personal-role coexistence),
    // and the safe signal to downgrade a revoked member. 5xx/network = TRANSIENT
    // (keep last state, retry). Only unexpected failures warrant a warning.
    const expectedNoMembership =
      err instanceof ApiError && [403, 404, 410].includes(err.status)
    if (!expectedNoMembership) {
      console.warn(
        `[Auth] fetchAgency failed — falling back to no agency: ${describeAgencyFetchFailure(err)}`,
      )
    }
    return {
      agency: null,
      role: null,
      memberStatus: null,
      confirmedNoMembership: expectedNoMembership,
      transientFailure: !expectedNoMembership,
    }
  }
}

/**
 * Build an `AgencyFetchResult` from the login bootstrap's embedded `agency`
 * field instead of a live `GET /inmobiliaria/agency` call (T-0082 WU-2b,
 * contract.md §3.2). Mirrors `fetchAgencyProfile`'s three outcomes exactly —
 * this is what lets `auth-context.tsx` feed the bootstrap's agency data
 * through the SAME `applyAgencyFetchResult` write path used by the standalone
 * probe, self-heal retry and `refreshAgency()`, with no special-casing there:
 *
 *   - `agency` present                                  → success, same shape a live fetch would produce
 *   - `agency: null`, `errors` has NO `agency_unavailable` → CONFIRMED no membership (resolved, no re-probe)
 *   - `agency: null`, `errors` HAS `agency_unavailable`    → TRANSIENT (arms the standalone self-heal retry)
 */
export function agencyResultFromBootstrap(
  agency: BootstrapAgency | null,
  errors: string[],
): AgencyFetchResult {
  if (agency) {
    const { memberRole, memberStatus, permissions, ...agencyFields } = agency
    void permissions // consumed by PermissionsContext's seed, not here
    return {
      agency: agencyFields as Agency,
      role: memberRole,
      memberStatus,
      confirmedNoMembership: false,
      transientFailure: false,
    }
  }
  const transientFailure = errors.includes('agency_unavailable')
  return {
    agency: null,
    role: null,
    memberStatus: null,
    confirmedNoMembership: !transientFailure,
    transientFailure,
  }
}
