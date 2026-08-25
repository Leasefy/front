/**
 * report-redirect.ts — target URL for the retired `front` report route.
 *
 * `/avaluo/reporte/[slug]` used to render the avalúo report in this app. The
 * report landing now lives on the avalúo micro (`avaluos.leasefy.co`, see
 * `.orchestration/tasks/T-0003-avaluo-review-gated-landing/contract.md`); this
 * app's route is now a redirect-only shell so links already sent in delivery
 * e-mails (`?token=<capability>`) keep working instead of 404ing.
 *
 * Same env var and same degrade-explicitly posture as `wizard-url.ts`
 * (`AVALUO_WIZARD_ORIGIN`): empty when `NEXT_PUBLIC_AVALUO_API_URL` is unset,
 * so a caller never builds a redirect Location from `undefined`/`"undefined"`.
 *
 * `null` here specifically means "the micro base is unknown, do not attempt a
 * same-origin fallback": unlike `/avaluo/verificar/[slug]`, whose target path
 * differs from its own, an empty base would make this route redirect to
 * itself (`/avaluo/reporte/<slug>` → `/avaluo/reporte/<slug>`), an infinite
 * loop rather than a degrade. Callers must treat `null` as "cannot serve this
 * link" (e.g. `notFound()`), never fall back to a relative path.
 */

import { AVALUO_WIZARD_ORIGIN } from './wizard-url'

/**
 * Builds the absolute redirect target on the avalúo micro for a given report
 * slug, preserving the capability token exactly as received.
 *
 * Returns `null` when the micro's origin is unset — the caller must not
 * redirect in that case.
 */
export function avaluoReportRedirectTarget(
  slug: string,
  token: string | null | undefined,
): string | null {
  if (!AVALUO_WIZARD_ORIGIN) return null

  const path = `${AVALUO_WIZARD_ORIGIN}/avaluo/reporte/${encodeURIComponent(slug)}`
  return token ? `${path}?token=${encodeURIComponent(token)}` : path
}
