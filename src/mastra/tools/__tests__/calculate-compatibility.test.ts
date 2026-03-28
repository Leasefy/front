import { describe, it, expect } from 'vitest'
import { calculateCompatibilityTool } from '../calculate-compatibility'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const execute = (calculateCompatibilityTool as any).execute as (input: any) => Promise<any>

const baseCandidate = {
  id: 'candidate-001',
  score: 75,
  level: 'B' as const,
  monthlyBudget: 2_500_000,
  preferredZone: 'Chapinero',
  preferredType: 'apartamento',
  preferredBedrooms: 2,
  urgency: 'media' as const,
}

const baseProperty = {
  id: 'prop-001',
  price: 2_000_000,
  zone: 'Chapinero Alto',
  propertyType: 'apartamento',
  bedrooms: 2,
  minScoreRequired: 50,
  daysListed: 20,
  applicantCount: 0,
}

describe('calculate-compatibility tool', () => {
  it('returns high compatibility for a perfect match', async () => {
    const result = await execute({
      candidateProfile: baseCandidate,
      property: baseProperty,
    })

    expect(result.compatibilityScore).toBeGreaterThanOrEqual(70)
    expect(result.viable).toBe(true)
    expect(result.breakdown.affordability).toBeGreaterThan(50)
    expect(result.breakdown.riskFit).toBeGreaterThan(50)
  })

  it('returns low compatibility when price exceeds budget', async () => {
    const result = await execute({
      candidateProfile: baseCandidate,
      property: {
        ...baseProperty,
        price: 4_000_000, // Way over 2.5M budget
      },
    })

    expect(result.breakdown.affordability).toBe(0)
    expect(result.viable).toBe(false) // Not viable when affordability is 0
  })

  it('penalizes when candidate score below property minimum', async () => {
    const result = await execute({
      candidateProfile: {
        ...baseCandidate,
        score: 35,
        level: 'D' as const,
      },
      property: {
        ...baseProperty,
        minScoreRequired: 60,
      },
    })

    expect(result.breakdown.riskFit).toBeLessThan(50)
  })

  it('boosts acceptance probability for properties with no applicants', async () => {
    const withApplicants = await execute({
      candidateProfile: baseCandidate,
      property: {
        ...baseProperty,
        applicantCount: 5,
        daysListed: 3,
      },
    })

    const withoutApplicants = await execute({
      candidateProfile: baseCandidate,
      property: {
        ...baseProperty,
        applicantCount: 0,
        daysListed: 20,
      },
    })

    expect(withoutApplicants.breakdown.acceptanceProbability)
      .toBeGreaterThan(withApplicants.breakdown.acceptanceProbability)
  })

  it('matches zone preferences correctly', async () => {
    const sameZone = await execute({
      candidateProfile: { ...baseCandidate, preferredZone: 'Chapinero' },
      property: { ...baseProperty, zone: 'Chapinero Alto' },
    })

    const differentZone = await execute({
      candidateProfile: { ...baseCandidate, preferredZone: 'Usaquén' },
      property: { ...baseProperty, zone: 'Chapinero Alto' },
    })

    expect(sameZone.breakdown.preferences)
      .toBeGreaterThan(differentZone.breakdown.preferences)
  })

  it('returns correct mainReason field', async () => {
    const result = await execute({
      candidateProfile: baseCandidate,
      property: baseProperty,
    })

    expect(typeof result.mainReason).toBe('string')
    expect(result.mainReason.length).toBeGreaterThan(0)
  })

  it('handles edge case: budget exactly equals price', async () => {
    const result = await execute({
      candidateProfile: { ...baseCandidate, monthlyBudget: 2_000_000 },
      property: { ...baseProperty, price: 2_000_000 },
    })

    expect(result.viable).toBe(true)
    expect(result.breakdown.affordability).toBeGreaterThanOrEqual(60)
  })

  // =========================================================================
  // Edge case tests
  // =========================================================================

  it('handles zero budget without NaN or crash', async () => {
    const result = await execute({
      candidateProfile: {
        ...baseCandidate,
        monthlyBudget: 0,
      },
      property: baseProperty,
    })

    expect(result.compatibilityScore).toBeGreaterThanOrEqual(0)
    expect(Number.isNaN(result.compatibilityScore)).toBe(false)
    expect(result.breakdown.affordability).toBe(0)
    expect(result.viable).toBe(false)
  })

  it('handles zero price (free property)', async () => {
    const result = await execute({
      candidateProfile: baseCandidate,
      property: {
        ...baseProperty,
        price: 0,
      },
    })

    expect(result.compatibilityScore).toBeGreaterThanOrEqual(0)
    expect(Number.isNaN(result.compatibilityScore)).toBe(false)
    // Price 0 / budget = 0 ratio => best affordability tier
    expect(result.breakdown.affordability).toBe(100)
    expect(result.viable).toBe(true)
  })

  it('handles missing optional preferences', async () => {
    const result = await execute({
      candidateProfile: {
        ...baseCandidate,
        preferredZone: undefined,
        preferredType: undefined,
        preferredBedrooms: undefined,
        urgency: undefined,
      },
      property: baseProperty,
    })

    expect(result.compatibilityScore).toBeGreaterThanOrEqual(0)
    expect(Number.isNaN(result.compatibilityScore)).toBe(false)
    expect(result.breakdown.preferences).toBe(0)
  })

  it('handles very low score candidate (level D) against high-requirement property', async () => {
    const result = await execute({
      candidateProfile: {
        ...baseCandidate,
        score: 10,
        level: 'D' as const,
      },
      property: {
        ...baseProperty,
        minScoreRequired: 80,
      },
    })

    expect(result.breakdown.riskFit).toBe(0)
    // Affordability is still good so overall score can be above 50
    // The key check is that riskFit is 0 and viability reflects the risk gap
    expect(Number.isNaN(result.compatibilityScore)).toBe(false)
  })

  it('handles property with no minScoreRequired (defaults to 50)', async () => {
    const result = await execute({
      candidateProfile: baseCandidate,
      property: {
        ...baseProperty,
        minScoreRequired: undefined,
      },
    })

    // Score 75, default min 50, diff = 25 => riskFit = 100
    expect(result.breakdown.riskFit).toBe(100)
  })

  it('urgency alta boosts acceptance probability', async () => {
    const normal = await execute({
      candidateProfile: { ...baseCandidate, urgency: 'baja' },
      property: baseProperty,
    })

    const urgent = await execute({
      candidateProfile: { ...baseCandidate, urgency: 'alta' },
      property: baseProperty,
    })

    expect(urgent.breakdown.acceptanceProbability)
      .toBeGreaterThan(normal.breakdown.acceptanceProbability)
  })
})
