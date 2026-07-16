/**
 * Staging flag for the landing-react-port change.
 *
 * While `LANDING_STAGE` was `true`, every landing route spread
 * `landingRobots()` into its `metadata.robots` so search engines never
 * indexed the in-progress port. F1 (final integration slice) flips this to
 * `false`, which atomically drops noindex from every landing route in one
 * reviewable boolean change — no env var drift. The `/landing-preview`
 * staging route this flag also gated has been deleted (`/` is now the real,
 * shipped v2 home).
 */
export const LANDING_STAGE = false

interface LandingRobots {
  index: boolean
  follow: boolean
}

export function landingRobots(): LandingRobots {
  if (!LANDING_STAGE) {
    return { index: true, follow: true }
  }
  return { index: false, follow: false }
}
