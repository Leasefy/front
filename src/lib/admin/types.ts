/**
 * Base contract types shared across admin screens. Per-screen shapes live next
 * to their screen; see BACK.md for the exact SQL behind each endpoint.
 */

/** Envelope for paginated screens (FRONT.md §4). `page` is 0-indexed. */
export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export function lastPage(total: number, pageSize: number): number {
  if (pageSize <= 0) return 0
  return Math.max(0, Math.ceil(total / pageSize) - 1)
}

/** `GET /me` — identity + allowlist gate. 403 → not on ADMIN_EMAILS. */
export interface Me {
  email: string
}

/** Reusable pill tone across screens (FRONT.md §5.2). */
export type PillTone = 'ok' | 'neutral' | 'warn' | 'bad' | 'muted' | 'info'
