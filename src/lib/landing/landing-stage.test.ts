/**
 * landing-stage.test.ts — SEO guard for the landing-react-port staging
 * flag. `landingRobots()` returned a noindex directive while
 * `LANDING_STAGE` was true; F1 (final integration slice) flips it to
 * `false`, which atomically makes every landing route indexable — every
 * landing route spreads `landingRobots()` into `metadata.robots` so the
 * flip is a single boolean, not env drift.
 */
import { describe, it, expect } from 'vitest'
import { LANDING_STAGE, landingRobots } from './landing-stage'

describe('landingRobots', () => {
  it('LANDING_STAGE is false post-flip (F1)', () => {
    expect(LANDING_STAGE).toBe(false)
  })

  it('returns an index, follow directive post-flip', () => {
    expect(landingRobots()).toEqual({ index: true, follow: true })
  })
})
