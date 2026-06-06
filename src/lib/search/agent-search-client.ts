'use client';

/**
 * agent-search-client — thin wrapper around the unified fuzzy-search endpoint.
 *
 * Endpoint: GET {NEXT_PUBLIC_AGENT_URL}/api/agency/:agencyId/search
 *   ?q=<query>&types=<debtor|bill|quote>&limit=<n>
 *
 * The endpoint uses pg_trgm + unaccent for real fuzzy search on the agent DB.
 * Its schema migration is initially PENDING, so the endpoint may return 4xx/5xx
 * until the migration is applied. This client implements a ~60 s cooldown: on
 * the first hard failure it flips `serverUnavailable` and returns null for the
 * duration of the cooldown, avoiding hammering a down endpoint on every keystroke.
 * The cooldown resets automatically so the sources auto-upgrade the moment the
 * migration lands and the endpoint starts responding.
 *
 * Returns null on any failure (network, non-2xx, abort) — callers should fall
 * back to their client-side filter path on null.
 */

import { agentAuthHeaders } from '@/lib/api/agent-auth';

// ──────────────────────────────────────────────────────────────────────────────
// Public types — endpoint response shape
// ──────────────────────────────────────────────────────────────────────────────

export type AgentSearchType = 'debtor' | 'bill' | 'quote';

export interface AgentSearchResult {
  type: AgentSearchType;
  id: string;
  title: string;
  subtitle: string | null;
  /** Small status/label strings — map to badge chips in each source */
  badges: string[];
  /**
   * MASKED reference value (cédula/NIT/invoice/hash) — for display only.
   * This is NOT a URL; construct hrefs from `id`.
   */
  ref: string | null;
  score: number;
}

export interface AgentSearchResponse {
  results: AgentSearchResult[];
  byType: Partial<Record<AgentSearchType, AgentSearchResult[]>>;
  generatedAt: string;
  q: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Cooldown state — module-level so it persists across keystroke renders
// ──────────────────────────────────────────────────────────────────────────────

const COOLDOWN_MS = 60_000; // 60 s

let _failedAt: number | null = null;

function isInCooldown(): boolean {
  if (_failedAt === null) return false;
  if (Date.now() - _failedAt < COOLDOWN_MS) return true;
  // Cooldown expired — reset so we retry the endpoint
  _failedAt = null;
  return false;
}

function recordFailure(): void {
  _failedAt = Date.now();
}

// ──────────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Calls the unified search endpoint for one `type`.
 *
 * @returns Typed results array on success, or `null` on any failure
 *          (including cooldown, abort, network error, non-2xx HTTP).
 */
export async function agentSearch(
  query: string,
  type: AgentSearchType,
  agencyId: string,
  signal: AbortSignal,
  limit = 8,
): Promise<AgentSearchResult[] | null> {
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
  if (!agentUrl) return null;

  // Skip immediately if endpoint is in cooldown
  if (isInCooldown()) return null;

  const qs = new URLSearchParams({ q: query, types: type, limit: String(limit) });
  const url = `${agentUrl}/api/agency/${agencyId}/search?${qs}`;

  try {
    const res = await globalThis.fetch(url, {
      headers: agentAuthHeaders(),
      signal,
    });

    if (!res.ok) {
      recordFailure();
      return null;
    }

    const json = (await res.json()) as AgentSearchResponse;
    // Return the per-type slice for convenience; fall back to filtering results
    return json.byType[type] ?? json.results.filter((r) => r.type === type);
  } catch (err) {
    // AbortError is expected on keystroke cancellation — do NOT penalize with cooldown
    if (err instanceof Error && err.name === 'AbortError') return null;
    // Any other error (network failure, JSON parse, etc.) → enter cooldown
    recordFailure();
    return null;
  }
}
