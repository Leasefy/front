/**
 * landing-stage.test.ts — SEO guard for the landing-react-port staging
 * flag. `landingRobots()` must return a noindex directive while
 * `LANDING_STAGE` is true; every landing route spreads it into
 * `metadata.robots` so the flip is a single boolean, not env drift.
 */
import { describe, it, expect } from 'vitest'
import { LANDING_STAGE, landingRobots } from './landing-stage'

describe('landingRobots', () => {
  it('LANDING_STAGE is true during staging', () => {
    expect(LANDING_STAGE).toBe(true)
  })

  it('returns a noindex, nofollow directive while staging', () => {
    expect(landingRobots()).toEqual({ index: false, follow: false })
  })
})
