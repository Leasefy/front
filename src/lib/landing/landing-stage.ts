/**
 * Staging flag for the landing-react-port change.
 *
 * While `LANDING_STAGE` is `true`, every landing route spreads
 * `landingRobots()` into its `metadata.robots` so search engines never
 * index the in-progress port. The final-flip PR (SLICE 9) sets this to
 * `false`, which atomically drops noindex from every landing route in one
 * reviewable boolean change — no env var drift.
 */
export const LANDING_STAGE = true

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
